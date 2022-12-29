use crate::{
    errors::ProtocolError,
    interfaces::print_trade_provider::clean_up,
    seeds::PROTOCOL_SEED,
    state::{ProtocolState, Response, ResponseState, Rfq, StoredResponseState},
};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct CleanUpPrintTradeAccounts<'info> {
    #[account(seeds = [PROTOCOL_SEED.as_bytes()], bump = protocol.bump)]
    pub protocol: Account<'info, ProtocolState>,
    pub rfq: Box<Account<'info, Rfq>>,
    #[account(mut, constraint = response.rfq == rfq.key() @ ProtocolError::ResponseForAnotherRfq)]
    pub response: Account<'info, Response>,
}

fn validate(ctx: &Context<CleanUpPrintTradeAccounts>) -> Result<()> {
    let CleanUpPrintTradeAccounts { rfq, response, .. } = &ctx.accounts;

    require!(
        rfq.is_settled_as_print_trade(),
        ProtocolError::InvalidSettlingFlow
    );

    response
        .get_state(rfq)?
        .assert_state_in([ResponseState::Settled, ResponseState::Defaulted])?;

    require!(
        response.print_trade_prepared_by.is_some(),
        ProtocolError::NoPrintTradeToCleanUp
    );

    Ok(())
}

pub fn clean_up_print_trade_instruction<'info>(
    ctx: Context<'_, '_, '_, 'info, CleanUpPrintTradeAccounts<'info>>,
) -> Result<()> {
    validate(&ctx)?;

    let CleanUpPrintTradeAccounts {
        protocol,
        rfq,
        response,
        ..
    } = ctx.accounts;

    if response.state != StoredResponseState::Defaulted {
        response.default_by_time(rfq);
        response.exit(ctx.program_id)?;
    }

    let mut remaining_accounts = ctx.remaining_accounts.iter();

    clean_up(protocol, rfq, response, &mut remaining_accounts)?;

    response.print_trade_prepared_by = None;

    Ok(())
}
