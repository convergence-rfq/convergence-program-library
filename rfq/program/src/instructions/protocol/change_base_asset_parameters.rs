use crate::{
    errors::ProtocolError,
    seeds::PROTOCOL_SEED,
    state::{BaseAssetInfo, PriceOracle, ProtocolState, RiskCategory},
};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct ChangeBaseAssetParametersAccounts<'info> {
    #[account(constraint = protocol.authority == authority.key() @ ProtocolError::NotAProtocolAuthority)]
    pub authority: Signer<'info>,
    #[account(seeds = [PROTOCOL_SEED.as_bytes()], bump = protocol.bump)]
    pub protocol: Account<'info, ProtocolState>,
    #[account(mut)]
    pub base_asset: Account<'info, BaseAssetInfo>,
}

pub fn change_base_asset_parameters_instruction(
    ctx: Context<ChangeBaseAssetParametersAccounts>,
    enabled: Option<bool>,
    risk_category: Option<RiskCategory>,
    price_oracle: Option<PriceOracle>,
) -> Result<()> {
    let ChangeBaseAssetParametersAccounts { base_asset, .. } = ctx.accounts;

    msg!("Modifying base asset {}", base_asset.ticker);

    if let Some(enabled) = enabled {
        base_asset.enabled = enabled;
        msg!("Enabled set to {}", base_asset.enabled);
    }

    if let Some(risk_category) = risk_category {
        base_asset.risk_category = risk_category;
        msg!("Risk category set to {:?}", base_asset.risk_category);
    }

    if let Some(price_oracle) = price_oracle {
        base_asset.price_oracle = price_oracle;
        msg!("Price oracle set to {:?}", base_asset.price_oracle);
    }

    Ok(())
}
