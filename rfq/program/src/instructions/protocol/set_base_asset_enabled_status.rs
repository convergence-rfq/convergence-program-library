use crate::{
    errors::ProtocolError,
    seeds::PROTOCOL_SEED,
    state::{BaseAssetInfo, ProtocolState},
};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct SetBaseAssetEnabledStatusAccounts<'info> {
    #[account(constraint = protocol.authority == authority.key() @ ProtocolError::NotAProtocolAuthority)]
    pub authority: Signer<'info>,
    #[account(seeds = [PROTOCOL_SEED.as_bytes()], bump = protocol.bump)]
    pub protocol: Account<'info, ProtocolState>,
    #[account(mut)]
    pub base_asset: Account<'info, BaseAssetInfo>,
}

fn validate(
    ctx: &Context<SetBaseAssetEnabledStatusAccounts>,
    enabled_status_to_set: bool,
) -> Result<()> {
    let SetBaseAssetEnabledStatusAccounts { base_asset, .. } = &ctx.accounts;

    require!(
        base_asset.enabled != enabled_status_to_set,
        ProtocolError::AlreadyHasAStatusToSet
    );

    Ok(())
}

pub fn set_base_asset_enabled_status_instruction(
    ctx: Context<SetBaseAssetEnabledStatusAccounts>,
    enabled_status_to_set: bool,
) -> Result<()> {
    validate(&ctx, enabled_status_to_set)?;

    let SetBaseAssetEnabledStatusAccounts { base_asset, .. } = ctx.accounts;

    base_asset.enabled = enabled_status_to_set;

    Ok(())
}
