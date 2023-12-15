use std::cell::Ref;

use anchor_lang::prelude::*;
use dex::state::market_product_group::MarketProductGroup;
use dex::state::products::Product;
use dex::state::trader_risk_group::TraderRiskGroup;
use dex::utils::numeric::{Fractional, ZERO_FRAC};
use dex::ID as DexID;
use instruments::state::derivative_metadata::DerivativeMetadata;
use instruments::state::enums::{InstrumentType as HxroInstrumentType, OracleType};
use rfq::state::{AuthoritySide, BaseAssetInfo, Leg, Response, Rfq};
use risk_engine::state::{InstrumentType, OptionType};

use crate::constants::EXPECTED_DECIMALS;
use crate::errors::HxroPrintTradeProviderError;
use crate::helpers::common::{get_leg_instrument_type, parse_leg_data, ParsedRiskEngineData};
use crate::state::ParsedLegData;

use super::common::{parse_maker_trg, parse_taker_trg};

pub fn validate_taker_trg(
    rfq: &Rfq,
    expected_mpg: Pubkey,
    trg: &AccountLoader<TraderRiskGroup>,
) -> Result<()> {
    let trg_key = parse_taker_trg(rfq)?;
    validate_trg(trg_key, rfq.taker, expected_mpg, trg)
}

pub fn validate_maker_trg(
    response: &Response,
    expected_mpg: Pubkey,
    trg: &AccountLoader<TraderRiskGroup>,
) -> Result<()> {
    let trg_key = parse_maker_trg(response)?;
    validate_trg(trg_key, response.maker, expected_mpg, trg)
}

fn validate_trg(
    expected_trg: Pubkey,
    expected_creator: Pubkey,
    expected_mpg: Pubkey,
    trg: &AccountLoader<TraderRiskGroup>,
) -> Result<()> {
    require_keys_eq!(
        expected_trg,
        trg.key(),
        HxroPrintTradeProviderError::InvalidTRGAddress
    );

    let trg = trg.load()?;

    require_keys_eq!(
        expected_mpg,
        trg.market_product_group,
        HxroPrintTradeProviderError::InvalidTRGMarket
    );

    require_keys_eq!(
        expected_creator,
        trg.owner,
        HxroPrintTradeProviderError::InvalidTRGOwner
    );

    Ok(())
}

pub fn validate_leg_data(
    rfq: &Rfq,
    leg_index: usize,
    mpg: &MarketProductGroup,
    remaining_accounts: &mut &[AccountInfo],
) -> Result<()> {
    let leg = &rfq.legs[leg_index];
    require_eq!(
        leg.amount_decimals,
        EXPECTED_DECIMALS,
        HxroPrintTradeProviderError::InvalidDecimals
    );

    let instrument_type: InstrumentType = get_leg_instrument_type(leg)?;
    let (risk_engine_data, ParsedLegData { product_index }) = parse_leg_data(leg, instrument_type)?;

    let product_loader =
        extract_and_verify_hxro_product_account(mpg, product_index, remaining_accounts)?;
    let product: Ref<DerivativeMetadata> = product_loader.load()?;

    let base_asset_pyth_oracle = extract_base_asset_account_pyth_oracle(leg, remaining_accounts)?;
    require!(
        matches!(product.oracle_type, OracleType::Pyth),
        HxroPrintTradeProviderError::InvalidHxroOracleType
    );
    require_keys_eq!(
        product.price_oracle,
        base_asset_pyth_oracle,
        HxroPrintTradeProviderError::OracleDoesNotMatchWithBaseAsset
    );

    if matches!(
        product.instrument_type,
        HxroInstrumentType::ExpiringCall | HxroInstrumentType::ExpiringPut
    ) {
        require!(
            rfq.get_settle_window_end() < product.initialization_time + product.full_funding_period,
            HxroPrintTradeProviderError::ProductExpiresToEarly
        );
    }

    match instrument_type {
        InstrumentType::Option => validate_product_as_option(product, risk_engine_data),
        InstrumentType::TermFuture => validate_product_as_term_future(product, risk_engine_data),
        InstrumentType::PerpFuture => validate_product_as_perp_future(product, risk_engine_data),
        _ => unreachable!(),
    }?;

    Ok(())
}

fn extract_next_account<'a, 'b>(
    remaining_accounts: &mut &'a [AccountInfo<'b>],
) -> Result<&'a AccountInfo<'b>> {
    require!(
        !remaining_accounts.is_empty(),
        HxroPrintTradeProviderError::NotEnoughAccounts
    );
    let account = &remaining_accounts[0];
    *remaining_accounts = &remaining_accounts[1..];

    Ok(account)
}

fn extract_and_verify_hxro_product_account<'a>(
    mpg: &MarketProductGroup,
    product_index: u8,
    remaining_accounts: &mut &[AccountInfo<'a>],
) -> Result<AccountLoader<'a, DerivativeMetadata>> {
    let product = mpg.market_products.array[product_index as usize];
    let outright = match product {
        Product::Outright { outright } => outright,
        Product::Combo { combo: _ } => err!(HxroPrintTradeProviderError::CombosAreNotSupported)?,
    };

    let product_account = extract_next_account(remaining_accounts)?;
    require_keys_eq!(
        outright.product_key,
        product_account.key(),
        HxroPrintTradeProviderError::ProductAccountDoesNotMatch
    );
    AccountLoader::try_from(product_account)
}

