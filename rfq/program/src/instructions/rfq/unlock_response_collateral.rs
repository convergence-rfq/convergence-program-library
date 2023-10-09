use crate::{
    common::{transfer_from_escrow_and_close_it, EscrowType},
    errors::ProtocolError,
    seeds::{LEG_ESCROW_SEED, QUOTE_ESCROW_SEED},
    state::{Response, ResponseState, Rfq, StoredResponseState},
};
use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount};

#[derive(Accounts)]
pub struct UnlockResponseCollateralAccounts<'info> {
    /// CHECK: Is actually a taker
    #[account(mut, constraint = taker.key() == rfq.taker @ ProtocolError::NotATaker)]
    pub taker: UncheckedAccount<'info>,

    #[account(mut)]
    pub rfq: Box<Account<'info, Rfq>>,
    #[account(mut, constraint = response.rfq == rfq.key() @ ProtocolError::ResponseForAnotherRfq)]
    pub response: Box<Account<'info, Response>>,

    #[account(mut, constraint = taker_leg_tokens.mint == rfq.leg_asset @ ProtocolError::InvalidTokenAccountMint)]
    pub taker_leg_tokens: Account<'info, TokenAccount>,
    #[account(mut, seeds = [LEG_ESCROW_SEED.as_bytes(), response.key().as_ref()], bump)]
    pub leg_escrow: Account<'info, TokenAccount>,

    #[account(mut, constraint = taker_quote_tokens.mint == rfq.quote_asset @ ProtocolError::InvalidTokenAccountMint)]
    pub taker_quote_tokens: Account<'info, TokenAccount>,
    #[account(mut, seeds = [QUOTE_ESCROW_SEED.as_bytes(), response.key().as_ref()], bump)]
    pub quote_escrow: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

fn validate(ctx: &Context<UnlockResponseCollateralAccounts>) -> Result<()> {
    let UnlockResponseCollateralAccounts { rfq, response, .. } = &ctx.accounts;

    response
        .get_state(rfq)?
        .assert_state_in([ResponseState::ConfirmedExpired])?;

    Ok(())
}

pub fn unlock_response_collateral_instruction(
    ctx: Context<UnlockResponseCollateralAccounts>,
) -> Result<()> {
    validate(&ctx)?;

    let UnlockResponseCollateralAccounts {
        taker,
        response,
        taker_leg_tokens,
        leg_escrow,
        taker_quote_tokens,
        quote_escrow,
        token_program,
        ..
    } = ctx.accounts;

    transfer_from_escrow_and_close_it(
        EscrowType::Leg,
        response,
        leg_escrow,
        *ctx.bumps.get("leg_escrow").unwrap(),
        taker_leg_tokens,
        taker,
        token_program,
    )?;

    transfer_from_escrow_and_close_it(
        EscrowType::Quote,
        response,
        quote_escrow,
        *ctx.bumps.get("quote_escrow").unwrap(),
        taker_quote_tokens,
        taker,
        token_program,
    )?;

    // As response is already expired, the actual state is Expired
    response.state = StoredResponseState::Active;

    Ok(())
}
