use std::collections::HashMap;

use anchor_lang::prelude::*;
use rfq::state::{BaseAssetIndex, BaseAssetInfo, PriceOracle};
use switchboard_v2::{AggregatorAccountData, SwitchboardDecimal};

use crate::{errors::Error, state::Config};

pub fn extract_prices(
    base_assets: &Vec<BaseAssetInfo>,
    accounts: &mut &[AccountInfo],
    config: &Config,
) -> Result<HashMap<BaseAssetIndex, f64>> {
    let mut result = HashMap::default();

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
        let price = extract_price(first_matched_asset.price_oracle, account, config)?;
        result.insert(first_matched_asset.index, price.clone());

        for base_asset in matched_assets {
            result.insert(base_asset.index, price.clone());
        }
    }

    Ok(result)
}

fn does_oracle_match(base_asset: &BaseAssetInfo, address: Pubkey) -> bool {
    match base_asset.price_oracle {
        PriceOracle::Switchboard {
            address: stored_address,
        } => stored_address == address,
    }
}

fn extract_price(oracle: PriceOracle, account: &AccountInfo, config: &Config) -> Result<f64> {
    match oracle {
        PriceOracle::Switchboard { address: _ } => extract_switchboard_price(account, config),
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
