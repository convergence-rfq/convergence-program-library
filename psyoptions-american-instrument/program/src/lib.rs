use anchor_lang::prelude::*;
use anchor_spl::associated_token::get_associated_token_address;
use anchor_spl::token::{
    close_account, transfer, CloseAccount, Mint, Token, TokenAccount, Transfer,
};
use psy_american::OptionMarket;
//use psy_american::cpi::accounts::MintOptionV2;

use rfq::states::{AuthoritySide, ProtocolState, Response, Rfq};

declare_id!("22zZosk6iF3nnWgqrpKjFtzr8jKj4phwFZoFNghTDnaG");

const ESCROW_SEED: &str = "escrow";

#[program]
pub mod psyoptions_american_instrument {

    use super::*;

    pub fn validate_data(
        ctx: Context<ValidateData>,
        data_size: u32,
        underlying_asset_mint: Pubkey,
        underlying_amount_per_contract: u64,
        quote_amount_per_contract: u64,
        expiration_unix_timestamp: i64,
    ) -> Result<()> {
        require!(
            underlying_asset_mint == ctx.accounts.underlying_asset_mint.key(),
            PsyoptionsAmericanError::PassedMintDoesNotMatch
        );
        require!(underlying_amount_per_contract > 0, PsyoptionsAmericanError::PassedMintDoesNotMatch);
        require!(quote_amount_per_contract > 0, PsyoptionsAmericanError::PassedMintDoesNotMatch);
        require!(expiration_unix_timestamp > 0, PsyoptionsAmericanError::PassedMintDoesNotMatch);

        Ok(())
    }

    pub fn prepare_to_settle(
        ctx: Context<PrepareToSettle>,
        leg_index: u8,
        side: AuthoritySideDuplicate,
    ) -> Result<()> {
        let PrepareToSettle {
            caller,
            caller_tokens,
            rfq,
            response,
            mint,
            escrow,
            token_program,
            ..
        } = &ctx.accounts;
        let leg_data = &rfq.legs[leg_index as usize].instrument_data;
        let expected_mint: Pubkey = AnchorDeserialize::try_from_slice(leg_data)?;
        require!(
            expected_mint == mint.key(),
            PsyoptionsAmericanError::PassedMintDoesNotMatch
        );

        let token_amount = response.get_leg_amount_to_transfer(rfq, leg_index, side.into());

        if token_amount > 0 {
            let transfer_accounts = Transfer {
                from: caller_tokens.to_account_info(),
                to: escrow.to_account_info(),
                authority: caller.to_account_info(),
            };
            let transfer_ctx = CpiContext::new(token_program.to_account_info(), transfer_accounts);
            transfer(transfer_ctx, token_amount as u64)?;
        }

        Ok(())
    }

    pub fn settle(ctx: Context<Settle>, leg_index: u8) -> Result<()> {
        let Settle {
            rfq,
            response,
            escrow,
            receiver_tokens,
            token_program,
            ..
        } = &ctx.accounts;

        //response
        //    .get_leg_assets_receiver(rfq, leg_index)
        //    .validate_is_associated_token_account(
        //        rfq,
        //        response,
        //        escrow.mint,
        //        receiver_tokens.key(),
        //    )?;

        //transfer_from_an_escrow(
        //    escrow,
        //    receiver_tokens,
        //    response.key(),
        //    leg_index,
        //    *ctx.bumps.get("escrow").unwrap(),
        //    token_program,
        //)?;

        //let cpi_program = ctx.accounts.psy_american_program.clone();
        //let cpi_accounts = MintOptionV2 {
        //    user_authority: ctx.accounts.vault_authority.to_account_info(),
        //    underlying_asset_mint: ctx.accounts.underlying_asset_mint.to_account_info(),
        //    underlying_asset_pool: ctx.accounts.underlying_asset_pool.to_account_info(),
        //    underlying_asset_src: ctx.accounts.vault.to_account_info(),
        //    option_mint: ctx.accounts.option_mint.to_account_info(),
        //    minted_option_dest: ctx.accounts.minted_option_dest.to_account_info(),
        //    writer_token_mint: ctx.accounts.writer_token_mint.to_account_info(),
        //    minted_writer_token_dest: ctx.accounts.minted_writer_token_dest.to_account_info(),
        //    option_market: ctx.accounts.option_market.to_account_info(),
        //    token_program: ctx.accounts.token_program.to_account_info(),
        //};
        //let key = ctx.accounts.underlying_asset_mint.key();
        //let seeds = &[key.as_ref(), b"vaultAuthority", &[vault_authority_bump]];
        //let signer = &[&seeds[..]];
        //let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        //psy_american::cpi::mint_option_v2(cpi_ctx, size)?;

        Ok(())
    }

