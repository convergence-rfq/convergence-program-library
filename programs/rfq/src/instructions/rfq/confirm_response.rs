use crate::{
    constants::{COLLATERAL_SEED, PROTOCOL_SEED},
    errors::ProtocolError,
    interfaces::risk_engine::calculate_required_collateral_for_confirmation,
    states::{
        CollateralInfo, ProtocolState, Response, ResponseState, Rfq, RfqState, Side,
        StoredResponseState,
    },
};
use anchor_lang::prelude::*;
use anchor_spl::token::TokenAccount;

#[derive(Accounts)]
pub struct ConfirmResponseAccounts<'info> {
    #[account(constraint = taker.key() == rfq.taker @ ProtocolError::NotATaker)]
    pub taker: Signer<'info>,

    #[account(seeds = [PROTOCOL_SEED.as_bytes()], bump = protocol.bump)]
    pub protocol: Account<'info, ProtocolState>,
    #[account(mut)]
    pub rfq: Account<'info, Rfq>,
    #[account(mut, constraint = response.rfq == rfq.key() @ ProtocolError::ResponseForAnotherRfq)]
    pub response: Account<'info, Response>,
    #[account(mut, seeds = [COLLATERAL_SEED.as_bytes(), taker.key().as_ref()],
                bump = collateral_info.bump)]
    pub collateral_info: Account<'info, CollateralInfo>,
    #[account(seeds = [COLLATERAL_SEED.as_bytes(), taker.key().as_ref()],
                bump = collateral_info.token_account_bump)]
    pub collateral_token: Account<'info, TokenAccount>,

    #[account(constraint = risk_engine.key() == protocol.risk_engine
        @ ProtocolError::NotARiskEngine)]
    pub risk_engine: AccountInfo<'info>,
}

fn validate(ctx: &Context<ConfirmResponseAccounts>, side: Side) -> Result<()> {
    let ConfirmResponseAccounts { rfq, response, .. } = &ctx.accounts;

    require!(
        rfq.get_state()? == RfqState::Active,
        ProtocolError::RfqIsNotActive
    );
    require!(
        response.get_state(rfq)? == ResponseState::Active,
        ProtocolError::ResponseIsNotActive
    );

    match side {
        Side::Bid => require!(response.bid.is_some(), ProtocolError::ConfirmedSideMissing),
        Side::Ask => require!(response.ask.is_some(), ProtocolError::ConfirmedSideMissing),
    }

    Ok(())
}

pub fn confirm_response_instruction(
    ctx: Context<ConfirmResponseAccounts>,
    side: Side,
) -> Result<()> {
    validate(&ctx, side)?;

    let ConfirmResponseAccounts {
        rfq,
        response,
        collateral_info,
        collateral_token,
        risk_engine,
        ..
    } = ctx.accounts;

    let required_collateral = calculate_required_collateral_for_confirmation(
        &rfq.to_account_info(),
        &risk_engine.to_account_info(),
        risk_engine,
        &side,
    )?;
    let collateral_taken_from_already_deposited = u64::min(
        required_collateral,
        rfq.non_response_taker_collateral_locked,
    );
    let locked_collateral = required_collateral - collateral_taken_from_already_deposited;
    rfq.non_response_taker_collateral_locked -= collateral_taken_from_already_deposited;
    response.taker_collateral_locked = required_collateral;
    if locked_collateral > 0 {
        collateral_info.lock_collateral(collateral_token, required_collateral)?;
    }

    response.state = StoredResponseState::SettlingPreparations;

    Ok(())
}
