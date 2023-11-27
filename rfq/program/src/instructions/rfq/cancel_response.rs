use crate::{
    errors::ProtocolError,
    seeds::PROTOCOL_SEED,
    state::{ProtocolState, Response, ResponseState, Rfq, StoredResponseState},
};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct CancelResponseAccounts<'info> {
    #[account(constraint = maker.key() == response.maker @ ProtocolError::NotAMaker)]
    pub maker: Signer<'info>,

    #[account(seeds = [PROTOCOL_SEED.as_bytes()], bump = protocol.bump)]
    pub protocol: Box<Account<'info, ProtocolState>>,
    pub rfq: Box<Account<'info, Rfq>>,
    #[account(mut, constraint = response.rfq == rfq.key() @ ProtocolError::ResponseForAnotherRfq)]
    pub response: Account<'info, Response>,
}

fn validate(ctx: &Context<CancelResponseAccounts>) -> Result<()> {
    let CancelResponseAccounts { rfq, response, .. } = &ctx.accounts;

    response
        .get_state(rfq)?
        .assert_state_in([ResponseState::Active])?;

    Ok(())
}

pub fn cancel_response_instruction(ctx: Context<CancelResponseAccounts>) -> Result<()> {
    validate(&ctx)?;

    let CancelResponseAccounts { response, .. } = ctx.accounts;

    response.state = StoredResponseState::Canceled;

    Ok(())
}