    pub fn revert_preparation(
        ctx: Context<RevertPreparation>,
        leg_index: u8,
        side: AuthoritySideDuplicate,
    ) -> Result<()> {
        let RevertPreparation {
            rfq,
            response,
            escrow,
            tokens,
            token_program,
            ..
        } = &ctx.accounts;

        let side: AuthoritySide = side.into();
        side.validate_is_associated_token_account(rfq, response, escrow.mint, tokens.key())?;

        if side == response.get_leg_assets_receiver(rfq, leg_index).revert() {
            transfer_from_an_escrow(
                escrow,
                tokens,
                response.key(),
                leg_index,
                *ctx.bumps.get("escrow").unwrap(),
                token_program,
            )?;
        }

        Ok(())
    }

    pub fn clean_up(ctx: Context<CleanUp>, leg_index: u8) -> Result<()> {
        let CleanUp {
            protocol,
            rfq,
            response,
            first_to_prepare,
            escrow,
            backup_receiver,
            token_program,
            ..
        } = &ctx.accounts;

        require!(
            get_associated_token_address(&protocol.authority, &escrow.mint)
                == backup_receiver.key(),
            PsyoptionsAmericanError::InvalidBackupAddress
        );

        let expected_first_to_prepare = response
            .first_to_prepare
            .unwrap()
            .to_public_key(rfq, response);
        require!(
            first_to_prepare.key() == expected_first_to_prepare,
            PsyoptionsAmericanError::NotFirstToPrepare
        );

        transfer_from_an_escrow(
            escrow,
            backup_receiver,
            response.key(),
            leg_index,
            *ctx.bumps.get("escrow").unwrap(),
            token_program,
        )?;

        close_escrow_account(
            escrow,
            first_to_prepare,
            response.key(),
            leg_index,
            *ctx.bumps.get("escrow").unwrap(),
            token_program,
        )?;

        Ok(())
    }
}

fn transfer_from_an_escrow<'info>(
    escrow: &Account<'info, TokenAccount>,
    receiver: &Account<'info, TokenAccount>,
    response: Pubkey,
    leg_index: u8,
    bump: u8,
    token_program: &Program<'info, Token>,
) -> Result<()> {
    let amount = escrow.amount;
    let transfer_accounts = Transfer {
        from: escrow.to_account_info(),
        to: receiver.to_account_info(),
        authority: escrow.to_account_info(),
    };
    let response_key = response.key();
    let leg_index_seed = [leg_index];
    let bump_seed = [bump];
    let escrow_seed = &[&[
        ESCROW_SEED.as_bytes(),
        response_key.as_ref(),
        &leg_index_seed,
        &bump_seed,
    ][..]];
    let transfer_ctx = CpiContext::new_with_signer(
        token_program.to_account_info(),
        transfer_accounts,
        escrow_seed,
    );
    transfer(transfer_ctx, amount)?;

    Ok(())
}

