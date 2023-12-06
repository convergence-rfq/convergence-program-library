use crate::{
    errors::ProtocolError,
    interfaces::instrument::settle,
    seeds::PROTOCOL_SEED,
    state::{AssetIdentifier, ProtocolState, Response, ResponseState, Rfq, StoredResponseState},
};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct SettleEscrowAccounts<'info> {
    #[account(seeds = [PROTOCOL_SEED.as_bytes()], bump = protocol.bump)]
    pub protocol: Box<Account<'info, ProtocolState>>,
    pub rfq: Box<Account<'info, Rfq>>,
    #[account(mut, constraint = response.rfq == rfq.key() @ ProtocolError::ResponseForAnotherRfq)]
    pub response: Account<'info, Response>,
}

fn validate(ctx: &Context<SettleEscrowAccounts>) -> Result<()> {
    let SettleEscrowAccounts { rfq, response, .. } = &ctx.accounts;

    require!(
        !rfq.is_settled_as_print_trade(),
        ProtocolError::InvalidSettlingFlow
    );

    response
        .get_state(rfq)?
        .assert_state_in([ResponseState::ReadyForSettling])?;

    Ok(())
}

pub fn settle_escrow_instruction<'info>(
    ctx: Context<'_, '_, '_, 'info, SettleEscrowAccounts<'info>>,
) -> Result<()> {
    validate(&ctx)?;

    let SettleEscrowAccounts {
        protocol,
        rfq,
        response,
        ..
    } = ctx.accounts;
    let mut remaining_accounts = ctx.remaining_accounts.iter();

    for leg_index in response.settled_escrow_legs..(rfq.legs.len() as u8) {
        settle(
            AssetIdentifier::Leg { leg_index },
            protocol,
            rfq,
            response,
            &mut remaining_accounts,
        )?;
    }

    settle(
        AssetIdentifier::Quote,
        protocol,
        rfq,
        response,
        &mut remaining_accounts,
    )?;

    response.settled_escrow_legs = rfq.legs.len() as u8;
    response.state = StoredResponseState::Settled;

    Ok(())
}