fn extract_base_asset_account_pyth_oracle(
    leg: &Leg,
    remaining_accounts: &mut &[AccountInfo],
) -> Result<Pubkey> {
    let base_asset_account = extract_next_account(remaining_accounts)?;
    let base_asset: Account<BaseAssetInfo> = Account::try_from(base_asset_account)?;
    require!(
        leg.base_asset_index == base_asset.index,
        HxroPrintTradeProviderError::InvalidBaseAssetAccountIndex
    );

    require!(
        base_asset.enabled,
        HxroPrintTradeProviderError::DisabledBaseAsset
    );

    base_asset
        .get_pyth_oracle()
        .ok_or_else(|| error!(HxroPrintTradeProviderError::NoPythOracleForBaseAsset))
}

fn validate_product_as_option(
    product: Ref<DerivativeMetadata>,
    risk_engine_data: ParsedRiskEngineData,
) -> Result<()> {
    require!(
        matches!(
            product.instrument_type,
            HxroInstrumentType::ExpiringCall | HxroInstrumentType::ExpiringPut
        ) && product.strike > ZERO_FRAC,
        HxroPrintTradeProviderError::InstrumentTypeDoesNotMatch
    );

    validate_underlying_amount_per_contract(&risk_engine_data)?;

    let option_data = match risk_engine_data {
        ParsedRiskEngineData::ForOption(option_data) => option_data,
        _ => unreachable!(),
    };

    let expected_instrument_type = match option_data.option_type {
        OptionType::Call => HxroInstrumentType::ExpiringCall,
        OptionType::Put => HxroInstrumentType::ExpiringPut,
    };
    require!(
        product.instrument_type == expected_instrument_type,
        HxroPrintTradeProviderError::RiskEngineDataMismatch
    );

    let strike_price = Fractional::new(
        i64::try_from(option_data.strike_price).unwrap(),
        option_data.strike_price_decimals as u64,
    );
    require_eq!(
        strike_price,
        product.strike,
        HxroPrintTradeProviderError::RiskEngineDataMismatch
    );

    require_eq!(
        option_data.expiration_timestamp,
        product.initialization_time + product.full_funding_period,
        HxroPrintTradeProviderError::RiskEngineDataMismatch
    );

    Ok(())
}

fn validate_product_as_term_future(
    product: Ref<DerivativeMetadata>,
    risk_engine_data: ParsedRiskEngineData,
) -> Result<()> {
    // TODO hadle put futures
    require!(
        product.instrument_type == HxroInstrumentType::ExpiringCall && product.strike == ZERO_FRAC,
        HxroPrintTradeProviderError::InstrumentTypeDoesNotMatch
    );

    validate_underlying_amount_per_contract(&risk_engine_data)?;

    Ok(())
}

fn validate_product_as_perp_future(
    product: Ref<DerivativeMetadata>,
    risk_engine_data: ParsedRiskEngineData,
) -> Result<()> {
    // TODO hadle put futures
    require!(
        product.instrument_type == HxroInstrumentType::RecurringCall,
        HxroPrintTradeProviderError::InstrumentTypeDoesNotMatch
    );

    validate_underlying_amount_per_contract(&risk_engine_data)?;

    Ok(())
}

fn validate_underlying_amount_per_contract(risk_engine_data: &ParsedRiskEngineData) -> Result<()> {
    let (underlying_amount, underlying_amount_decimals) = match risk_engine_data {
        ParsedRiskEngineData::ForOption(data) => (
            data.underlying_amount_per_contract,
            data.underlying_amount_per_contract_decimals,
        ),
        ParsedRiskEngineData::ForFuture(data) => (
            data.underlying_amount_per_contract,
            data.underlying_amount_per_contract_decimals,
        ),
    };

    let underlying_amount_per_contract = Fractional::new(
        i64::try_from(underlying_amount).unwrap(),
        underlying_amount_decimals as u64,
    );
    require_eq!(
        underlying_amount_per_contract,
        Fractional::new(1, 0),
        HxroPrintTradeProviderError::RiskEngineDataMismatch
    );

    Ok(())
}

pub struct ValidationInput<'a, 'info: 'a> {
    pub first_to_prepare: AuthoritySide,

    pub rfq: &'a Account<'info, Rfq>,
    pub response: &'a Account<'info, Response>,

    pub operator: &'a UncheckedAccount<'info>,
    pub taker_trg: &'a AccountLoader<'info, TraderRiskGroup>,
    pub maker_trg: &'a AccountLoader<'info, TraderRiskGroup>,
    pub operator_trg: &'a AccountLoader<'info, TraderRiskGroup>,
    pub print_trade_key: Pubkey,
}

pub fn validate_print_trade_accounts(input: ValidationInput) -> Result<()> {
    let ValidationInput {
        first_to_prepare,
        rfq,
        response,
        operator,
        taker_trg,
        maker_trg,
        operator_trg,
        print_trade_key,
    } = input;

    require_keys_eq!(
        taker_trg.key(),
        parse_taker_trg(rfq)?,
        HxroPrintTradeProviderError::UnexpectedTRG
    );
    require_keys_eq!(
        maker_trg.key(),
        parse_maker_trg(response)?,
        HxroPrintTradeProviderError::UnexpectedTRG
    );

    let operator_trg_owner = operator_trg.load()?.owner;
    require_keys_eq!(
        operator.key(),
        operator_trg_owner,
        HxroPrintTradeProviderError::InvalidOperatorTRG
    );

    let (creator, counterparty) = if first_to_prepare == AuthoritySide::Taker {
        (taker_trg, maker_trg)
    } else {
        (maker_trg, taker_trg)
    };
    let (expected_print_trade_address, _) = Pubkey::find_program_address(
        &[
            b"print_trade",
            creator.key().as_ref(),
            counterparty.key().as_ref(),
            response.key().as_ref(),
        ],
        &DexID,
    );
    require_keys_eq!(
        print_trade_key,
        expected_print_trade_address,
        HxroPrintTradeProviderError::InvalidPrintTradeAddress
    );

    Ok(())
}
