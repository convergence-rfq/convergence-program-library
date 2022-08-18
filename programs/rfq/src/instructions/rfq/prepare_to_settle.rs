use crate::{
    constants::{PROTOCOL_SEED, QUOTE_ESCROW_SEED},
    errors::ProtocolError,
    interfaces::instrument::prepare_to_settle,
    states::{AuthoritySide, ProtocolState, Response, ResponseState, Rfq, StoredResponseState},
};
use anchor_lang::prelude::*;
use anchor_spl::token::{transfer, Token, TokenAccount, Transfer};

#[derive(Accounts)]
#[instruction(side: AuthoritySide)]
pub struct PrepareToSettleAccounts<'info> {
    #[account(mut)]
    pub caller: Signer<'info>,
    #[account(mut, constraint = quote_tokens.mint == quote_mint.key() @ ProtocolError::NotAQuoteMint)]
    pub quote_tokens: Account<'info, TokenAccount>,

    #[account(seeds = [PROTOCOL_SEED.as_bytes()], bump = protocol.bump)]
    pub protocol: Account<'info, ProtocolState>,
    #[account(mut)]
    pub rfq: Account<'info, Rfq>,
    #[account(mut, constraint = response.rfq == rfq.key() @ ProtocolError::ResponseForAnotherRfq)]
    pub response: Account<'info, Response>,

    #[account(constraint = quote_mint.key() == rfq.quote_mint @ ProtocolError::NotAQuoteMint)]
    pub quote_mint: Account<'info, TokenAccount>,
    #[account(init, payer = caller, token::mint = quote_mint, token::authority = quote_escrow,
        seeds = [QUOTE_ESCROW_SEED.as_bytes(), response.key().as_ref(), &[side as u8]], bump)]
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
        AuthoritySide::Taker => require!(
            matches!(
                response_state,
                ResponseState::ReadyForSettling | ResponseState::OnlyMakerPrepared
            ),
            ProtocolError::ResponseIsNotAValidStateToPrepare
        ),
        AuthoritySide::Maker => require!(
            matches!(
                response_state,
                ResponseState::ReadyForSettling | ResponseState::OnlyTakerPrepared
            ),
            ProtocolError::ResponseIsNotAValidStateToPrepare
        ),
    }

    Ok(())
}

pub fn prepare_to_settle_instruction(
    ctx: Context<PrepareToSettleAccounts>,
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
        let instruction_parameters = protocol
            .instruments
            .get(&leg.instrument)
            .ok_or(ProtocolError::NotAWhitelistedInstrument)?;

        prepare_to_settle(
            index as u8,
            side,
            *instruction_parameters,
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

    response.state = match (side, response.get_state(rfq)?) {
        (AuthoritySide::Taker, ResponseState::ReadyForSettling) => {
            StoredResponseState::OnlyTakerPrepared
        }
        (AuthoritySide::Taker, ResponseState::OnlyMakerPrepared) => {
            StoredResponseState::ReadyForSettling
        }
        (AuthoritySide::Maker, ResponseState::ReadyForSettling) => {
            StoredResponseState::OnlyMakerPrepared
        }
        (AuthoritySide::Maker, ResponseState::OnlyTakerPrepared) => {
            StoredResponseState::ReadyForSettling
        }
        _ => unreachable!(),
    };

    Ok(())
}
