use crate::{
    errors::ProtocolError,
    seeds::PROTOCOL_SEED,
    state::{BaseAssetInfo, OracleSource, ProtocolState, RiskCategory},
};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct ChangeBaseAssetParametersAccounts<'info> {
    #[account(constraint = protocol.authority == authority.key() @ ProtocolError::NotAProtocolAuthority)]
    pub authority: Signer<'info>,
    #[account(seeds = [PROTOCOL_SEED.as_bytes()], bump = protocol.bump)]
    pub protocol: Box<Account<'info, ProtocolState>>,
    #[account(mut)]
    pub base_asset: Account<'info, BaseAssetInfo>,
}

// This is workaround for a case of Option<Option<T>>, where on a client side, null value is
// ambiquous between being None on outer and inner level
#[derive(AnchorSerialize, AnchorDeserialize, Copy, Clone)]
pub enum CustomOptionalPubkey {
    Some { value: Option<Pubkey> },
    None,
}

#[derive(AnchorSerialize, AnchorDeserialize, Copy, Clone)]
pub enum CustomOptionalF64 {
    Some { value: Option<f64> },
    None,
}

pub fn change_base_asset_parameters_instruction(
    ctx: Context<ChangeBaseAssetParametersAccounts>,
    enabled: Option<bool>,
    risk_category: Option<RiskCategory>,
    oracle_source: Option<OracleSource>,
    switchboard_oracle: CustomOptionalPubkey,
    pyth_oracle: CustomOptionalPubkey,
    in_place_price: CustomOptionalF64,
    strict: Option<bool>,
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

    if let Some(oracle_source) = oracle_source {
        base_asset.oracle_source = oracle_source;
        msg!("Oracle source set to {:?}", base_asset.oracle_source);
    }

    if let CustomOptionalPubkey::Some {
        value: switchboard_oracle,
    } = switchboard_oracle
    {
        base_asset.set_switchboard_oracle(switchboard_oracle)?;
        msg!("Switchboard oracle set to {:?}", switchboard_oracle);
    }

    if let CustomOptionalPubkey::Some { value: pyth_oracle } = pyth_oracle {
        base_asset.set_pyth_oracle(pyth_oracle)?;
        msg!("Pyth oracle set to {:?}", pyth_oracle);
    }

    if let CustomOptionalF64::Some {
        value: in_place_price,
    } = in_place_price
    {
        base_asset.set_in_place_price(in_place_price)?;
        msg!("In place price set to {:?}", in_place_price);
    }

    if let Some(strict) = strict {
        base_asset.non_strict = !strict;
        msg!("Strict set to {:?}", strict);
    }

    base_asset.validate_oracle_source()
}
