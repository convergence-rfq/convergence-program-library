use anchor_lang::prelude::*;

use crate::{
    errors::ProtocolError,
    state::{Response, ResponseState, Rfq},
};

#[derive(Accounts)]
pub struct CleanUpResponseAccounts<'info> {
    /// CHECK: Is actually a maker
    #[account(mut, constraint = maker.key() == response.maker @ ProtocolError::NotAMaker)]
    pub maker: UncheckedAccount<'info>,

    #[account(mut)]
    pub rfq: Box<Account<'info, Rfq>>,
    #[account(mut, close = maker, constraint = response.rfq == rfq.key() @ ProtocolError::ResponseForAnotherRfq)]
    pub response: Account<'info, Response>,
}

fn validate(ctx: &Context<CleanUpResponseAccounts>) -> Result<()> {
    let CleanUpResponseAccounts { rfq, response, .. } = &ctx.accounts;

    let response_state = response.get_state(rfq)?;
    response_state.assert_state_in([
        ResponseState::Canceled,
        ResponseState::Settled,
        ResponseState::Expired,
    ])?;

    Ok(())
}

pub fn clean_up_response_instruction<'info>(
    ctx: Context<'_, '_, '_, 'info, CleanUpResponseAccounts<'info>>,
) -> Result<()> {
    validate(&ctx)?;

    let CleanUpResponseAccounts { rfq, .. } = ctx.accounts;

    rfq.cleared_responses += 1;

    Ok(())
}
