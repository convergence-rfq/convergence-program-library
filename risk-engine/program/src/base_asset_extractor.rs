use std::collections::HashSet;

use crate::errors::Error;
use anchor_lang::prelude::*;
use rfq::state::{BaseAssetIndex, BaseAssetInfo, Leg};

pub fn extract_base_assets(
    legs: &[Leg],
    remaining_accounts: &mut &[AccountInfo],
) -> Result<Vec<BaseAssetInfo>> {
    let mut base_assets: HashSet<BaseAssetIndex> =
        legs.iter().map(|leg| leg.base_asset_index).collect();

    let mut result = vec![];

    for _ in 0..base_assets.len() {
        let base_asset_info = extract_base_asset_info(remaining_accounts)?;
        require!(
            base_assets.contains(&base_asset_info.index),
            Error::NotEnoughAccounts
        );
        base_assets.remove(&base_asset_info.index);
        result.push(base_asset_info);
    }

    Ok(result)
}

fn extract_base_asset_info(accounts: &mut &[AccountInfo]) -> Result<BaseAssetInfo> {
    require!(!accounts.is_empty(), Error::NotEnoughAccounts);
    let account = &accounts[0];
    *accounts = &accounts[1..];
    let parsed_account = Account::<BaseAssetInfo>::try_from(account)?;
    Ok(parsed_account.into_inner())
}
