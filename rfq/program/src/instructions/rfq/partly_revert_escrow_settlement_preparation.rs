use crate::{
    errors::ProtocolError,
    interfaces::instrument::revert_preparation,
    seeds::PROTOCOL_SEED,
    state::{
        AssetIdentifier, AuthoritySide, ProtocolState, Response, ResponseState, Rfq,
        StoredResponseState,
    },
};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct PartlyRevertEscrowSettlementPreparationAccounts<'info> {
    #[account(seeds = [PROTOCOL_SEED.as_bytes()], bump = protocol.bump)]
    pub protocol: Box<Account<'info, ProtocolState>>,
    pub rfq: Box<Account<'info, Rfq>>,
    #[account(mut, constraint = response.rfq == rfq.key() @ ProtocolError::ResponseForAnotherRfq)]
    pub response: Account<'info, Response>,
}

fn validate(
    ctx: &Context<PartlyRevertEscrowSettlementPreparationAccounts>,
    side: AuthoritySide,
    leg_amount_to_revert: u8,
) -> Result<()> {
    let PartlyRevertEscrowSettlementPreparationAccounts { rfq, response, .. } = &ctx.accounts;

    require!(
        !rfq.is_settled_as_print_trade(),
        ProtocolError::InvalidSettlingFlow
    );

    response
        .get_state(rfq)?
        .assert_state_in([ResponseState::Defaulted])?;

    let prepared_legs = response.get_prepared_counter(side);
    require!(prepared_legs > 0, ProtocolError::NoPreparationToRevert);

    require!(
        leg_amount_to_revert > 0 && leg_amount_to_revert < prepared_legs,
        ProtocolError::InvalidSpecifiedLegAmount
    );

    Ok(())
}

pub fn partly_revert_escrow_settlement_preparation_instruction<'info>(
    ctx: Context<'_, '_, '_, 'info, PartlyRevertEscrowSettlementPreparationAccounts<'info>>,
    side: AuthoritySide,
    leg_amount_to_revert: u8,
) -> Result<()> {
    validate(&ctx, side, leg_amount_to_revert)?;

    let PartlyRevertEscrowSettlementPreparationAccounts {
        protocol,
        rfq,
        response,
        ..
    } = ctx.accounts;

    if response.state != StoredResponseState::Defaulted {
        response.default_by_time(rfq);
        response.exit(ctx.program_id)?;
    }

    let mut remaining_accounts = ctx.remaining_accounts.iter();
    let prepared_legs = response.get_prepared_counter(side);
    let starting_index = prepared_legs - leg_amount_to_revert;
    for leg_index in starting_index..prepared_legs {
        revert_preparation(
            AssetIdentifier::Leg { leg_index },
            side,
            protocol,
            rfq,
            response,
            &mut remaining_accounts,
        )?;
    }

    *response.get_prepared_counter_mut(side) -= leg_amount_to_revert;

    Ok(())
}
