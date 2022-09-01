use crate::{
    constants::{PROTOCOL_SEED, QUOTE_ESCROW_SEED},
    errors::ProtocolError,
    interfaces::instrument::prepare_to_settle,
    states::{AuthoritySide, ProtocolState, Response, ResponseState, Rfq, StoredResponseState},
};
use anchor_lang::prelude::*;
use anchor_spl::token::{transfer, Mint, Token, TokenAccount, Transfer};

#[derive(Accounts)]
pub struct PrepareToSettleAccounts<'info> {
    #[account(mut)]
    pub caller: Signer<'info>,
    #[account(mut, constraint = quote_tokens.mint == quote_mint.key() @ ProtocolError::NotAQuoteMint)]
    pub quote_tokens: Account<'info, TokenAccount>,

    #[account(seeds = [PROTOCOL_SEED.as_bytes()], bump = protocol.bump)]
    pub protocol: Account<'info, ProtocolState>,
    pub rfq: Box<Account<'info, Rfq>>,
    #[account(mut, constraint = response.rfq == rfq.key() @ ProtocolError::ResponseForAnotherRfq)]
    pub response: Account<'info, Response>,

    #[account(constraint = quote_mint.key() == rfq.quote_mint @ ProtocolError::NotAQuoteMint)]
    pub quote_mint: Account<'info, Mint>,
    #[account(init_if_needed, payer = caller, token::mint = quote_mint, token::authority = quote_escrow,
        seeds = [QUOTE_ESCROW_SEED.as_bytes(), response.key().as_ref()], bump)]
    pub quote_escrow: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

fn validate(ctx: &Context<PrepareToSettleAccounts>, side: AuthoritySide) -> Result<()> {
    let PrepareToSettleAccounts {
        caller,
        rfq,
        response,
        ..
    } = &ctx.accounts;

    let actual_side = response.get_authority_side(rfq, &caller.key());
    require!(
        matches!(actual_side, Some(inner_side) if inner_side == side),
        ProtocolError::NotAPassedAuthority
    );

    let response_state = response.get_state(rfq)?;
    match side {
        AuthoritySide::Taker => response_state.assert_state_in([
            ResponseState::SettlingPreparations,
            ResponseState::OnlyMakerPrepared,
        ])?,
        AuthoritySide::Maker => response_state.assert_state_in([
            ResponseState::SettlingPreparations,
            ResponseState::OnlyTakerPrepared,
        ])?,
    };

    Ok(())
}

pub fn prepare_to_settle_instruction<'info>(
    ctx: Context<'_, '_, '_, 'info, PrepareToSettleAccounts<'info>>,
    side: AuthoritySide,
) -> Result<()> {
    validate(&ctx, side)?;

    let PrepareToSettleAccounts {
        caller,
        quote_tokens,
        protocol,
        rfq,
        response,
        quote_escrow,
        token_program,
        ..
    } = ctx.accounts;

    let side = response.get_authority_side(rfq, &caller.key()).unwrap();
    let mut remaining_accounts = ctx.remaining_accounts.iter();

    for (index, leg) in rfq.legs.iter().enumerate() {
        prepare_to_settle(leg, index as u8, side, protocol, &mut remaining_accounts)?;
    }

    let quote_amount = response.get_quote_amount_to_transfer(rfq, side);
    if quote_amount > 0 {
        let transfer_accounts = Transfer {
            from: quote_tokens.to_account_info(),
            to: quote_escrow.to_account_info(),
            authority: caller.to_account_info(),
        };
        let transfer_ctx = CpiContext::new(token_program.to_account_info(), transfer_accounts);
        transfer(transfer_ctx, quote_amount as u64)?;
    }

    response.first_to_prepare = response.first_to_prepare.or(Some(side));
    match side {
        AuthoritySide::Taker => response.taker_prepared_to_settle = true,
        AuthoritySide::Maker => response.maker_prepared_to_settle = true,
    };
    if response.taker_prepared_to_settle && response.maker_prepared_to_settle {
        response.state = StoredResponseState::ReadyForSettling;
    }

    Ok(())
}
