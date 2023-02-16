use std::mem;

use crate::{
    errors::ProtocolError,
    seeds::{BASE_ASSET_INFO_SEED, PROTOCOL_SEED},
    state::{BaseAssetIndex, BaseAssetInfo, PriceOracle, ProtocolState, RiskCategory},
};
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(index: BaseAssetIndex, ticker: String)]
pub struct AddBaseAssetAccounts<'info> {
    #[account(mut, constraint = protocol.authority == authority.key() @ ProtocolError::NotAProtocolAuthority)]
    pub authority: Signer<'info>,
    #[account(seeds = [PROTOCOL_SEED.as_bytes()], bump = protocol.bump)]
    pub protocol: Account<'info, ProtocolState>,
    #[account(init, payer = authority, space = 8 + mem::size_of::<BaseAssetInfo>() + ticker.as_bytes().len(),
                seeds = [BASE_ASSET_INFO_SEED.as_bytes(), &u16::from(index).to_le_bytes()], bump)]
    pub base_asset: Account<'info, BaseAssetInfo>,

    pub system_program: Program<'info, System>,
}

pub fn add_base_asset_instruction(
    ctx: Context<AddBaseAssetAccounts>,
    index: BaseAssetIndex,
    ticker: String,
    risk_category: RiskCategory,
    price_oracle: PriceOracle,
) -> Result<()> {
    let AddBaseAssetAccounts { base_asset, .. } = ctx.accounts;

    base_asset.set_inner(BaseAssetInfo {
        bump: *ctx.bumps.get("base_asset").unwrap(),
        index,
        enabled: true,
        risk_category,
        price_oracle,
        ticker,
    });

    Ok(())
}
