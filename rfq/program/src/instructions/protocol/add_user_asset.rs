use std::mem;

use crate::{
    errors::ProtocolError,
    seeds::{BASE_ASSET_INFO_SEED, MINT_INFO_SEED, PROTOCOL_SEED},
    state::{BaseAssetIndex, BaseAssetInfo, OracleSource, ProtocolState, RiskCategory},
    MintInfo, MintType,
};
use anchor_lang::{prelude::*, system_program};
use anchor_spl::token::Mint;

#[derive(Accounts)]
#[instruction(index: BaseAssetIndex, ticker: String)]
pub struct AddUserAssetAccounts<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    /// CHECK: is a protocol authority
    #[account(mut, constraint = protocol.authority == authority.key() @ ProtocolError::NotAProtocolAuthority)]
    pub authority: UncheckedAccount<'info>,
    #[account(seeds = [PROTOCOL_SEED.as_bytes()], bump = protocol.bump)]
    pub protocol: Box<Account<'info, ProtocolState>>,
    #[account(init, payer = creator, space = 8 + mem::size_of::<BaseAssetInfo>() + ticker.as_bytes().len(),
                seeds = [BASE_ASSET_INFO_SEED.as_bytes(), &u16::from(index).to_le_bytes()], bump)]
    pub base_asset: Account<'info, BaseAssetInfo>,
    #[account(init, payer = creator, space = 8 + mem::size_of::<MintInfo>(),
                seeds = [MINT_INFO_SEED.as_bytes(), mint.key().as_ref()], bump)]
    pub mint_info: Account<'info, MintInfo>,

    pub mint: Account<'info, Mint>,

    pub system_program: Program<'info, System>,
}

pub fn add_user_asset_instruction(
    ctx: Context<AddUserAssetAccounts>,
    index: BaseAssetIndex,
    ticker: String,
) -> Result<()> {
    let AddUserAssetAccounts {
        creator,
        authority,
        protocol,
        base_asset,
        mint_info,
        mint,
        system_program,
        ..
    } = ctx.accounts;

    let cpi_context = CpiContext::new(
        system_program.to_account_info(),
        system_program::Transfer {
            from: creator.to_account_info(),
            to: authority.to_account_info(),
        },
    );
    system_program::transfer(cpi_context, protocol.asset_add_fee)?;

    base_asset.set_inner(BaseAssetInfo::new(
        *ctx.bumps.get("base_asset").unwrap(),
        index,
        RiskCategory::Custom1,
        OracleSource::InPlace,
        false,
        ticker,
    ));
    base_asset.validate_oracle_source()?;

    mint_info.set_inner(MintInfo {
        bump: *ctx.bumps.get("mint_info").unwrap(),
        mint_address: mint.key(),
        mint_type: MintType::AssetWithRisk {
            base_asset_index: base_asset.index,
        },
        decimals: mint.decimals,
        reserved: [0; 160],
    });

    Ok(())
}
