use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};
use psy_american::OptionMarket;

use super::errors;
use errors::PsyoptionsAmericanError;
use rfq::states::{AuthoritySide, ProtocolState, Response, Rfq};

const ESCROW_SEED: &str = "psyoptions_american_escrow_token_account";
#[derive(Accounts)]
pub struct ValidateData<'info> {
    /// protocol provided
    #[account(signer)]
    pub protocol: Account<'info, ProtocolState>,

    /// user provided
    pub american_meta: Account<'info, OptionMarket>,
}

#[derive(Accounts)]
#[instruction(leg_index: u8, side: AuthoritySide)]
pub struct PrepareToSettle<'info> {
    /// protocol provided
    #[account(signer)]
    pub protocol: Account<'info, ProtocolState>,
    pub rfq: Box<Account<'info, Rfq>>,
    pub response: Account<'info, Response>,

    /// user provided
    #[account(mut)]
    pub caller: Signer<'info>,
    #[account(mut, constraint = caller_token_account.mint == mint.key() @ PsyoptionsAmericanError::PassedMintDoesNotMatch)]
    pub caller_token_account: Account<'info, TokenAccount>,

    pub mint: Account<'info, Mint>,

    #[account(init_if_needed, payer = caller, token::mint = mint, token::authority = escrow_token_account,
        seeds = [ESCROW_SEED.as_bytes(), response.key().as_ref(), &[leg_index]], bump)]
    pub escrow_token_account: Account<'info, TokenAccount>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
#[instruction(leg_index: u8)]
pub struct Settle<'info> {
    /// protocol provided
    #[account(signer)]
    pub protocol: Account<'info, ProtocolState>,
    pub rfq: Account<'info, Rfq>,
    pub response: Account<'info, Response>,

    /// user provided
    #[account(mut, seeds = [ESCROW_SEED.as_bytes(), response.key().as_ref(), &[leg_index]], bump)]
    pub escrow_token_account: Account<'info, TokenAccount>,
    #[account(mut, constraint = receiver_token_account.mint == escrow_token_account.mint @ PsyoptionsAmericanError::PassedMintDoesNotMatch)]
    pub receiver_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
#[instruction(leg_index: u8)]
pub struct RevertPreparation<'info> {
    /// protocol provided
    #[account(signer)]
    pub protocol: Account<'info, ProtocolState>,
    pub rfq: Account<'info, Rfq>,
    pub response: Account<'info, Response>,

    /// user provided
    #[account(mut, seeds = [ESCROW_SEED.as_bytes(), response.key().as_ref(), &[leg_index]],bump)]
    pub escrow_token_account: Account<'info, TokenAccount>,
    #[account(mut, constraint = tokens.mint == escrow_token_account.mint @ PsyoptionsAmericanError::PassedMintDoesNotMatch)]
    pub tokens: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
#[instruction(leg_index: u8)]
pub struct CleanUp<'info> {
    /// protocol provided
    #[account(signer)]
    pub protocol: Account<'info, ProtocolState>,
    pub rfq: Account<'info, Rfq>,
    pub response: Account<'info, Response>,

    /// user provided
    /// CHECK: is an authority first to prepare for settlement
    #[account(mut)]
    pub first_to_prepare: UncheckedAccount<'info>,
    #[account(mut, seeds = [ESCROW_SEED.as_bytes(), response.key().as_ref(), &[leg_index]], bump)]
    pub escrow_token_account: Account<'info, TokenAccount>,
    #[account(mut, constraint = backup_receiver.mint == escrow_token_account.mint @ PsyoptionsAmericanError::PassedMintDoesNotMatch)]
    pub backup_receiver: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}
