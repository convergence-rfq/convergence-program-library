use crate::{
    common::{transfer_collateral_token, unlock_response_collateral},
    errors::ProtocolError,
    seeds::{COLLATERAL_SEED, COLLATERAL_TOKEN_SEED, PROTOCOL_SEED},
    state::{AuthoritySide, CollateralInfo, ProtocolState, Response, ResponseState, Rfq},
};
use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount};

#[derive(Accounts)]
pub struct UnlockResponseCollateralAccounts<'info> {
    #[account(seeds = [PROTOCOL_SEED.as_bytes()], bump = protocol.bump)]
    pub protocol: Box<Account<'info, ProtocolState>>,
    #[account(mut)]
    pub rfq: Box<Account<'info, Rfq>>,
    #[account(mut, constraint = response.rfq == rfq.key() @ ProtocolError::ResponseForAnotherRfq)]
    pub response: Box<Account<'info, Response>>,

    #[account(mut, seeds = [COLLATERAL_SEED.as_bytes(), rfq.taker.key().as_ref()],
                bump = taker_collateral_info.bump)]
    pub taker_collateral_info: Box<Account<'info, CollateralInfo>>,
    #[account(mut, seeds = [COLLATERAL_SEED.as_bytes(), response.maker.as_ref()],
                bump = maker_collateral_info.bump)]
    pub maker_collateral_info: Box<Account<'info, CollateralInfo>>,
    #[account(mut, seeds = [COLLATERAL_TOKEN_SEED.as_bytes(), rfq.taker.as_ref()],
                bump = taker_collateral_info.token_account_bump)]
    pub taker_collateral_tokens: Account<'info, TokenAccount>,
    #[account(mut, seeds = [COLLATERAL_TOKEN_SEED.as_bytes(), response.maker.as_ref()], bump = maker_collateral_info.token_account_bump)]
    pub maker_collateral_tokens: Account<'info, TokenAccount>,
    #[account(mut, seeds = [COLLATERAL_TOKEN_SEED.as_bytes(), protocol.authority.as_ref()],
                bump)]
    pub protocol_collateral_tokens: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

fn validate(ctx: &Context<UnlockResponseCollateralAccounts>) -> Result<()> {
    let UnlockResponseCollateralAccounts { rfq, response, .. } = &ctx.accounts;

    response.get_state(rfq)?.assert_state_in([
        ResponseState::Canceled,
        ResponseState::Expired,
        ResponseState::Settled,
        ResponseState::SettlementExpired,
    ])?;

    require!(
        response.have_locked_collateral(),
        ProtocolError::NoCollateralLocked
    );

    Ok(())
}

pub fn unlock_response_collateral_instruction(
    ctx: Context<UnlockResponseCollateralAccounts>,
) -> Result<()> {
    validate(&ctx)?;

    let UnlockResponseCollateralAccounts {
        protocol,
        rfq,
        response,
        taker_collateral_info,
        maker_collateral_info,
        taker_collateral_tokens,
        maker_collateral_tokens,
        protocol_collateral_tokens,
        token_program,
        ..
    } = ctx.accounts;

    // if successfully settled than collect fees
    if response.get_state(rfq)? == ResponseState::Settled {
        let fee_params = protocol.settle_fees;

        let taker_fees =
            fee_params.calculate_fees(response.taker_collateral_locked, AuthoritySide::Taker);
        transfer_collateral_token(
            taker_fees,
            taker_collateral_tokens,
            protocol_collateral_tokens,
            &taker_collateral_info.clone(),
            token_program,
        )?;

        let maker_fees =
            fee_params.calculate_fees(response.maker_collateral_locked, AuthoritySide::Maker);
        transfer_collateral_token(
            maker_fees,
            maker_collateral_tokens,
            protocol_collateral_tokens,
            &maker_collateral_info.clone(),
            token_program,
        )?;
    }

    unlock_response_collateral(rfq, response, taker_collateral_info, maker_collateral_info);

    Ok(())
}
