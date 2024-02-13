use crate::{
    errors::ProtocolError,
    interfaces::print_trade_provider::prepare_print_trade,
    seeds::PROTOCOL_SEED,
    state::{AuthoritySide, ProtocolState, Response, ResponseState, Rfq, StoredResponseState},
};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct PreparePrintTradeSettlementAccounts<'info> {
    #[account(mut)]
    pub caller: Signer<'info>,

    #[account(seeds = [PROTOCOL_SEED.as_bytes()], bump = protocol.bump)]
    pub protocol: Box<Account<'info, ProtocolState>>,
    pub rfq: Box<Account<'info, Rfq>>,
    #[account(mut, constraint = response.rfq == rfq.key() @ ProtocolError::ResponseForAnotherRfq)]
    pub response: Account<'info, Response>,
}

fn validate(ctx: &Context<PreparePrintTradeSettlementAccounts>, side: AuthoritySide) -> Result<()> {
    let PreparePrintTradeSettlementAccounts {
        caller,
        rfq,
        response,
        ..
    } = &ctx.accounts;

    require!(
        rfq.is_settled_as_print_trade(),
        ProtocolError::InvalidSettlingFlow
    );

    let actual_side = response.get_authority_side(rfq, &caller.key());
    require!(
        matches!(actual_side, Some(inner_side) if inner_side == side),
        ProtocolError::NotAPassedAuthority
    );

    let response_state = response.get_state(rfq)?;
    match side {
        AuthoritySide::Taker => response_state.assert_state_in([
            ResponseState::SettlingPreparations,
            ResponseState::OnlyMakerPrepared,
        ])?,
        AuthoritySide::Maker => response_state.assert_state_in([
            ResponseState::SettlingPreparations,
            ResponseState::OnlyTakerPrepared,
        ])?,
    };

    Ok(())
}

pub fn prepare_print_trade_settlement_instruction<'info>(
    ctx: Context<'_, '_, '_, 'info, PreparePrintTradeSettlementAccounts<'info>>,
    side: AuthoritySide,
) -> Result<()> {
    validate(&ctx, side)?;

    let PreparePrintTradeSettlementAccounts {
        protocol,
        rfq,
        response,
        ..
    } = ctx.accounts;

    let mut remaining_accounts = ctx.remaining_accounts.iter();

    prepare_print_trade(side, protocol, rfq, response, &mut remaining_accounts)?;

    *response.get_prepared_counter_mut(side) = 1;

    if response.print_trade_initialized_by.is_none() {
        response.print_trade_initialized_by = Some(side);
    } else {
        response.state = StoredResponseState::ReadyForSettling;
    }

    Ok(())
}
