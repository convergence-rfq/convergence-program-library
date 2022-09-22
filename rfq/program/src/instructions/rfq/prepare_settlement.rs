use crate::{
    common::update_state_after_preparation,
    constants::{PROTOCOL_SEED, QUOTE_ESCROW_SEED},
    errors::ProtocolError,
    interfaces::instrument::prepare_to_settle,
    states::{AuthoritySide, ProtocolState, Response, ResponseState, Rfq},
};
use anchor_lang::prelude::*;
use anchor_spl::token::{transfer, Mint, Token, TokenAccount, Transfer};

#[derive(Accounts)]
pub struct PrepareSettlementAccounts<'info> {
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

fn validate(
    ctx: &Context<PrepareSettlementAccounts>,
    side: AuthoritySide,
    leg_amount_to_prepare: u8,
) -> Result<()> {
    let PrepareSettlementAccounts {
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

    require!(
        leg_amount_to_prepare > 0 && leg_amount_to_prepare as usize <= rfq.legs.len(),
        ProtocolError::InvalidSpecifiedLegAmount
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

    require!(
        response.get_prepared_legs(side) == 0,
        ProtocolError::AlreadyStartedToPrepare
    );

    Ok(())
}

pub fn prepare_settlement_instruction<'info>(
    ctx: Context<'_, '_, '_, 'info, PrepareSettlementAccounts<'info>>,
    side: AuthoritySide,
    leg_amount_to_prepare: u8,
) -> Result<()> {
    validate(&ctx, side, leg_amount_to_prepare)?;

    let PrepareSettlementAccounts {
        caller,
        quote_tokens,
        protocol,
        rfq,
        response,
        quote_escrow,
        token_program,
        ..
    } = ctx.accounts;

    let mut remaining_accounts = ctx.remaining_accounts.iter();

    for (index, leg) in rfq
        .legs
        .iter()
        .take(leg_amount_to_prepare as usize)
        .enumerate()
    {
        prepare_to_settle(
            leg,
            index as u8,
            side,
            protocol,
            rfq,
            response,
            &mut remaining_accounts,
        )?;
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

    update_state_after_preparation(side, leg_amount_to_prepare, rfq, response);

    Ok(())
}
