use crate::{
    common::transfer_quote_escrow_token,
    constants::{PROTOCOL_SEED, QUOTE_ESCROW_SEED},
    errors::ProtocolError,
    interfaces::instrument::revert_preparation,
    state::{AuthoritySide, ProtocolState, Response, ResponseState, Rfq, StoredResponseState},
};
use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount};

#[derive(Accounts)]
pub struct RevertSettlementPreparationAccounts<'info> {
    #[account(seeds = [PROTOCOL_SEED.as_bytes()], bump = protocol.bump)]
    pub protocol: Account<'info, ProtocolState>,
    pub rfq: Box<Account<'info, Rfq>>,
    #[account(mut, constraint = response.rfq == rfq.key() @ ProtocolError::ResponseForAnotherRfq)]
    pub response: Account<'info, Response>,

    #[account(mut, constraint = quote_tokens.mint == quote_escrow.mint @ ProtocolError::NotAQuoteMint)]
    pub quote_tokens: Account<'info, TokenAccount>,
    #[account(mut, seeds = [QUOTE_ESCROW_SEED.as_bytes(), response.key().as_ref()], bump)]
    pub quote_escrow: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

fn validate(ctx: &Context<RevertSettlementPreparationAccounts>, side: AuthoritySide) -> Result<()> {
    let RevertSettlementPreparationAccounts {
        rfq,
        response,
        quote_tokens,
        ..
    } = &ctx.accounts;

    response
        .get_state(rfq)?
        .assert_state_in([ResponseState::Defaulted])?;

    require!(
        response.get_prepared_legs(side) > 0,
        ProtocolError::NoPreparationToRevert
    );

    side.validate_is_associated_token_account(rfq, response, rfq.quote_mint, quote_tokens.key())?;

    Ok(())
}

pub fn revert_settlement_preparation_instruction<'info>(
    ctx: Context<'_, '_, '_, 'info, RevertSettlementPreparationAccounts<'info>>,
    side: AuthoritySide,
) -> Result<()> {
    validate(&ctx, side)?;

    let RevertSettlementPreparationAccounts {
        protocol,
        rfq,
        response,
        quote_tokens,
        quote_escrow,
        token_program,
        ..
    } = ctx.accounts;

    if response.state != StoredResponseState::Defaulted {
        response.default_by_time(rfq);
        response.exit(ctx.program_id)?;
    }

    let prepared_legs = response.get_prepared_legs(side);
    let mut remaining_accounts = ctx.remaining_accounts.iter();
    for (index, leg) in rfq.legs[0..prepared_legs as usize].iter().enumerate() {
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

    // if quote tokens sender, send tokens back
    if side == response.get_quote_tokens_receiver(rfq).revert() {
        transfer_quote_escrow_token(
            quote_escrow,
            quote_tokens,
            response.key(),
            *ctx.bumps.get("quote_escrow").unwrap(),
            token_program,
        )?;
    }

    *response.get_prepared_legs_mut(side) = 0;

    Ok(())
}
