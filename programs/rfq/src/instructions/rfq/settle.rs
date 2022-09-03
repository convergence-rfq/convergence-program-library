use crate::{
    constants::{PROTOCOL_SEED, QUOTE_ESCROW_SEED},
    errors::ProtocolError,
    interfaces::instrument::settle,
    states::{ProtocolState, Response, ResponseState, Rfq, StoredResponseState},
};
use anchor_lang::prelude::*;
use anchor_spl::token::{transfer, Token, TokenAccount, Transfer};

#[derive(Accounts)]
pub struct SettleAccounts<'info> {
    #[account(seeds = [PROTOCOL_SEED.as_bytes()], bump = protocol.bump)]
    pub protocol: Account<'info, ProtocolState>,
    pub rfq: Account<'info, Rfq>,
    #[account(mut, constraint = response.rfq == rfq.key() @ ProtocolError::ResponseForAnotherRfq)]
    pub response: Account<'info, Response>,

    #[account(mut, constraint = quote_receiver_tokens.mint == quote_escrow.mint @ ProtocolError::NotAQuoteMint)]
    pub quote_receiver_tokens: Account<'info, TokenAccount>,
    #[account(mut, seeds = [QUOTE_ESCROW_SEED.as_bytes(), response.key().as_ref()], bump)]
    pub quote_escrow: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

fn validate(ctx: &Context<SettleAccounts>) -> Result<()> {
    let SettleAccounts {
        rfq,
        response,
        quote_receiver_tokens,
        ..
    } = &ctx.accounts;

    response
        .get_state(rfq)?
        .assert_state_in([ResponseState::ReadyForSettling])?;

    response
        .get_quote_tokens_receiver(rfq)
        .validate_is_associated_token_account(
            rfq,
            response,
            rfq.quote_mint,
            quote_receiver_tokens.key(),
        )?;

    Ok(())
}

pub fn settle_instruction<'info>(
    ctx: Context<'_, '_, '_, 'info, SettleAccounts<'info>>,
) -> Result<()> {
    validate(&ctx)?;

    settle_quote_asset(&ctx)?;

    let SettleAccounts {
        protocol,
        rfq,
        response,
        ..
    } = ctx.accounts;
    let mut remaining_accounts = ctx.remaining_accounts.iter();

    for (index, leg) in rfq.legs.iter().enumerate() {
        settle(leg, index as u8, &protocol, &mut remaining_accounts)?;
    }

    response.state = StoredResponseState::Settled;

    Ok(())
}

fn settle_quote_asset(ctx: &Context<SettleAccounts>) -> Result<()> {
    let SettleAccounts {
        response,
        quote_escrow,
        quote_receiver_tokens,
        token_program,
        ..
    } = &ctx.accounts;

    let quote_amount = quote_escrow.amount;
    let transfer_accounts = Transfer {
        from: quote_escrow.to_account_info(),
        to: quote_receiver_tokens.to_account_info(),
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

    Ok(())
}
