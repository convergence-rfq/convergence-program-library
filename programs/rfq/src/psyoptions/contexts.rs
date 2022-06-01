///! Contexts
use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};
use psy_american::OptionMarket;

use crate::states::RfqState;
use crate::constants::RFQ_SEED;

#[derive(Accounts)]
pub struct InitializeAmericanOptionMarket<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    /// CHECK: TODO
    pub psy_american_program: AccountInfo<'info>,
    pub underlying_asset_mint: Box<Account<'info, Mint>>,
    pub quote_asset_mint: Box<Account<'info, Mint>>,
    /// CHECK: TODO
    #[account(mut)]
    pub option_mint: AccountInfo<'info>,
    /// CHECK: TODO
    #[account(mut)]
    pub writer_token_mint: AccountInfo<'info>,
    /// CHECK: TODO
    #[account(mut)]
    pub quote_asset_pool: AccountInfo<'info>,
    /// CHECK: TODO
    #[account(mut)]
    pub underlying_asset_pool: AccountInfo<'info>,
    /// CHECK: TODO
    #[account(mut)]
    pub option_market: AccountInfo<'info>,
    /// CHECK: TODO
    pub fee_owner: AccountInfo<'info>,
    /// CHECK: TODO
    pub token_program: AccountInfo<'info>,
    /// CHECK: TODO
    pub associated_token_program: AccountInfo<'info>,
    pub rent: Sysvar<'info, Rent>,
    /// CHECK: TODO
    pub system_program: AccountInfo<'info>,
    pub clock: Sysvar<'info, Clock>,
}

#[derive(Accounts)]
pub struct InitializeAmericanMintVault<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    pub underlying_asset: Box<Account<'info, Mint>>,
    #[account(
        init,
        seeds = [&underlying_asset.key().to_bytes()[..], b"vault"],
        payer = authority,    
        token::mint = underlying_asset,
        token::authority = vault_authority,
        bump
    )]
    pub vault: Box<Account<'info, TokenAccount>>,
    /// CHECK: TODO
    pub vault_authority: AccountInfo<'info>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct MintAmericanOption<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    /// CHECK: TODO
    pub psy_american_program: AccountInfo<'info>,
    /// The vault where the underlying assets are held. This is the PsyAmerican 
    #[account(mut)]
    pub vault: Box<Account<'info, TokenAccount>>,
    #[account(mut)]
    /// CHECK: TODO
    pub vault_authority: AccountInfo<'info>,
    /// CHECK: TODO
    pub underlying_asset_mint: AccountInfo<'info>,
    #[account(mut)]
    pub underlying_asset_pool: Box<Account<'info, TokenAccount>>,
    #[account(mut)]
    pub option_mint: Box<Account<'info, Mint>>,
    #[account(mut)]
    pub minted_option_dest: Box<Account<'info, TokenAccount>>,
    #[account(mut)]
    pub writer_token_mint: Box<Account<'info, Mint>>,
    #[account(mut)]
    pub minted_writer_token_dest: Box<Account<'info, TokenAccount>>,
    pub option_market: Box<Account<'info, OptionMarket>>,
    #[account(mut)]
    /// CHECK: TODO
    pub fee_owner: AccountInfo<'info>,
    pub token_program: Program<'info, Token>,
    #[account(
        mut,
        seeds = [RFQ_SEED.as_bytes(), rfq.id.to_string().as_bytes()],
        bump = rfq.bump,
        constraint = rfq.to_account_info().owner == program_id
    )]
    pub rfq: Box<Account<'info, RfqState>>,
    /// CHECK: TODO
    pub associated_token_program: AccountInfo<'info>,
    pub clock: Sysvar<'info, Clock>,
    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
}
