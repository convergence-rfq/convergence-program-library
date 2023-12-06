use std::mem;

use crate::{
    errors::ProtocolError,
    seeds::{MINT_INFO_SEED, PROTOCOL_SEED},
    state::{protocol::MintType, BaseAssetInfo, MintInfo, ProtocolState},
};
use anchor_lang::prelude::*;
use anchor_spl::token::Mint;

#[derive(Accounts)]
pub struct RegisterMintAccounts<'info> {
    #[account(mut, constraint = protocol.authority == authority.key() @ ProtocolError::NotAProtocolAuthority)]
    pub authority: Signer<'info>,
    #[account(seeds = [PROTOCOL_SEED.as_bytes()], bump = protocol.bump)]
    pub protocol: Box<Account<'info, ProtocolState>>,
    #[account(init, payer = authority, space = 8 + mem::size_of::<MintInfo>(),
                seeds = [MINT_INFO_SEED.as_bytes(), mint.key().as_ref()], bump)]
    pub mint_info: Account<'info, MintInfo>,
    /// CHECK: is either a base asset or default account in case of stablecoin
    pub base_asset: UncheckedAccount<'info>,

    pub mint: Account<'info, Mint>,

    pub system_program: Program<'info, System>,
}

pub fn register_mint_instruction(ctx: Context<RegisterMintAccounts>) -> Result<()> {
    let RegisterMintAccounts {
        mint_info,
        base_asset,
        mint,
        ..
    } = ctx.accounts;

    let mint_type = if base_asset.key() == Pubkey::default() {
        MintType::Stablecoin
    } else {
        let base_asset: BaseAssetInfo =
            BaseAssetInfo::try_deserialize(&mut base_asset.try_borrow_data()?.as_ref())?;
        MintType::AssetWithRisk {
            base_asset_index: base_asset.index,
        }
    };

    mint_info.set_inner(MintInfo {
        bump: *ctx.bumps.get("mint_info").unwrap(),
        mint_address: mint.key(),
        mint_type,
        decimals: mint.decimals,
        reserved: [0; 160],
    });

    Ok(())
}
