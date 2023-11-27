use crate::{
    common::update_state_after_preparation,
    errors::ProtocolError,
    interfaces::instrument::prepare_to_settle,
    seeds::PROTOCOL_SEED,
    state::{AssetIdentifier, AuthoritySide, ProtocolState, Response, ResponseState, Rfq},
};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct PrepareSettlementAccounts<'info> {
    #[account(mut)]
    pub caller: Signer<'info>,

    #[account(seeds = [PROTOCOL_SEED.as_bytes()], bump = protocol.bump)]
    pub protocol: Box<Account<'info, ProtocolState>>,
    pub rfq: Box<Account<'info, Rfq>>,
    #[account(mut, constraint = response.rfq == rfq.key() @ ProtocolError::ResponseForAnotherRfq)]
    pub response: Account<'info, Response>,
}

fn validate(
    ctx: &Context<PrepareSettlementAccounts>,
    side: AuthoritySide,
    leg_amount_to_prepare: u8,
) -> Result<()> {
    let PrepareSettlementAccounts {
        caller,
        rfq,
        response,
        ..
    } = &ctx.accounts;

    let actual_side = response.get_authority_side(rfq, &caller.key());
    require!(
        matches!(actual_side, Some(inner_side) if inner_side == side),
        ProtocolError::NotAPassedAuthority
    );

    require!(
        leg_amount_to_prepare > 0 && leg_amount_to_prepare as usize <= rfq.legs.len(),
        ProtocolError::InvalidSpecifiedLegAmount
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

    require!(
        response.get_prepared_legs(side) == 0,
        ProtocolError::AlreadyStartedToPrepare
    );

    Ok(())
}

pub fn prepare_settlement_instruction<'info>(
    ctx: Context<'_, '_, '_, 'info, PrepareSettlementAccounts<'info>>,
    side: AuthoritySide,
    leg_amount_to_prepare: u8,
) -> Result<()> {
    validate(&ctx, side, leg_amount_to_prepare)?;

    let PrepareSettlementAccounts {
        protocol,
        rfq,
        response,
        ..
    } = ctx.accounts;

    let mut remaining_accounts = ctx.remaining_accounts.iter();

    prepare_to_settle(
        AssetIdentifier::Quote,
        side,
        protocol,
        rfq,
        response,
        &mut remaining_accounts,
    )?;

    for leg_index in 0..leg_amount_to_prepare {
        prepare_to_settle(
            AssetIdentifier::Leg { leg_index },
            side,
            protocol,
            rfq,
            response,
            &mut remaining_accounts,
        )?;
    }

    update_state_after_preparation(side, leg_amount_to_prepare, rfq, response);

    Ok(())
}
