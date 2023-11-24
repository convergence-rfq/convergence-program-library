use crate::{
    common::{transfer_collateral_token, unlock_response_collateral},
    errors::ProtocolError,
    seeds::{COLLATERAL_SEED, COLLATERAL_TOKEN_SEED, PROTOCOL_SEED},
    state::{
        AuthoritySide, CollateralInfo, DefaultingParty, ProtocolState, Response, ResponseState,
        Rfq, StoredResponseState,
    },
};
use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount};

#[derive(Accounts)]
pub struct SettleOnePartyDefaultAccounts<'info> {
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
    #[account(mut, seeds = [COLLATERAL_TOKEN_SEED.as_bytes(), response.maker.as_ref()],
                bump = maker_collateral_info.token_account_bump)]
    pub maker_collateral_tokens: Account<'info, TokenAccount>,
    #[account(mut, seeds = [COLLATERAL_TOKEN_SEED.as_bytes(), protocol.authority.as_ref()],
                bump)]
    pub protocol_collateral_tokens: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

fn validate(ctx: &Context<SettleOnePartyDefaultAccounts>) -> Result<()> {
    let SettleOnePartyDefaultAccounts { rfq, response, .. } = &ctx.accounts;

    response
        .get_state(rfq)?
        .assert_state_in([ResponseState::Defaulted])?;

    require!(
        response.have_locked_collateral(),
        ProtocolError::NoCollateralLocked
    );

    Ok(())
}

pub fn settle_one_party_default_instruction(
    ctx: Context<SettleOnePartyDefaultAccounts>,
) -> Result<()> {
    validate(&ctx)?;

    let SettleOnePartyDefaultAccounts {
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

    if response.state != StoredResponseState::Defaulted {
        response.default_by_time(rfq);
        response.exit(ctx.program_id)?;
    }

    require!(
        matches!(
            response.defaulting_party.unwrap(),
            DefaultingParty::Maker | DefaultingParty::Taker
        ),
        ProtocolError::InvalidDefaultingParty
    );

    let fees_params = protocol.default_fees;
    let taker_fees =
        fees_params.calculate_fees(response.taker_collateral_locked, AuthoritySide::Taker);
    let maker_fees =
        fees_params.calculate_fees(response.maker_collateral_locked, AuthoritySide::Maker);
    let total_fees = taker_fees + maker_fees;
    match response.defaulting_party.unwrap() {
        DefaultingParty::Taker => {
            // transfer collateral from the taker to the maker
            transfer_collateral_token(
                response.taker_collateral_locked,
                taker_collateral_tokens,
                maker_collateral_tokens,
                &taker_collateral_info.clone(),
                token_program,
            )?;

            // collect fees
            transfer_collateral_token(
                total_fees,
                maker_collateral_tokens,
                protocol_collateral_tokens,
                &maker_collateral_info.clone(),
                token_program,
            )?;
        }
        DefaultingParty::Maker => {
            // transfer collateral from the maker to the taker
            transfer_collateral_token(
                response.maker_collateral_locked,
                maker_collateral_tokens,
                taker_collateral_tokens,
                &maker_collateral_info.clone(),
                token_program,
            )?;

            // collect fees
            transfer_collateral_token(
                total_fees,
                taker_collateral_tokens,
                protocol_collateral_tokens,
                &taker_collateral_info.clone(),
                token_program,
            )?;
        }
        _ => unreachable!(),
    };

    unlock_response_collateral(rfq, response, taker_collateral_info, maker_collateral_info);

    Ok(())
}
