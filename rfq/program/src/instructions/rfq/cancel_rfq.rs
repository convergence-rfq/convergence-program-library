use crate::{
    constants::PROTOCOL_SEED,
    errors::ProtocolError,
    states::{ProtocolState, Rfq, RfqState, StoredRfqState},
};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct CancelRfqAccounts<'info> {
    #[account(constraint = taker.key() == rfq.taker @ ProtocolError::NotAMaker)]
    pub taker: Signer<'info>,

    #[account(seeds = [PROTOCOL_SEED.as_bytes()], bump = protocol.bump)]
    pub protocol: Account<'info, ProtocolState>,
    #[account(mut)]
    pub rfq: Box<Account<'info, Rfq>>,
}

fn validate(ctx: &Context<CancelRfqAccounts>) -> Result<()> {
    let CancelRfqAccounts { rfq, .. } = &ctx.accounts;

    rfq.get_state()?.assert_state_in([RfqState::Active])?;

    require!(rfq.total_responses == 0, ProtocolError::HaveResponses);

    Ok(())
}

pub fn cancel_rfq_instruction(ctx: Context<CancelRfqAccounts>) -> Result<()> {
    validate(&ctx)?;

    let CancelRfqAccounts { rfq, .. } = ctx.accounts;

    rfq.state = StoredRfqState::Canceled;

    Ok(())
}
