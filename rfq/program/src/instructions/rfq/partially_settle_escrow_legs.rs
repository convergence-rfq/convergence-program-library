use crate::{
    errors::ProtocolError,
    interfaces::instrument::settle,
    seeds::PROTOCOL_SEED,
    state::{AssetIdentifier, ProtocolState, Response, ResponseState, Rfq},
};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct PartiallySettleEscrowLegsAccounts<'info> {
    #[account(seeds = [PROTOCOL_SEED.as_bytes()], bump = protocol.bump)]
    pub protocol: Box<Account<'info, ProtocolState>>,
    pub rfq: Box<Account<'info, Rfq>>,
    #[account(mut, constraint = response.rfq == rfq.key() @ ProtocolError::ResponseForAnotherRfq)]
    pub response: Account<'info, Response>,
}

fn validate(
    ctx: &Context<PartiallySettleEscrowLegsAccounts>,
    leg_amount_to_settle: u8,
) -> Result<()> {
    let PartiallySettleEscrowLegsAccounts { rfq, response, .. } = &ctx.accounts;

    require!(
        !rfq.is_settled_as_print_trade(),
        ProtocolError::InvalidSettlingFlow
    );

    response
        .get_state(rfq)?
        .assert_state_in([ResponseState::ReadyForSettling])?;

    let legs_left_to_settle = rfq.legs.len() as u8 - response.settled_escrow_legs;
    require!(
        leg_amount_to_settle > 0 && leg_amount_to_settle < legs_left_to_settle,
        ProtocolError::InvalidSpecifiedLegAmount
    );

    Ok(())
}

pub fn partially_settle_escrow_legs_instruction<'info>(
    ctx: Context<'_, '_, '_, 'info, PartiallySettleEscrowLegsAccounts<'info>>,
    leg_amount_to_settle: u8,
) -> Result<()> {
    validate(&ctx, leg_amount_to_settle)?;

    let PartiallySettleEscrowLegsAccounts {
        protocol,
        rfq,
        response,
        ..
    } = ctx.accounts;

    let mut remaining_accounts = ctx.remaining_accounts.iter();

    for leg_index in
        response.settled_escrow_legs..(response.settled_escrow_legs + leg_amount_to_settle)
    {
        settle(
            AssetIdentifier::Leg { leg_index },
            protocol,
            rfq,
            response,
            &mut remaining_accounts,
        )?;
    }

    response.settled_escrow_legs += leg_amount_to_settle;

    Ok(())
}
