use crate::american_options::OptionMarket;
use crate::errors;
use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};
use errors::PsyoptionsAmericanError;
use rfq::state::MintInfo;
use rfq::state::{AssetIdentifier, ProtocolState, Response, Rfq};

const ESCROW_SEED: &str = "escrow";

#[derive(Accounts)]
pub struct ValidateData<'info> {
    /// protocol provided
    #[account(signer)]
    pub protocol: Box<Account<'info, ProtocolState>>,

    /// user provided
    pub american_meta: Account<'info, OptionMarket>,
    pub underlying_asset_mint: Account<'info, MintInfo>,
    pub stable_asset_mint: Account<'info, MintInfo>,
}

#[derive(Accounts)]
#[instruction(asset_identifier: AssetIdentifier)]
pub struct PrepareToSettle<'info> {
    /// protocol provided
    #[account(signer)]
    pub protocol: Box<Account<'info, ProtocolState>>,
    pub rfq: Box<Account<'info, Rfq>>,
    pub response: Box<Account<'info, Response>>,

    /// user provided
    #[account(mut)]
    pub caller: Signer<'info>,
    #[account(mut, constraint = caller_token_account.mint == mint.key() @ PsyoptionsAmericanError::PassedMintDoesNotMatch)]
    pub caller_token_account: Account<'info, TokenAccount>,

    pub mint: Account<'info, Mint>,

    #[account(init_if_needed,payer = caller, token::mint = mint, token::authority = escrow,
        seeds = [ESCROW_SEED.as_bytes(), response.key().as_ref(), &asset_identifier.to_bytes()], bump)]
    pub escrow: Account<'info, TokenAccount>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
#[instruction(asset_identifier: AssetIdentifier)]
pub struct Settle<'info> {
    /// protocol provided
    #[account(signer)]
    pub protocol: Box<Account<'info, ProtocolState>>,
    pub rfq: Box<Account<'info, Rfq>>,
    pub response: Account<'info, Response>,

    /// user provided
    #[account(mut, seeds = [ESCROW_SEED.as_bytes(), response.key().as_ref(),  &asset_identifier.to_bytes()], bump)]
    pub escrow: Account<'info, TokenAccount>,
    #[account(mut, constraint = receiver_token_account.mint == escrow.mint  @PsyoptionsAmericanError::PassedMintDoesNotMatch)]
    pub receiver_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
#[instruction(asset_identifier: AssetIdentifier)]
pub struct RevertPreparation<'info> {
    /// protocol provided
    #[account(signer)]
    pub protocol: Box<Account<'info, ProtocolState>>,
    pub rfq: Box<Account<'info, Rfq>>,
    pub response: Account<'info, Response>,

    /// user provided
    #[account(mut, seeds = [ESCROW_SEED.as_bytes(), response.key().as_ref(), &asset_identifier.to_bytes()],bump)]
    pub escrow: Account<'info, TokenAccount>,
    #[account(mut, constraint = tokens.mint == escrow.mint @ PsyoptionsAmericanError::PassedMintDoesNotMatch)]
    pub tokens: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
#[instruction(asset_identifier: AssetIdentifier)]
pub struct CleanUp<'info> {
    /// protocol provided
    #[account(signer)]
    pub protocol: Box<Account<'info, ProtocolState>>,
    pub rfq: Box<Account<'info, Rfq>>,
    pub response: Account<'info, Response>,

    /// user provided
    /// CHECK: is an authority first to prepare for settlement
    #[account(mut)]
    pub first_to_prepare: UncheckedAccount<'info>,
    #[account(mut, seeds = [ESCROW_SEED.as_bytes(), response.key().as_ref(), &asset_identifier.to_bytes()], bump)]
    pub escrow: Account<'info, TokenAccount>,
    /// CHECK: if there are tokens still in the escrow, send them to this account
    #[account(mut)]
    pub backup_receiver: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
}
