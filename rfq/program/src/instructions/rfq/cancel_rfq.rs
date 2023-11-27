use crate::{
    errors::ProtocolError,
    seeds::PROTOCOL_SEED,
    state::{ProtocolState, Rfq, RfqState, StoredRfqState},
};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct CancelRfqAccounts<'info> {
    #[account(constraint = taker.key() == rfq.taker @ ProtocolError::NotAMaker)]
    pub taker: Signer<'info>,

    #[account(seeds = [PROTOCOL_SEED.as_bytes()], bump = protocol.bump)]
    pub protocol: Box<Account<'info, ProtocolState>>,
    #[account(mut)]
    pub rfq: Box<Account<'info, Rfq>>,
}

fn validate(ctx: &Context<CancelRfqAccounts>) -> Result<()> {
    let CancelRfqAccounts { rfq, .. } = &ctx.accounts;

    rfq.get_state()?.assert_state_in([RfqState::Active])?;

    require!(
        rfq.total_responses == rfq.cleared_responses,
        ProtocolError::HaveResponses
    );

    Ok(())
}

pub fn cancel_rfq_instruction(ctx: Context<CancelRfqAccounts>) -> Result<()> {
    validate(&ctx)?;

    let CancelRfqAccounts { rfq, .. } = ctx.accounts;

    rfq.state = StoredRfqState::Canceled;

    Ok(())
}
