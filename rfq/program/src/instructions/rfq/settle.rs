use crate::{
    common::transfer_quote_escrow_token,
    constants::{PROTOCOL_SEED, QUOTE_ESCROW_SEED},
    errors::ProtocolError,
    interfaces::instrument::settle,
    state::{ProtocolState, Response, ResponseState, Rfq, StoredResponseState},
};
use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount};

#[derive(Accounts)]
pub struct SettleAccounts<'info> {
    #[account(seeds = [PROTOCOL_SEED.as_bytes()], bump = protocol.bump)]
    pub protocol: Account<'info, ProtocolState>,
    pub rfq: Box<Account<'info, Rfq>>,
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

    let SettleAccounts {
        protocol,
        rfq,
        response,
        quote_escrow,
        quote_receiver_tokens,
        token_program,
        ..
    } = ctx.accounts;
    let mut remaining_accounts = ctx.remaining_accounts.iter();

    transfer_quote_escrow_token(
        quote_escrow,
        quote_receiver_tokens,
        response.key(),
        *ctx.bumps.get("quote_escrow").unwrap(),
        token_program,
    )?;

    for (index, leg) in rfq
        .legs
        .iter()
        .enumerate()
        .skip(response.settled_legs as usize)
    {
        settle(
            leg,
            index as u8,
            &protocol,
            rfq,
            response,
            &mut remaining_accounts,
        )?;
    }

    response.settled_legs = rfq.legs.len() as u8;
    response.state = StoredResponseState::Settled;

    Ok(())
}
