use crate::{
    common::transfer_quote_escrow_token,
    constants::{PROTOCOL_SEED, QUOTE_ESCROW_SEED},
    errors::ProtocolError,
    interfaces::instrument::clean_up,
    states::{ProtocolState, Response, ResponseState, Rfq},
};
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::get_associated_token_address,
    token::{close_account, CloseAccount, Token, TokenAccount},
};

#[derive(Accounts)]
pub struct CleanUpResponseAccounts<'info> {
    /// CHECK: is a maker address in this rfq
    #[account(mut, constraint = maker.key() == response.maker @ ProtocolError::NotAMaker)]
    pub maker: UncheckedAccount<'info>,
    /// CHECK: is an authority first to prepare for settlement. If no preparation, it can be any account
    pub first_to_prepare: UncheckedAccount<'info>,

    #[account(seeds = [PROTOCOL_SEED.as_bytes()], bump = protocol.bump)]
    pub protocol: Account<'info, ProtocolState>,
    #[account(mut)]
    pub rfq: Account<'info, Rfq>,
    #[account(mut, close = maker, constraint = response.rfq == rfq.key() @ ProtocolError::ResponseForAnotherRfq)]
    pub response: Account<'info, Response>,

    /// CHECK: can be either a valid escrow account or uninitialized account
    #[account(mut, seeds = [QUOTE_ESCROW_SEED.as_bytes(), response.key().as_ref()], bump)]
    pub quote_escrow: UncheckedAccount<'info>,
    #[account(mut, constraint = quote_backup_tokens.mint == rfq.quote_mint @ ProtocolError::NotAQuoteMint)]
    pub quote_backup_tokens: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

fn validate(ctx: &Context<CleanUpResponseAccounts>) -> Result<()> {
    let CleanUpResponseAccounts {
        protocol,
        rfq,
        response,
        quote_backup_tokens,
        ..
    } = &ctx.accounts;

    let response_state = response.get_state(rfq)?;
    response_state.assert_state_in([
        ResponseState::Canceled,
        ResponseState::Settled,
        ResponseState::Defaulted,
        ResponseState::Expired,
    ])?;
    if let ResponseState::Defaulted = response_state {
        require!(
            !response.taker_prepared_to_settle && !response.maker_prepared_to_settle,
            ProtocolError::PendingPreparations
        );
    }

    require!(
        !response.have_locked_collateral(),
        ProtocolError::HaveCollateralLocked
    );

    require!(
        get_associated_token_address(&protocol.authority, &rfq.quote_mint)
            == quote_backup_tokens.key(),
        ProtocolError::InvalidBackupAddress
    );

    Ok(())
}

pub fn clean_up_response_instruction<'info>(
    ctx: Context<'_, '_, '_, 'info, CleanUpResponseAccounts<'info>>,
) -> Result<()> {
    validate(&ctx)?;

    let CleanUpResponseAccounts {
        first_to_prepare,
        protocol,
        rfq,
        response,
        quote_escrow,
        quote_backup_tokens,
        token_program,
        ..
    } = ctx.accounts;

    if response.first_to_prepare.is_some() {
        let quote_escrow: Account<TokenAccount> = Account::try_from(quote_escrow)?;

        let expected_first_to_prepare = response
            .first_to_prepare
            .unwrap()
            .to_public_key(rfq, response);
        require!(
            first_to_prepare.key() == expected_first_to_prepare,
            ProtocolError::NotFirstToPrepare
        );

        transfer_quote_escrow_token(
            &quote_escrow,
            quote_backup_tokens,
            response.key(),
            *ctx.bumps.get("quote_escrow").unwrap(),
            token_program,
        )?;

        close_quote_escrow_account(
            &quote_escrow,
            first_to_prepare,
            response.key(),
            *ctx.bumps.get("quote_escrow").unwrap(),
            token_program,
        )?;

        let mut remaining_accounts = ctx.remaining_accounts.iter();

        for (index, leg) in rfq.legs.iter().enumerate() {
            clean_up(
                leg,
                index as u8,
                &protocol,
                rfq,
                response,
                &mut remaining_accounts,
            )?;
        }
    }

    rfq.cleared_responses += 1;

    Ok(())
}

fn close_quote_escrow_account<'info>(
    quote_escrow: &Account<'info, TokenAccount>,
    sol_receiver: &UncheckedAccount<'info>,
    response: Pubkey,
    bump: u8,
    token_program: &Program<'info, Token>,
) -> Result<()> {
    let close_tokens_account = CloseAccount {
        account: quote_escrow.to_account_info(),
        destination: sol_receiver.to_account_info(),
        authority: quote_escrow.to_account_info(),
    };

    let response_key = response.key();
    let bump_seed = [bump];
    let escrow_seed = &[&[
        QUOTE_ESCROW_SEED.as_bytes(),
        response_key.as_ref(),
        &bump_seed,
    ][..]];

    let close_escrow_account_ctx = CpiContext::new_with_signer(
        token_program.to_account_info(),
        close_tokens_account,
        escrow_seed,
    );

    close_account(close_escrow_account_ctx)
}
