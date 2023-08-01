use std::cell::Ref;

use anchor_lang::prelude::*;
use dex::state::market_product_group::MarketProductGroup;
use dex::state::products::Product;
use dex::utils::numeric::{Fractional, ZERO_FRAC};
use instruments::state::derivative_metadata::DerivativeMetadata;
use instruments::state::enums::{InstrumentType as HxroInstrumentType, OracleType};
use rfq::state::{BaseAssetInfo, Leg, Rfq, SettlementTypeMetadata};
use risk_engine::state::{FutureCommonData, InstrumentType, OptionCommonData, OptionType};

use super::super::errors::HxroPrintTradeProviderError;
use super::super::state::ParsedLegData;

enum ParsedRiskEngineData {
    ForOption(OptionCommonData),
    ForFuture(FutureCommonData),
}

pub fn validate_leg_data(
    rfq: &Rfq,
    leg_index: usize,
    mpg: &MarketProductGroup,
    remaining_accounts: &mut &[AccountInfo],
) -> Result<()> {
    let leg = &rfq.legs[leg_index];
    // TODO instrument type matches with
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

    base_asset
        .get_pyth_oracle()
        .ok_or_else(|| error!(HxroPrintTradeProviderError::NoPythOracleForBaseAsset))
}

fn get_leg_instrument_type(leg: &Leg) -> Result<InstrumentType> {
    let instrument_type_raw = match leg.settlement_type_metadata {
        SettlementTypeMetadata::PrintTrade { instrument_type } => instrument_type,
        SettlementTypeMetadata::Instrument {
            instrument_index: _,
        } => unreachable!(),
    };
    instrument_type_raw
        .try_into()
        .map_err(|_| HxroPrintTradeProviderError::InvalidLegInstrumentType.into())
}

fn parse_leg_data(
    leg: &Leg,
    instrument_type: InstrumentType,
) -> Result<(ParsedRiskEngineData, ParsedLegData)> {
    let mut data_slice = leg.data.as_slice();
    let risk_engine_data = match instrument_type {
        InstrumentType::Option => {
            ParsedRiskEngineData::ForOption(AnchorDeserialize::deserialize(&mut data_slice)?)
        }
        InstrumentType::TermFuture | InstrumentType::PerpFuture => {
            ParsedRiskEngineData::ForFuture(AnchorDeserialize::deserialize(&mut data_slice)?)
        }
        _ => err!(HxroPrintTradeProviderError::InvalidLegInstrumentType)?,
    };
    let parsed_leg_data = AnchorDeserialize::deserialize(&mut data_slice)?;

    require_eq!(
        data_slice.len(),
        0,
        HxroPrintTradeProviderError::InvalidDataSize
    );

    Ok((risk_engine_data, parsed_leg_data))
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
