use crate::{
    errors::ProtocolError,
    interfaces::instrument::clean_up,
    seeds::PROTOCOL_SEED,
    state::{AssetIdentifier, ProtocolState, Response, ResponseState, Rfq},
};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct CleanUpResponseEscrowLegsAccounts<'info> {
    #[account(seeds = [PROTOCOL_SEED.as_bytes()], bump = protocol.bump)]
    pub protocol: Box<Account<'info, ProtocolState>>,
    pub rfq: Box<Account<'info, Rfq>>,
    #[account(mut, constraint = response.rfq == rfq.key() @ ProtocolError::ResponseForAnotherRfq)]
    pub response: Account<'info, Response>,
}

fn validate(
    ctx: &Context<CleanUpResponseEscrowLegsAccounts>,
    leg_amount_to_clear: u8,
) -> Result<()> {
    let CleanUpResponseEscrowLegsAccounts { rfq, response, .. } = &ctx.accounts;

    require!(
        !rfq.is_settled_as_print_trade(),
        ProtocolError::InvalidSettlingFlow
    );

    let response_state = response.get_state(rfq)?;
    response_state.assert_state_in([
        ResponseState::Canceled,
        ResponseState::Settled,
        ResponseState::Defaulted,
        ResponseState::Expired,
    ])?;
    if let ResponseState::Defaulted = response_state {
        require!(
            response.taker_prepared_counter == 0 && response.maker_prepared_counter == 0,
            ProtocolError::PendingPreparations
        );
    }

    require!(
        !response.have_locked_collateral(),
        ProtocolError::HaveCollateralLocked
    );

    require!(
        leg_amount_to_clear > 0
            && leg_amount_to_clear < response.escrow_leg_preparations_initialized_by.len() as u8,
        ProtocolError::InvalidSpecifiedLegAmount
    );

    Ok(())
}

pub fn clean_up_response_escrow_legs_instruction<'info>(
    ctx: Context<'_, '_, '_, 'info, CleanUpResponseEscrowLegsAccounts<'info>>,
    leg_amount_to_clear: u8,
) -> Result<()> {
    validate(&ctx, leg_amount_to_clear)?;

    let CleanUpResponseEscrowLegsAccounts {
        protocol,
        rfq,
        response,
        ..
    } = ctx.accounts;

    let mut remaining_accounts = ctx.remaining_accounts.iter();
    let initialized_legs = response.escrow_leg_preparations_initialized_by.len() as u8;
    let starting_index = initialized_legs - leg_amount_to_clear;
    for leg_index in starting_index..initialized_legs {
        clean_up(
            AssetIdentifier::Leg { leg_index },
            protocol,
            rfq,
            response,
            &mut remaining_accounts,
        )?;
    }

    for _ in 0..leg_amount_to_clear {
        response.escrow_leg_preparations_initialized_by.pop();
    }

    Ok(())
}
