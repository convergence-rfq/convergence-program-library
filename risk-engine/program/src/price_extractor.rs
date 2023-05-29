use std::collections::HashMap;

use anchor_lang::prelude::*;
use pyth_sdk_solana::{load_price_feed_from_account_info, Price, PriceFeed};
use rfq::state::{BaseAssetIndex, BaseAssetInfo, OracleSource};
use switchboard_v2::{AggregatorAccountData, SwitchboardDecimal};

use crate::{errors::Error, state::Config, utils::convert_fixed_point_to_f64};

pub fn extract_prices(
    base_assets: &Vec<BaseAssetInfo>,
    accounts: &mut &[AccountInfo],
    config: &Config,
) -> Result<HashMap<BaseAssetIndex, f64>> {
    let mut result = HashMap::default();

    extract_in_place_prices(base_assets, &mut result);
    extract_oracle_prices(base_assets, accounts, config, &mut result)?;

    Ok(result)
}

fn extract_in_place_prices(
    base_assets: &[BaseAssetInfo],
    result: &mut HashMap<BaseAssetIndex, f64>,
) {
    for in_place_base_asset in base_assets
        .iter()
        .filter(|x| matches!(x.oracle_source, OracleSource::InPlace))
    {
        let price = in_place_base_asset.get_in_place_price().unwrap();
        result.insert(in_place_base_asset.index, price);
    }
}

fn extract_oracle_prices(
    base_assets: &Vec<BaseAssetInfo>,
    accounts: &mut &[AccountInfo],
    config: &Config,
    result: &mut HashMap<BaseAssetIndex, f64>,
) -> Result<()> {
    // extract oracles while we won't have price for each base asset
    while result.len() < base_assets.len() {
        require!(!accounts.is_empty(), Error::NotEnoughAccounts);
        let account = &accounts[0];
        *accounts = &accounts[1..];

        // multiple base assets could reference the same oracle
        let mut matched_assets = base_assets
            .iter()
            .filter(|x| does_oracle_match(x, account.key()));

        let first_matched_asset = matched_assets
            .next()
            .ok_or_else(|| error!(Error::InvalidOracle))?;
        let price = extract_oracle_price(first_matched_asset.oracle_source, account, config)?;
        result.insert(first_matched_asset.index, price);

        for base_asset in matched_assets {
            result.insert(base_asset.index, price);
        }
    }

    Ok(())
}

fn does_oracle_match(base_asset: &BaseAssetInfo, address: Pubkey) -> bool {
    match base_asset.oracle_source {
        OracleSource::Switchboard => base_asset.get_switchboard_oracle() == Some(address),
        OracleSource::Pyth => base_asset.get_pyth_oracle() == Some(address),
        OracleSource::InPlace => false,
    }
}

fn extract_oracle_price(
    oracle_source: OracleSource,
    account: &AccountInfo,
    config: &Config,
) -> Result<f64> {
    match oracle_source {
        OracleSource::Switchboard => extract_switchboard_price(account, config),
        OracleSource::Pyth => extract_pyth_price(account, config),
        OracleSource::InPlace => unreachable!(),
    }
}

fn extract_switchboard_price(account: &AccountInfo, config: &Config) -> Result<f64> {
    let loader = AccountLoader::<AggregatorAccountData>::try_from(account)?;
    let feed = loader.load()?;

    feed.check_staleness(
        Clock::get()?.unix_timestamp,
        config.accepted_oracle_staleness as i64,
    )
    .map_err(|_| error!(Error::StaleOracle))?;

    let price = feed.get_result()?.try_into()?;

    let confidence_interval = price * config.accepted_oracle_confidence_interval_portion;
    feed.check_confidence_interval(SwitchboardDecimal::from_f64(confidence_interval))
        .map_err(|_| error!(Error::OracleConfidenceOutOfRange))?;

    Ok(price)
}

fn extract_pyth_price(account: &AccountInfo, config: &Config) -> Result<f64> {
    let price_feed: PriceFeed = load_price_feed_from_account_info(account).unwrap();
    let current_timestamp = Clock::get()?.unix_timestamp;
    let current_data: Price = price_feed
        .get_price_no_older_than(current_timestamp, config.accepted_oracle_staleness)
        .ok_or_else(|| error!(Error::StaleOracle))?;
    let decimals =
        u8::try_from(-current_data.expo).map_err(|_| error!(Error::InvalidOracleData))?;
    let price = convert_fixed_point_to_f64(
        u64::try_from(current_data.price).map_err(|_| error!(Error::InvalidOracleData))?,
        decimals,
    );

    let confidence = convert_fixed_point_to_f64(current_data.conf, decimals);
    let confidence_interval = price * config.accepted_oracle_confidence_interval_portion;
    require!(
        confidence <= confidence_interval,
        Error::OracleConfidenceOutOfRange
    );

    Ok(price)
}
