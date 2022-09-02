use crate::{
    constants::{PROTOCOL_SEED, QUOTE_ESCROW_SEED},
    errors::ProtocolError,
    interfaces::instrument::revert_preparation,
    states::{AuthoritySide, ProtocolState, Response, ResponseState, Rfq, StoredResponseState},
};
use anchor_lang::prelude::*;
use anchor_spl::token::{transfer, Token, TokenAccount, Transfer};

#[derive(Accounts)]
pub struct RevertPreparationAccounts<'info> {
    #[account(seeds = [PROTOCOL_SEED.as_bytes()], bump = protocol.bump)]
    pub protocol: Account<'info, ProtocolState>,
    pub rfq: Account<'info, Rfq>,
    #[account(mut, constraint = response.rfq == rfq.key() @ ProtocolError::ResponseForAnotherRfq)]
    pub response: Account<'info, Response>,

    #[account(mut, constraint = quote_tokens.mint == quote_escrow.mint @ ProtocolError::NotAQuoteMint)]
    pub quote_tokens: Account<'info, TokenAccount>,
    #[account(mut, seeds = [QUOTE_ESCROW_SEED.as_bytes(), response.key().as_ref()], bump)]
    pub quote_escrow: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

fn validate(ctx: &Context<RevertPreparationAccounts>, side: AuthoritySide) -> Result<()> {
    let RevertPreparationAccounts {
        rfq,
        response,
        quote_tokens,
        ..
    } = &ctx.accounts;

    response
        .get_state(rfq)?
        .assert_state_in([ResponseState::Defaulted])?;

    match side {
        AuthoritySide::Taker => require!(
            response.taker_prepared_to_settle,
            ProtocolError::NoPreparationToRevert
        ),
        AuthoritySide::Maker => require!(
            response.maker_prepared_to_settle,
            ProtocolError::NoPreparationToRevert
        ),
    }

    side.validate_is_associated_token_account(rfq, response, rfq.quote_mint, quote_tokens.key())?;

    Ok(())
}

pub fn revert_preparation_instruction<'info>(
    ctx: Context<'_, '_, '_, 'info, RevertPreparationAccounts<'info>>,
    side: AuthoritySide,
) -> Result<()> {
    validate(&ctx, side)?;

    let RevertPreparationAccounts {
        protocol,
        rfq,
        response,
        quote_tokens,
        quote_escrow,
        token_program,
        ..
    } = ctx.accounts;

    if response.state != StoredResponseState::Defaulted {
        response.default_by_time();
        response.exit(ctx.program_id)?;
    }

    let mut remaining_accounts = ctx.remaining_accounts.iter();
    for (index, leg) in rfq.legs.iter().enumerate() {
        revert_preparation(leg, index as u8, side, &protocol, &mut remaining_accounts)?;
    }

    // if quote tokens sender, send tokens back
    if side == response.get_quote_tokens_receiver(rfq).revert() {
        let quote_amount = quote_escrow.amount;
        let transfer_accounts = Transfer {
            from: quote_escrow.to_account_info(),
            to: quote_tokens.to_account_info(),
            authority: quote_escrow.to_account_info(),
        };
        let response_key = response.key();
        let bump_seed = [*ctx.bumps.get("quote_escrow").unwrap()];
        let transfer_seed = &[&[
            QUOTE_ESCROW_SEED.as_bytes(),
            response_key.as_ref(),
            &bump_seed,
        ][..]];
        let transfer_ctx = CpiContext::new_with_signer(
            token_program.to_account_info(),
            transfer_accounts,
            transfer_seed,
        );
        transfer(transfer_ctx, quote_amount)?;
    }

    match side {
        AuthoritySide::Taker => response.taker_prepared_to_settle = false,
        AuthoritySide::Maker => response.maker_prepared_to_settle = false,
    }

    Ok(())
}
