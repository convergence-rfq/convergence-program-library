use crate::{
    common::{transfer_from_escrow_and_close_it, EscrowType},
    errors::ProtocolError,
    seeds::{LEG_ESCROW_SEED, QUOTE_ESCROW_SEED},
    state::{AuthoritySide, Response, ResponseState, Rfq, StoredResponseState},
};
use anchor_lang::prelude::*;
use anchor_spl::token::{transfer, Token, TokenAccount, Transfer};

#[derive(Accounts)]
pub struct SettleAccounts<'info> {
    #[account(mut, constraint = maker.key() == response.maker @ ProtocolError::NotAMaker)]
    pub maker: Signer<'info>,
    /// CHECK: Is actually a taker
    #[account(mut, constraint = taker.key() == rfq.taker @ ProtocolError::NotATaker)]
    pub taker: UncheckedAccount<'info>,

    #[account(mut)]
    pub rfq: Box<Account<'info, Rfq>>,
    #[account(mut, close = maker, constraint = response.rfq == rfq.key() @ ProtocolError::ResponseForAnotherRfq)]
    pub response: Box<Account<'info, Response>>,

    #[account(mut, constraint = taker_leg_tokens.mint == rfq.leg_asset @ ProtocolError::InvalidTokenAccountMint)]
    pub taker_leg_tokens: Box<Account<'info, TokenAccount>>,
    #[account(mut, constraint = maker_leg_tokens.mint == rfq.leg_asset @ ProtocolError::InvalidTokenAccountMint)]
    pub maker_leg_tokens: Account<'info, TokenAccount>,
    #[account(mut, seeds = [LEG_ESCROW_SEED.as_bytes(), response.key().as_ref()], bump)]
    pub leg_escrow: Account<'info, TokenAccount>,

    #[account(mut, constraint = taker_quote_tokens.mint == rfq.quote_asset @ ProtocolError::InvalidTokenAccountMint)]
    pub taker_quote_tokens: Account<'info, TokenAccount>,
    #[account(mut, constraint = maker_quote_tokens.mint == rfq.quote_asset @ ProtocolError::InvalidTokenAccountMint)]
    pub maker_quote_tokens: Account<'info, TokenAccount>,
    #[account(mut, seeds = [QUOTE_ESCROW_SEED.as_bytes(), response.key().as_ref()], bump)]
    pub quote_escrow: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

fn validate(ctx: &Context<SettleAccounts>) -> Result<()> {
    let SettleAccounts {
        rfq,
        response,
        taker_leg_tokens,
        taker_quote_tokens,
        ..
    } = &ctx.accounts;

    response
        .get_state(rfq)?
        .assert_state_in([ResponseState::Confirmed])?;

    AuthoritySide::Taker.validate_is_associated_token_account(
        rfq,
        response,
        rfq.leg_asset,
        taker_leg_tokens.key(),
    )?;

    AuthoritySide::Taker.validate_is_associated_token_account(
        rfq,
        response,
        rfq.quote_asset,
        taker_quote_tokens.key(),
    )?;

    Ok(())
}

pub fn settle_instruction<'info>(
    ctx: Context<'_, '_, '_, 'info, SettleAccounts<'info>>,
) -> Result<()> {
    validate(&ctx)?;

    send_leg_asset(ctx.accounts)?;
    send_quote_asset(ctx.accounts)?;

    let SettleAccounts {
        taker,
        rfq,
        response,
        maker_leg_tokens,
        leg_escrow,
        maker_quote_tokens,
        quote_escrow,
        token_program,
        ..
    } = ctx.accounts;

    transfer_from_escrow_and_close_it(
        EscrowType::Leg,
        response,
        leg_escrow,
        *ctx.bumps.get("leg_escrow").unwrap(),
        maker_leg_tokens,
        taker,
        token_program,
    )?;
    transfer_from_escrow_and_close_it(
        EscrowType::Quote,
        response,
        quote_escrow,
        *ctx.bumps.get("quote_escrow").unwrap(),
        maker_quote_tokens,
        taker,
        token_program,
    )?;

    response.state = StoredResponseState::Settled;
    rfq.settled_responses += 1;

    Ok(())
}

fn send_leg_asset(accs: &SettleAccounts) -> Result<()> {
    let SettleAccounts {
        maker,
        rfq,
        response,
        maker_leg_tokens,
        taker_leg_tokens,
        token_program,
        ..
    } = accs;

    if response.get_leg_asset_receiver() == AuthoritySide::Maker {
        return Ok(());
    }

    let token_amount = response.get_leg_amount_to_transfer(rfq);
    let transfer_accounts = Transfer {
        from: maker_leg_tokens.to_account_info(),
        to: taker_leg_tokens.to_account_info(),
        authority: maker.to_account_info(),
    };
    let transfer_ctx = CpiContext::new(token_program.to_account_info(), transfer_accounts);
    transfer(transfer_ctx, token_amount)
}

fn send_quote_asset(accs: &SettleAccounts) -> Result<()> {
    let SettleAccounts {
        taker,
        rfq,
        response,
        maker_quote_tokens,
        taker_quote_tokens,
        token_program,
        ..
    } = accs;

    if response.get_quote_asset_receiver() == AuthoritySide::Taker {
        return Ok(());
    };

    let token_amount = response.get_quote_amount_to_transfer(rfq);
    let transfer_accounts = Transfer {
        from: maker_quote_tokens.to_account_info(),
        to: taker_quote_tokens.to_account_info(),
        authority: taker.to_account_info(),
    };
    let transfer_ctx = CpiContext::new(token_program.to_account_info(), transfer_accounts);
    transfer(transfer_ctx, token_amount)
}
