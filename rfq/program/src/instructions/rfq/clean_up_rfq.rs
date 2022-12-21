use crate::{
    errors::ProtocolError,
    seeds::PROTOCOL_SEED,
    state::{ProtocolState, Rfq, RfqState},
};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct CleanUpRfqAccounts<'info> {
    /// CHECK: is a taker address in this rfq
    #[account(mut, constraint = taker.key() == rfq.taker @ ProtocolError::NotATaker)]
    pub taker: UncheckedAccount<'info>,

    #[account(seeds = [PROTOCOL_SEED.as_bytes()], bump = protocol.bump)]
    pub protocol: Account<'info, ProtocolState>,
    #[account(mut, close = taker)]
    pub rfq: Box<Account<'info, Rfq>>,
}

fn validate(ctx: &Context<CleanUpRfqAccounts>) -> Result<()> {
    let CleanUpRfqAccounts { rfq, .. } = &ctx.accounts;

    rfq.get_state()?.assert_state_in([
        RfqState::Canceled,
        RfqState::Expired,
        RfqState::Settling,
        RfqState::SettlingEnded,
    ])?;

    require!(
        rfq.total_taker_collateral_locked == 0,
        ProtocolError::HaveCollateralLocked
    );

    require!(
        rfq.total_responses == rfq.cleared_responses,
        ProtocolError::HaveExistingResponses
    );

    Ok(())
}

pub fn clean_up_rfq_instruction(ctx: Context<CleanUpRfqAccounts>) -> Result<()> {
    validate(&ctx)?;

    Ok(())
}
