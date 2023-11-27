use std::mem;

use crate::{
    errors::ProtocolError,
    seeds::{COLLATERAL_SEED, COLLATERAL_TOKEN_SEED, PROTOCOL_SEED},
    state::{CollateralInfo, ProtocolState},
};
use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

#[derive(Accounts)]
pub struct InitializeCollateralAccounts<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(seeds = [PROTOCOL_SEED.as_bytes()], bump = protocol.bump)]
    pub protocol: Box<Account<'info, ProtocolState>>,
    #[account(init, payer = user, space = 8 + mem::size_of::<CollateralInfo>(),
                seeds = [COLLATERAL_SEED.as_bytes(), user.key().as_ref()], bump)]
    pub collateral_info: Account<'info, CollateralInfo>,
    #[account(init, payer = user, token::mint = collateral_mint, token::authority = collateral_info,
                seeds = [COLLATERAL_TOKEN_SEED.as_bytes(), user.key().as_ref()], bump)]
    pub collateral_token: Account<'info, TokenAccount>,

    #[account(constraint = collateral_mint.key() == protocol.collateral_mint
                @ ProtocolError::NotACollateralMint)]
    pub collateral_mint: Account<'info, Mint>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn initialize_collateral_instruction(ctx: Context<InitializeCollateralAccounts>) -> Result<()> {
    let InitializeCollateralAccounts {
        user,
        collateral_info,
        ..
    } = ctx.accounts;

    collateral_info.set_inner(CollateralInfo {
        bump: *ctx.bumps.get("collateral_info").unwrap(),
        user: user.key(),
        token_account_bump: *ctx.bumps.get("collateral_token").unwrap(),
        locked_tokens_amount: 0,
        reserved: [0; 256],
    });

    Ok(())
}
