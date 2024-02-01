use crate::{
    errors::ProtocolError,
    interfaces::print_trade_provider::revert_print_trade_preparation,
    seeds::PROTOCOL_SEED,
    state::{AuthoritySide, ProtocolState, Response, ResponseState, Rfq, StoredResponseState},
};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct RevertPrintTradeSettlementPreparationAccounts<'info> {
    #[account(seeds = [PROTOCOL_SEED.as_bytes()], bump = protocol.bump)]
    pub protocol: Box<Account<'info, ProtocolState>>,
    pub rfq: Box<Account<'info, Rfq>>,
    #[account(mut, constraint = response.rfq == rfq.key() @ ProtocolError::ResponseForAnotherRfq)]
    pub response: Account<'info, Response>,
}

fn validate(
    ctx: &Context<RevertPrintTradeSettlementPreparationAccounts>,
    side: AuthoritySide,
) -> Result<()> {
    let RevertPrintTradeSettlementPreparationAccounts { rfq, response, .. } = &ctx.accounts;

    require!(
        rfq.is_settled_as_print_trade(),
        ProtocolError::InvalidSettlingFlow
    );

    response
        .get_state(rfq)?
        .assert_state_in([ResponseState::Defaulted, ResponseState::SettlementExpired])?;

    require!(
        response.get_prepared_counter(side) > 0,
        ProtocolError::NoPreparationToRevert
    );

    Ok(())
}

pub fn revert_print_trade_settlement_preparation_instruction<'info>(
    ctx: Context<'_, '_, '_, 'info, RevertPrintTradeSettlementPreparationAccounts<'info>>,
    side: AuthoritySide,
) -> Result<()> {
    validate(&ctx, side)?;

    let RevertPrintTradeSettlementPreparationAccounts {
        protocol,
        rfq,
        response,
        ..
    } = ctx.accounts;

    if response.state != StoredResponseState::SettlementExpired
        && response.state != StoredResponseState::Defaulted
    {
        response.default_by_time(rfq);
        response.exit(ctx.program_id)?;
    }

    let mut remaining_accounts = ctx.remaining_accounts.iter();
    revert_print_trade_preparation(side, protocol, rfq, response, &mut remaining_accounts)?;

    *response.get_prepared_counter_mut(side) = 0;

    Ok(())
}
