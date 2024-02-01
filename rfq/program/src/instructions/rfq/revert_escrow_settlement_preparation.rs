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
pub struct RevertEscrowSettlementPreparationAccounts<'info> {
    #[account(seeds = [PROTOCOL_SEED.as_bytes()], bump = protocol.bump)]
    pub protocol: Box<Account<'info, ProtocolState>>,
    pub rfq: Box<Account<'info, Rfq>>,
    #[account(mut, constraint = response.rfq == rfq.key() @ ProtocolError::ResponseForAnotherRfq)]
    pub response: Account<'info, Response>,
}

fn validate(
    ctx: &Context<RevertEscrowSettlementPreparationAccounts>,
    side: AuthoritySide,
) -> Result<()> {
    let RevertEscrowSettlementPreparationAccounts { rfq, response, .. } = &ctx.accounts;

    require!(
        !rfq.is_settled_as_print_trade(),
        ProtocolError::InvalidSettlingFlow
    );

    response
        .get_state(rfq)?
        .assert_state_in([ResponseState::Defaulted])?;

    require!(
        response.get_prepared_counter(side) > 0,
        ProtocolError::NoPreparationToRevert
    );

    Ok(())
}

pub fn revert_escrow_settlement_preparation_instruction<'info>(
    ctx: Context<'_, '_, '_, 'info, RevertEscrowSettlementPreparationAccounts<'info>>,
    side: AuthoritySide,
) -> Result<()> {
    validate(&ctx, side)?;

    let RevertEscrowSettlementPreparationAccounts {
        protocol,
        rfq,
        response,
        ..
    } = ctx.accounts;

    if response.state != StoredResponseState::Defaulted {
        response.default_by_time(rfq);
        response.exit(ctx.program_id)?;
    }

    let prepared_legs = response.get_prepared_counter(side);
    let mut remaining_accounts = ctx.remaining_accounts.iter();
    for leg_index in 0..prepared_legs {
        revert_preparation(
            AssetIdentifier::Leg { leg_index },
            side,
            protocol,
            rfq,
            response,
            &mut remaining_accounts,
        )?;
    }

    revert_preparation(
        AssetIdentifier::Quote,
        side,
        protocol,
        rfq,
        response,
        &mut remaining_accounts,
    )?;

    *response.get_prepared_counter_mut(side) = 0;

    Ok(())
}
