use crate::{
    errors::ProtocolError,
    interfaces::print_trade_provider::settle_print_trade,
    seeds::PROTOCOL_SEED,
    state::{ProtocolState, Response, ResponseState, Rfq, StoredResponseState},
};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct SettlePrintTradeAccounts<'info> {
    #[account(seeds = [PROTOCOL_SEED.as_bytes()], bump = protocol.bump)]
    pub protocol: Account<'info, ProtocolState>,
    pub rfq: Box<Account<'info, Rfq>>,
    #[account(mut, constraint = response.rfq == rfq.key() @ ProtocolError::ResponseForAnotherRfq)]
    pub response: Account<'info, Response>,
}

fn validate(ctx: &Context<SettlePrintTradeAccounts>) -> Result<()> {
    let SettlePrintTradeAccounts { rfq, response, .. } = &ctx.accounts;

    require!(
        rfq.is_settled_as_print_trade(),
        ProtocolError::InvalidSettlingFlow
    );

    response
        .get_state(rfq)?
        .assert_state_in([ResponseState::ReadyForSettling])?;

    Ok(())
}

pub fn settle_print_trade_instruction<'info>(
    ctx: Context<'_, '_, '_, 'info, SettlePrintTradeAccounts<'info>>,
) -> Result<()> {
    validate(&ctx)?;

    let SettlePrintTradeAccounts {
        protocol,
        rfq,
        response,
        ..
    } = ctx.accounts;

    let mut remaining_accounts = ctx.remaining_accounts.iter();
    settle_print_trade(protocol, rfq, response, &mut remaining_accounts)?;

    response.state = StoredResponseState::Settled;

    Ok(())
}
