use crate::{
    errors::ProtocolError,
    seeds::PROTOCOL_SEED,
    state::{ProtocolState, Response, ResponseState, Rfq, StoredResponseState},
};
use anchor_lang::prelude::*;

pub const EXPIRATION_BUFFER_SECONDS: i64 = 600;

#[derive(Accounts)]
pub struct ExpireSettlementAccounts<'info> {
    #[account(seeds = [PROTOCOL_SEED.as_bytes()], bump = protocol.bump)]
    pub protocol: Box<Account<'info, ProtocolState>>,
    pub rfq: Box<Account<'info, Rfq>>,
    #[account(mut, constraint = response.rfq == rfq.key() @ ProtocolError::ResponseForAnotherRfq)]
    pub response: Account<'info, Response>,
}

fn validate(ctx: &Context<ExpireSettlementAccounts>) -> Result<()> {
    let ExpireSettlementAccounts {
        protocol,
        rfq,
        response,
        ..
    } = &ctx.accounts;

    let print_trade_provoder = rfq
        .print_trade_provider
        .ok_or(error!(ProtocolError::InvalidSettlingFlow))?;
    let print_trade_provider_params = protocol
        .get_print_trade_provider_parameters(print_trade_provoder)
        .unwrap();
    require!(
        print_trade_provider_params.settlement_can_expire,
        ProtocolError::SettlementExpirationIsDisabled
    );

    response
        .get_state(rfq)?
        .assert_state_in([ResponseState::ReadyForSettling])?;

    let current_time = Clock::get()?.unix_timestamp;
    require!(
        current_time > rfq.get_settle_window_end() + EXPIRATION_BUFFER_SECONDS,
        ProtocolError::TooEarlyForExpiration
    );

    Ok(())
}

pub fn expire_settlement_instruction(ctx: Context<ExpireSettlementAccounts>) -> Result<()> {
    validate(&ctx)?;

    let ExpireSettlementAccounts { response, .. } = ctx.accounts;

    response.state = StoredResponseState::SettlementExpired;

    Ok(())
}