fn close_escrow_account<'info>(
    escrow: &Account<'info, TokenAccount>,
    sol_receiver: &UncheckedAccount<'info>,
    response: Pubkey,
    leg_index: u8,
    bump: u8,
    token_program: &Program<'info, Token>,
) -> Result<()> {
    let close_tokens_account = CloseAccount {
        account: escrow.to_account_info(),
        destination: sol_receiver.to_account_info(),
        authority: escrow.to_account_info(),
    };

    let response_key = response.key();
    let leg_index_seed = [leg_index];
    let bump_seed = [bump];
    let escrow_seed = &[&[
        ESCROW_SEED.as_bytes(),
        response_key.as_ref(),
        &leg_index_seed,
        &bump_seed,
    ][..]];

    let close_tokens_account_ctx = CpiContext::new_with_signer(
        token_program.to_account_info(),
        close_tokens_account,
        escrow_seed,
    );

    close_account(close_tokens_account_ctx)
}

#[derive(Accounts)]
pub struct ValidateData<'info> {
    /// protocol provided
    #[account(signer)]
    pub protocol: Account<'info, ProtocolState>,

    /// user provided
    pub underlying_asset_mint: Account<'info, Mint>,
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
    #[account(mut, constraint = caller_tokens.mint == mint.key() @ PsyoptionsAmericanError::PassedMintDoesNotMatch)]
    pub caller_tokens: Account<'info, TokenAccount>,

    pub mint: Account<'info, Mint>,

    #[account(init_if_needed, payer = caller, token::mint = mint, token::authority = escrow,
        seeds = [ESCROW_SEED.as_bytes(), response.key().as_ref(), &[leg_index]], bump)]
    pub escrow: Account<'info, TokenAccount>,

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
    pub escrow: Account<'info, TokenAccount>,
    #[account(mut, constraint = receiver_tokens.mint == escrow.mint @ PsyoptionsAmericanError::PassedMintDoesNotMatch)]
    pub receiver_tokens: Account<'info, TokenAccount>,

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
    #[account(mut, seeds = [ESCROW_SEED.as_bytes(), response.key().as_ref(), &[leg_index]], bump)]
    pub escrow: Account<'info, TokenAccount>,
    #[account(mut, constraint = tokens.mint == escrow.mint @ PsyoptionsAmericanError::PassedMintDoesNotMatch)]
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
    pub escrow: Account<'info, TokenAccount>,
    #[account(mut, constraint = backup_receiver.mint == escrow.mint @ PsyoptionsAmericanError::PassedMintDoesNotMatch)]
    pub backup_receiver: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct InitializeOptionMarket<'info> {
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
pub struct InitializeMintVault<'info> {
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
pub struct MintOption<'info> {
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
    /// CHECK: TODO
    pub associated_token_program: AccountInfo<'info>,
    pub clock: Sysvar<'info, Clock>,
    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
}

// Duplicate required because anchor doesn't generate IDL for imported structs
#[derive(AnchorSerialize, AnchorDeserialize, Copy, Clone, PartialEq, Eq)]
pub enum AuthoritySideDuplicate {
    Taker,
    Maker,
}

impl From<AuthoritySideDuplicate> for AuthoritySide {
    fn from(value: AuthoritySideDuplicate) -> Self {
        match value {
            AuthoritySideDuplicate::Taker => AuthoritySide::Taker,
            AuthoritySideDuplicate::Maker => AuthoritySide::Maker,
        }
    }
}

/// Error codes.
#[error_code]
pub enum PsyoptionsAmericanError {
    #[msg("Invalid data size")]
    InvalidDataSize,
    #[msg("Passed mint account does not match")]
    PassedMintDoesNotMatch,
    #[msg("Passed account is not an associated token account of a receiver")]
    InvalidReceiver,
    #[msg("Passed backup address should be an associated account of protocol owner")]
    InvalidBackupAddress,
    #[msg("Passed address is not of a party first to prepare for settlement")]
    NotFirstToPrepare,
}
