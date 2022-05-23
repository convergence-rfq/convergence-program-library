use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, TokenAccount};
use psy_american::OptionMarket;

#[derive(Accounts)]
pub struct AmericanOption<'info> {
    /// CHECK: Authority
    #[account(mut, signer)]
    pub authority: AccountInfo<'info>,
    /// CHECK: PsyOptions American program
    pub psy_american_program: AccountInfo<'info>,
    /// The vault where the underlying assets are held. This is the PsyAmerican 
    /// underlying asset source
    #[account(mut)]
    pub pool: Box<Account<'info, TokenAccount>>,
    /// CHECK: Pool authority
    #[account(mut)]
    pub pool_authority: AccountInfo<'info>,
    /// CHECK: Mint CPI acounts
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
    /// CHECK:
    #[account(mut)]
    pub fee_owner: AccountInfo<'info>,
    /// CHECK:
    pub token_program: AccountInfo<'info>,
    /// CHECK:
    pub associated_token_program: AccountInfo<'info>,
    pub clock: Sysvar<'info, Clock>,
    pub rent: Sysvar<'info, Rent>,
    /// CHECK:
    pub system_program: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct InitializeAmericanOptionMarket<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    /// CHECK:
    pub psy_american_program: AccountInfo<'info>,
    pub underlying_asset_mint: Box<Account<'info, Mint>>,
    pub quote_asset_mint: Box<Account<'info, Mint>>,
    /// CHECK:
    #[account(mut)]
    pub option_mint: AccountInfo<'info>,
    /// CHECK:
    #[account(mut)]
    pub writer_token_mint: AccountInfo<'info>,
    /// CHECK:
    #[account(mut)]
    pub quote_asset_pool: AccountInfo<'info>,
    /// CHECK:
    #[account(mut)]
    pub underlying_asset_pool: AccountInfo<'info>,
    /// CHECK:
    #[account(mut)]
    pub option_market: AccountInfo<'info>,
    /// CHECK:
    pub fee_owner: AccountInfo<'info>,
    /// CHECK:
    pub token_program: AccountInfo<'info>,
    /// CHECK:
    pub associated_token_program: AccountInfo<'info>,
    pub rent: Sysvar<'info, Rent>,
    /// CHECK:
    pub system_program: AccountInfo<'info>,
    pub clock: Sysvar<'info, Clock>,
}
