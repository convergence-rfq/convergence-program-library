use crate::{
    errors::ProtocolError,
    seeds::{LEG_ESCROW_SEED, QUOTE_ESCROW_SEED},
    state::{
        AuthoritySide, Confirmation, Quote, QuoteSide, Response, ResponseState, Rfq, RfqState,
        StoredResponseState,
    },
};
use anchor_lang::prelude::*;
use anchor_spl::token::{transfer, Mint, Token, TokenAccount, Transfer};

#[derive(Accounts)]
pub struct ConfirmResponseAccounts<'info> {
    #[account(mut, constraint = taker.key() == rfq.taker @ ProtocolError::NotATaker)]
    pub taker: Signer<'info>,

    pub rfq: Box<Account<'info, Rfq>>,
    #[account(mut, constraint = response.rfq == rfq.key() @ ProtocolError::ResponseForAnotherRfq)]
    pub response: Box<Account<'info, Response>>,

    #[account(mut, constraint = leg_tokens.mint == leg_mint.key() @ ProtocolError::InvalidTokenAccountMint)]
    pub leg_tokens: Box<Account<'info, TokenAccount>>,
    #[account(init, payer = taker, token::mint = leg_mint, token::authority = leg_escrow,
        seeds = [LEG_ESCROW_SEED.as_bytes(), response.key().as_ref()], bump)]
    pub leg_escrow: Account<'info, TokenAccount>,
    #[account(constraint = leg_mint.key() == rfq.leg_asset @ ProtocolError::InvalidLegMint)]
    pub leg_mint: Account<'info, Mint>,

    #[account(mut, constraint = quote_tokens.mint == quote_mint.key() @ ProtocolError::InvalidTokenAccountMint)]
    pub quote_tokens: Account<'info, TokenAccount>,
    #[account(init, payer = taker, token::mint = quote_mint, token::authority = quote_escrow,
        seeds = [QUOTE_ESCROW_SEED.as_bytes(), response.key().as_ref()], bump)]
    pub quote_escrow: Account<'info, TokenAccount>,
    #[account(constraint = quote_mint.key() == rfq.quote_asset @ ProtocolError::InvalidQuoteMint)]
    pub quote_mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

fn validate(
    ctx: &Context<ConfirmResponseAccounts>,
    side: QuoteSide,
    override_leg_amount: Option<u64>,
) -> Result<()> {
    let ConfirmResponseAccounts { rfq, response, .. } = &ctx.accounts;

    require!(
        rfq.get_state()? == RfqState::Active,
        ProtocolError::RfqIsNotInRequiredState
    );
    response
        .get_state(rfq)?
        .assert_state_in([ResponseState::Active])?;

    match side {
        QuoteSide::Bid => require!(response.bid.is_some(), ProtocolError::ConfirmedSideMissing),
        QuoteSide::Ask => require!(response.ask.is_some(), ProtocolError::ConfirmedSideMissing),
    }

    if rfq.is_fixed_size() {
        require!(
            override_leg_amount.is_none(),
            ProtocolError::NoLegMultiplierForFixedSize
        );
    }

    // make sure new leg multiplier is not bigger than provided
    if let Some(override_leg_amount) = override_leg_amount {
        let quote: Quote = match side {
            QuoteSide::Bid => response.bid.unwrap(),
            QuoteSide::Ask => response.ask.unwrap(),
        };

        match quote {
            Quote::Standard {
                price_quote: _,
                leg_amount,
            } => {
                require!(
                    override_leg_amount <= leg_amount,
                    ProtocolError::LegMultiplierHigherThanInQuote
                );
            }
            _ => unreachable!(),
        }
    }

    Ok(())
}

pub fn confirm_response_instruction<'info>(
    ctx: Context<'_, '_, '_, 'info, ConfirmResponseAccounts<'info>>,
    side: QuoteSide,
    override_leg_amount: Option<u64>,
) -> Result<()> {
    validate(&ctx, side, override_leg_amount)?;

    let ConfirmResponseAccounts { response, .. } = ctx.accounts;

    response.confirmed = Some(Confirmation {
        side,
        override_leg_amount,
    });
    response.state = StoredResponseState::Confirmed;

    deposit_leg_asset(ctx.accounts)?;
    deposit_quote_asset(ctx.accounts)?;

    Ok(())
}

fn deposit_leg_asset(accs: &ConfirmResponseAccounts) -> Result<()> {
    let ConfirmResponseAccounts {
        taker,
        rfq,
        response,
        leg_tokens,
        leg_escrow,
        token_program,
        ..
    } = accs;

    if response.get_leg_asset_receiver() == AuthoritySide::Taker {
        return Ok(());
    }

    let token_amount = response.get_leg_amount_to_transfer(rfq);
    let transfer_accounts = Transfer {
        from: leg_tokens.to_account_info(),
        to: leg_escrow.to_account_info(),
        authority: taker.to_account_info(),
    };
    let transfer_ctx = CpiContext::new(token_program.to_account_info(), transfer_accounts);
    transfer(transfer_ctx, token_amount)
}

fn deposit_quote_asset(accs: &ConfirmResponseAccounts) -> Result<()> {
    let ConfirmResponseAccounts {
        taker,
        rfq,
        response,
        quote_tokens,
        quote_escrow,
        token_program,
        ..
    } = accs;

    if response.get_quote_asset_receiver() == AuthoritySide::Taker {
        return Ok(());
    };

    let token_amount = response.get_quote_amount_to_transfer(rfq);
    let transfer_accounts = Transfer {
        from: quote_tokens.to_account_info(),
        to: quote_escrow.to_account_info(),
        authority: taker.to_account_info(),
    };
    let transfer_ctx = CpiContext::new(token_program.to_account_info(), transfer_accounts);
    transfer(transfer_ctx, token_amount)
}
