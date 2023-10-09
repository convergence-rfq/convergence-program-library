use anchor_lang::prelude::*;
use anchor_spl::token::{close_account, transfer, CloseAccount, Token, TokenAccount, Transfer};

use crate::{
    seeds::{LEG_ESCROW_SEED, QUOTE_ESCROW_SEED},
    state::Response,
};

#[derive(Clone, Copy)]
pub enum EscrowType {
    Leg,
    Quote,
}

impl EscrowType {
    fn to_seed(self) -> &'static str {
        match self {
            EscrowType::Leg => LEG_ESCROW_SEED,
            EscrowType::Quote => QUOTE_ESCROW_SEED,
        }
    }
}

pub fn transfer_from_escrow_and_close_it<'info>(
    escrow_type: EscrowType,
    response: &Account<'info, Response>,
    escrow: &Account<'info, TokenAccount>,
    escrow_bump: u8,
    token_receiver: &Account<'info, TokenAccount>,
    sol_receiver: &UncheckedAccount<'info>,
    token_program: &Program<'info, Token>,
) -> Result<()> {
    transfer_from_escrow(
        escrow_type,
        response,
        escrow,
        escrow_bump,
        token_receiver,
        token_program,
    )?;
    close_quote_escrow(
        escrow_type,
        response,
        escrow,
        escrow_bump,
        sol_receiver,
        token_program,
    )
}

fn transfer_from_escrow<'info>(
    escrow_type: EscrowType,
    response: &Account<'info, Response>,
    escrow: &Account<'info, TokenAccount>,
    escrow_bump: u8,
    token_receiver: &Account<'info, TokenAccount>,
    token_program: &Program<'info, Token>,
) -> Result<()> {
    let amount = escrow.amount;
    let transfer_accounts = Transfer {
        from: escrow.to_account_info(),
        to: token_receiver.to_account_info(),
        authority: escrow.to_account_info(),
    };
    let response_key = response.key();
    let bump_seed = [escrow_bump];
    let escrow_seed = &[&[
        escrow_type.to_seed().as_bytes(),
        response_key.as_ref(),
        &bump_seed,
    ][..]];
    let transfer_ctx = CpiContext::new_with_signer(
        token_program.to_account_info(),
        transfer_accounts,
        escrow_seed,
    );
    transfer(transfer_ctx, amount)
}

fn close_quote_escrow<'info>(
    escrow_type: EscrowType,
    response: &Account<'info, Response>,
    escrow: &Account<'info, TokenAccount>,
    escrow_bump: u8,
    sol_receiver: &UncheckedAccount<'info>,
    token_program: &Program<'info, Token>,
) -> Result<()> {
    let close_tokens_account = CloseAccount {
        account: escrow.to_account_info(),
        destination: sol_receiver.to_account_info(),
        authority: escrow.to_account_info(),
    };

    let response_key = response.key();
    let bump_seed = [escrow_bump];
    let escrow_seed = &[&[
        escrow_type.to_seed().as_bytes(),
        response_key.as_ref(),
        &bump_seed,
    ][..]];

    let close_tokens_account_ctx = CpiContext::new_with_signer(
        token_program.to_account_info(),
        close_tokens_account,
        escrow_seed,
    );

    close_account(close_tokens_account_ctx)
}
