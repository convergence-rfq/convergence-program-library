use crate::{
    common::update_state_after_preparation,
    constants::PROTOCOL_SEED,
    errors::ProtocolError,
    interfaces::instrument::prepare_to_settle,
    states::{AuthoritySide, ProtocolState, Response, ResponseState, Rfq},
};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct PrepareMoreLegsSettlementAccounts<'info> {
    pub caller: Signer<'info>,

    #[account(seeds = [PROTOCOL_SEED.as_bytes()], bump = protocol.bump)]
    pub protocol: Account<'info, ProtocolState>,
    pub rfq: Box<Account<'info, Rfq>>,
    #[account(mut, constraint = response.rfq == rfq.key() @ ProtocolError::ResponseForAnotherRfq)]
    pub response: Account<'info, Response>,
}

fn validate(
    ctx: &Context<PrepareMoreLegsSettlementAccounts>,
    side: AuthoritySide,
    leg_amount_to_prepare: u8,
) -> Result<()> {
    let PrepareMoreLegsSettlementAccounts {
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

    let legs_left_to_prepare = rfq.legs.len() - response.get_prepared_legs(side) as usize;
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
        response.get_prepared_legs(side) > 0,
        ProtocolError::HaveNotStartedToPrepare
    );

    Ok(())
}

pub fn prepare_more_legs_settlement_instruction<'info>(
    ctx: Context<'_, '_, '_, 'info, PrepareMoreLegsSettlementAccounts<'info>>,
    side: AuthoritySide,
    leg_amount_to_prepare: u8,
) -> Result<()> {
    validate(&ctx, side, leg_amount_to_prepare)?;

    let PrepareMoreLegsSettlementAccounts {
        protocol,
        rfq,
        response,
        ..
    } = ctx.accounts;

    let mut remaining_accounts = ctx.remaining_accounts.iter();

    for (index, leg) in rfq
        .legs
        .iter()
        .enumerate()
        .skip(response.get_prepared_legs(side) as usize)
        .take(leg_amount_to_prepare as usize)
    {
        prepare_to_settle(
            leg,
            index as u8,
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
