use crate::{
    constants::PROTOCOL_SEED,
    errors::ProtocolError,
    interfaces::instrument::clean_up,
    state::{ProtocolState, Response, ResponseState, Rfq},
};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct CleanUpResponseLegsAccounts<'info> {
    #[account(seeds = [PROTOCOL_SEED.as_bytes()], bump = protocol.bump)]
    pub protocol: Account<'info, ProtocolState>,
    pub rfq: Box<Account<'info, Rfq>>,
    #[account(mut, constraint = response.rfq == rfq.key() @ ProtocolError::ResponseForAnotherRfq)]
    pub response: Account<'info, Response>,
}

fn validate(ctx: &Context<CleanUpResponseLegsAccounts>, leg_amount_to_clear: u8) -> Result<()> {
    let CleanUpResponseLegsAccounts { rfq, response, .. } = &ctx.accounts;

    let response_state = response.get_state(rfq)?;
    response_state.assert_state_in([
        ResponseState::Canceled,
        ResponseState::Settled,
        ResponseState::Defaulted,
        ResponseState::Expired,
    ])?;
    if let ResponseState::Defaulted = response_state {
        require!(
            response.taker_prepared_legs == 0 && response.maker_prepared_legs == 0,
            ProtocolError::PendingPreparations
        );
    }

    require!(
        !response.have_locked_collateral(),
        ProtocolError::HaveCollateralLocked
    );

    require!(
        leg_amount_to_clear > 0
            && leg_amount_to_clear < response.leg_preparations_initialized_by.len() as u8,
        ProtocolError::InvalidSpecifiedLegAmount
    );

    Ok(())
}

pub fn clean_up_response_legs_instruction<'info>(
    ctx: Context<'_, '_, '_, 'info, CleanUpResponseLegsAccounts<'info>>,
    leg_amount_to_clear: u8,
) -> Result<()> {
    validate(&ctx, leg_amount_to_clear)?;

    let CleanUpResponseLegsAccounts {
        protocol,
        rfq,
        response,
        ..
    } = ctx.accounts;

    let mut remaining_accounts = ctx.remaining_accounts.iter();
    let initialized_legs = response.leg_preparations_initialized_by.len();
    let starting_index = initialized_legs - leg_amount_to_clear as usize;
    for (index, leg) in rfq.legs.iter().enumerate().skip(starting_index) {
        clean_up(
            leg,
            index as u8,
            &protocol,
            rfq,
            response,
            &mut remaining_accounts,
        )?;
    }

    for _ in 0..leg_amount_to_clear {
        response.leg_preparations_initialized_by.pop();
    }

    Ok(())
}
