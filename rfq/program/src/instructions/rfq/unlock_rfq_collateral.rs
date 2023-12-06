use crate::{
    errors::ProtocolError,
    seeds::{COLLATERAL_SEED, PROTOCOL_SEED},
    state::{CollateralInfo, ProtocolState, Rfq, RfqState},
};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct UnlockRfqCollateralAccounts<'info> {
    #[account(seeds = [PROTOCOL_SEED.as_bytes()], bump = protocol.bump)]
    pub protocol: Box<Account<'info, ProtocolState>>,
    #[account(mut)]
    pub rfq: Box<Account<'info, Rfq>>,

    #[account(mut, seeds = [COLLATERAL_SEED.as_bytes(), rfq.taker.key().as_ref()],
                bump = collateral_info.bump)]
    pub collateral_info: Account<'info, CollateralInfo>,
}

fn validate(ctx: &Context<UnlockRfqCollateralAccounts>) -> Result<()> {
    let UnlockRfqCollateralAccounts { rfq, .. } = &ctx.accounts;

    rfq.get_state()?.assert_state_in([
        RfqState::Canceled,
        RfqState::Expired,
        RfqState::Settling,
        RfqState::SettlingEnded,
    ])?;

    require!(
        rfq.non_response_taker_collateral_locked > 0,
        ProtocolError::NoCollateralLocked
    );

    Ok(())
}

pub fn unlock_rfq_collateral_instruction(ctx: Context<UnlockRfqCollateralAccounts>) -> Result<()> {
    validate(&ctx)?;

    let UnlockRfqCollateralAccounts {
        rfq,
        collateral_info,
        ..
    } = ctx.accounts;

    let rfq_collateral = rfq.non_response_taker_collateral_locked;
    collateral_info.unlock_collateral(rfq_collateral);
    rfq.non_response_taker_collateral_locked = 0;
    rfq.total_taker_collateral_locked -= rfq_collateral;

    Ok(())
}
