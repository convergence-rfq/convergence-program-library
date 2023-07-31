use std::cell::Ref;

use anchor_lang::prelude::*;
use dex::state::market_product_group::MarketProductGroup;
use dex::state::products::Product;
use instruments::state::derivative_metadata::DerivativeMetadata;
use instruments::state::enums::OracleType;
use rfq::state::{BaseAssetInfo, Rfq, SettlementTypeMetadata};
use risk_engine::state::{FutureCommonData, InstrumentType, OptionCommonData};

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

    let data_slice = &mut &leg.data.as_slice();
    let instrument_type = match leg.settlement_type_metadata {
        SettlementTypeMetadata::PrintTrade { instrument_type } => instrument_type,
        SettlementTypeMetadata::Instrument {
            instrument_index: _,
        } => unreachable!(),
    };
    // let k = InstrumentType::Option as u8;
    // let parsed_risk_engine_data = match instrument_type {
    //     k => AnchorDeserialize::deserialize(data_slice),
    //     _ => unreachable!(),
    // }

    let ParsedLegData { product_index } = AnchorDeserialize::try_from_slice(&leg.data)?;

    // require_eq!(data.len(), 0, HxroPrintTradeProviderError::InvalidDataSize);

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
    let product_loader = AccountLoader::try_from(product_account)?;
    let product: Ref<DerivativeMetadata> = product_loader.load()?;

    let base_asset_account = extract_next_account(remaining_accounts)?;
    let base_asset: Account<BaseAssetInfo> = Account::try_from(base_asset_account)?;
    require!(
        leg.base_asset_index == base_asset.index,
        HxroPrintTradeProviderError::InvalidBaseAssetAccountIndex
    );

    require!(
        matches!(product.oracle_type, OracleType::Pyth),
        HxroPrintTradeProviderError::InvalidHxroOracleType
    );

    let protocol_oracle = base_asset
        .get_pyth_oracle()
        .ok_or_else(|| error!(HxroPrintTradeProviderError::NoPythOracleForBaseAsset))?;
    require_keys_eq!(
        product.price_oracle,
        protocol_oracle,
        HxroPrintTradeProviderError::OracleDoesNotMatchWithBaseAsset
    );

    // TODO only for perpetuals
    require!(
        rfq.get_settle_window_end() < product.initialization_time + product.full_funding_period,
        HxroPrintTradeProviderError::ProductExpiresToEarly
    );

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
