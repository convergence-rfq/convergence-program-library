use crate::{
    common::{transfer_collateral_token, unlock_response_collateral},
    constants::{COLLATERAL_SEED, COLLATERAL_TOKEN_SEED, PROTOCOL_SEED},
    errors::ProtocolError,
    states::{
        CollateralInfo, DefaultingParty, ProtocolState, Response, ResponseState, Rfq,
        StoredResponseState,
    },
};
use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount};

#[derive(Accounts)]
pub struct SettleOnePartyDefaultCollateralAccounts<'info> {
    #[account(seeds = [PROTOCOL_SEED.as_bytes()], bump = protocol.bump)]
    pub protocol: Account<'info, ProtocolState>,
    #[account(mut)]
    pub rfq: Account<'info, Rfq>,
    #[account(mut, constraint = response.rfq == rfq.key() @ ProtocolError::ResponseForAnotherRfq)]
    pub response: Box<Account<'info, Response>>,

    #[account(mut, seeds = [COLLATERAL_SEED.as_bytes(), rfq.taker.key().as_ref()],
                bump = taker_collateral_info.bump)]
    pub taker_collateral_info: Account<'info, CollateralInfo>,
    #[account(mut, seeds = [COLLATERAL_SEED.as_bytes(), response.maker.as_ref()],
                bump = maker_collateral_info.bump)]
    pub maker_collateral_info: Account<'info, CollateralInfo>,
    #[account(mut, seeds = [COLLATERAL_TOKEN_SEED.as_bytes(), rfq.taker.as_ref()],
                bump = taker_collateral_info.token_account_bump)]
    pub taker_collateral_tokens: Account<'info, TokenAccount>,
    #[account(mut, seeds = [COLLATERAL_TOKEN_SEED.as_bytes(), response.maker.as_ref()],
                bump = maker_collateral_info.token_account_bump)]
    pub maker_collateral_tokens: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

fn validate(ctx: &Context<SettleOnePartyDefaultCollateralAccounts>) -> Result<()> {
    let SettleOnePartyDefaultCollateralAccounts { rfq, response, .. } = &ctx.accounts;

    response
        .get_state(rfq)?
        .assert_state_in([ResponseState::Defaulted])?;

    require!(
        response.have_locked_collateral(),
        ProtocolError::NoCollateralLocked
    );

    require!(
        matches!(
            response.defaulting_party.unwrap(),
            DefaultingParty::Maker | DefaultingParty::Taker
        ),
        ProtocolError::InvalidDefaultingParty
    );

    Ok(())
}

pub fn settle_one_party_default_collateral_instruction(
    ctx: Context<SettleOnePartyDefaultCollateralAccounts>,
) -> Result<()> {
    let response = &mut ctx.accounts.response;
    if response.state != StoredResponseState::Defaulted {
        response.default_by_time();
        response.exit(ctx.program_id)?;
    }

    validate(&ctx)?;

    let SettleOnePartyDefaultCollateralAccounts {
        rfq,
        response,
        taker_collateral_info,
        maker_collateral_info,
        taker_collateral_tokens,
        maker_collateral_tokens,
        token_program,
        ..
    } = ctx.accounts;

    match response.defaulting_party.unwrap() {
        DefaultingParty::Taker => transfer_collateral_token(
            response.taker_collateral_locked,
            taker_collateral_tokens,
            maker_collateral_tokens,
            &taker_collateral_info.clone(),
            token_program,
        ),
        DefaultingParty::Maker => transfer_collateral_token(
            response.maker_collateral_locked,
            maker_collateral_tokens,
            taker_collateral_tokens,
            &maker_collateral_info.clone(),
            token_program,
        ),
        _ => unreachable!(),
    }?;

    unlock_response_collateral(rfq, response, taker_collateral_info, maker_collateral_info);

    Ok(())
}
