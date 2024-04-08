use crate::{
    errors::ProtocolError,
    seeds::PROTOCOL_SEED,
    state::{FeeParameters, ProtocolState},
};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct ChangeProtocolFeesAccounts<'info> {
    #[account(constraint = protocol.authority == authority.key() @ ProtocolError::NotAProtocolAuthority)]
    pub authority: Signer<'info>,
    #[account(mut, seeds = [PROTOCOL_SEED.as_bytes()], bump = protocol.bump)]
    pub protocol: Box<Account<'info, ProtocolState>>,
}

fn validate(settle_fees: Option<FeeParameters>, default_fees: Option<FeeParameters>) -> Result<()> {
    if let Some(settle_fees) = settle_fees {
        settle_fees.validate()?;
    }

    if let Some(default_fees) = default_fees {
        default_fees.validate()?;
    }

    Ok(())
}

pub fn change_protocol_fees_instruction(
    ctx: Context<ChangeProtocolFeesAccounts>,
    settle_fees: Option<FeeParameters>,
    default_fees: Option<FeeParameters>,
    asset_add_fee: Option<u64>,
) -> Result<()> {
    validate(settle_fees, default_fees)?;

    let ChangeProtocolFeesAccounts { protocol, .. } = ctx.accounts;

    if let Some(settle_fees) = settle_fees {
        protocol.settle_fees = settle_fees;
    }

    if let Some(default_fees) = default_fees {
        protocol.default_fees = default_fees;
    }

    if let Some(asset_add_fee) = asset_add_fee {
        protocol.asset_add_fee = asset_add_fee;
    }

    Ok(())
}
