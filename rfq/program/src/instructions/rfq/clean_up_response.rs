use crate::{
    errors::ProtocolError,
    interfaces::{instrument::clean_up, print_trade_provider::clean_up_print_trade},
    seeds::PROTOCOL_SEED,
    state::{AssetIdentifier, ProtocolState, Response, ResponseState, Rfq},
};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct CleanUpResponseAccounts<'info> {
    /// CHECK: is a maker address in this response
    #[account(mut, constraint = maker.key() == response.maker @ ProtocolError::NotAMaker)]
    pub maker: UncheckedAccount<'info>,

    #[account(seeds = [PROTOCOL_SEED.as_bytes()], bump = protocol.bump)]
    pub protocol: Box<Account<'info, ProtocolState>>,
    #[account(mut)]
    pub rfq: Box<Account<'info, Rfq>>,
    #[account(mut, close = maker, constraint = response.rfq == rfq.key() @ ProtocolError::ResponseForAnotherRfq)]
    pub response: Account<'info, Response>,
}

fn validate(ctx: &Context<CleanUpResponseAccounts>) -> Result<()> {
    let CleanUpResponseAccounts { rfq, response, .. } = &ctx.accounts;

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

    Ok(())
}

pub fn clean_up_response_instruction<'info>(
    ctx: Context<'_, '_, '_, 'info, CleanUpResponseAccounts<'info>>,
) -> Result<()> {
    validate(&ctx)?;

    let CleanUpResponseAccounts {
        protocol,
        rfq,
        response,
        ..
    } = ctx.accounts;

    let mut remaining_accounts = ctx.remaining_accounts.iter();

    if !rfq.is_settled_as_print_trade()
        && !response.escrow_leg_preparations_initialized_by.is_empty()
    {
        let legs_to_revert = response.escrow_leg_preparations_initialized_by.len() as u8;
        for leg_index in 0..legs_to_revert {
            clean_up(
                AssetIdentifier::Leg { leg_index },
                protocol,
                rfq,
                response,
                &mut remaining_accounts,
            )?;
        }

        clean_up(
            AssetIdentifier::Quote,
            protocol,
            rfq,
            response,
            &mut remaining_accounts,
        )?;
    }

    if rfq.is_settled_as_print_trade() && response.print_trade_initialized_by.is_some() {
        clean_up_print_trade(protocol, rfq, response, &mut remaining_accounts)?;
    }

    rfq.cleared_responses += 1;

    Ok(())
}
