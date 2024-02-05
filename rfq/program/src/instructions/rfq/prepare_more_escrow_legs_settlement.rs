use crate::{
    common::update_state_after_escrow_preparation,
    errors::ProtocolError,
    interfaces::instrument::prepare_to_settle,
    seeds::PROTOCOL_SEED,
    state::{AssetIdentifier, AuthoritySide, ProtocolState, Response, ResponseState, Rfq},
};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct PrepareMoreEscrowLegsSettlementAccounts<'info> {
    pub caller: Signer<'info>,

    #[account(seeds = [PROTOCOL_SEED.as_bytes()], bump = protocol.bump)]
    pub protocol: Box<Account<'info, ProtocolState>>,
    pub rfq: Box<Account<'info, Rfq>>,
    #[account(mut, constraint = response.rfq == rfq.key() @ ProtocolError::ResponseForAnotherRfq)]
    pub response: Account<'info, Response>,
}

fn validate(
    ctx: &Context<PrepareMoreEscrowLegsSettlementAccounts>,
    side: AuthoritySide,
    leg_amount_to_prepare: u8,
) -> Result<()> {
    let PrepareMoreEscrowLegsSettlementAccounts {
        caller,
        rfq,
        response,
        ..
    } = &ctx.accounts;

    require!(
        !rfq.is_settled_as_print_trade(),
        ProtocolError::InvalidSettlingFlow
    );

    let actual_side = response.get_authority_side(rfq, &caller.key());
    require!(
        matches!(actual_side, Some(inner_side) if inner_side == side),
        ProtocolError::NotAPassedAuthority
    );

    let legs_left_to_prepare = rfq.legs.len() - response.get_prepared_counter(side) as usize;
    require!(
        leg_amount_to_prepare > 0 && leg_amount_to_prepare as usize <= legs_left_to_prepare,
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
        response.get_prepared_counter(side) > 0,
        ProtocolError::HaveNotStartedToPrepare
    );

    Ok(())
}

pub fn prepare_more_escrow_legs_settlement_instruction<'info>(
    ctx: Context<'_, '_, '_, 'info, PrepareMoreEscrowLegsSettlementAccounts<'info>>,
    side: AuthoritySide,
    leg_amount_to_prepare: u8,
) -> Result<()> {
    validate(&ctx, side, leg_amount_to_prepare)?;

    let PrepareMoreEscrowLegsSettlementAccounts {
        protocol,
        rfq,
        response,
        ..
    } = ctx.accounts;

    let mut remaining_accounts = ctx.remaining_accounts.iter();

    let start_index = response.get_prepared_counter(side);
    for leg_index in start_index..(start_index + leg_amount_to_prepare) {
        prepare_to_settle(
            AssetIdentifier::Leg { leg_index },
            side,
            protocol,
            rfq,
            response,
            &mut remaining_accounts,
        )?;
    }

    update_state_after_escrow_preparation(side, leg_amount_to_prepare, rfq, response);

    Ok(())
}
