use crate::{
    errors::ProtocolError,
    interfaces::instrument::revert_preparation,
    seeds::PROTOCOL_SEED,
    state::{AuthoritySide, ProtocolState, Response, ResponseState, Rfq, StoredResponseState},
};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct PartlyRevertSettlementPreparationAccounts<'info> {
    #[account(seeds = [PROTOCOL_SEED.as_bytes()], bump = protocol.bump)]
    pub protocol: Account<'info, ProtocolState>,
    pub rfq: Box<Account<'info, Rfq>>,
    #[account(mut, constraint = response.rfq == rfq.key() @ ProtocolError::ResponseForAnotherRfq)]
    pub response: Account<'info, Response>,
}

fn validate(
    ctx: &Context<PartlyRevertSettlementPreparationAccounts>,
    side: AuthoritySide,
    leg_amount_to_revert: u8,
) -> Result<()> {
    let PartlyRevertSettlementPreparationAccounts { rfq, response, .. } = &ctx.accounts;

    response
        .get_state(rfq)?
        .assert_state_in([ResponseState::Defaulted])?;

    let prepared_legs = response.get_prepared_legs(side);
    require!(prepared_legs > 0, ProtocolError::NoPreparationToRevert);

    require!(
        leg_amount_to_revert > 0 && leg_amount_to_revert < prepared_legs,
        ProtocolError::InvalidSpecifiedLegAmount
    );

    Ok(())
}

pub fn partly_revert_settlement_preparation_instruction<'info>(
    ctx: Context<'_, '_, '_, 'info, PartlyRevertSettlementPreparationAccounts<'info>>,
    side: AuthoritySide,
    leg_amount_to_revert: u8,
) -> Result<()> {
    validate(&ctx, side, leg_amount_to_revert)?;

    let PartlyRevertSettlementPreparationAccounts {
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
    let prepared_legs = response.get_prepared_legs(side);
    let starting_index = prepared_legs - leg_amount_to_revert;
    for (index, leg) in rfq.legs.iter().enumerate().skip(starting_index as usize) {
        revert_preparation(
            leg,
            index as u8,
            side,
            protocol,
            rfq,
            response,
            &mut remaining_accounts,
        )?;
    }

    *response.get_prepared_legs_mut(side) -= leg_amount_to_revert;

    Ok(())
}
