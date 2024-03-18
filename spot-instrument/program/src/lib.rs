#![allow(clippy::result_large_err)]

use crate::errors::SpotError;
use anchor_lang::prelude::*;
use anchor_spl::associated_token::get_associated_token_address;
use anchor_spl::token::{
    close_account, transfer, CloseAccount, Mint, Token, TokenAccount, Transfer,
};
use rfq::state::{
    AssetIdentifier, AuthoritySide, MintInfo, MintType, ProtocolState, Response, Rfq,
};
use state::Config;

mod errors;
mod state;

declare_id!("BMXWVaYPVJ4G8g2MMJt51CDgjHHuoirPMvsTUadv3s3v");

const ESCROW_SEED: &str = "escrow";
const CONFIG_SEED: &str = "config";

#[program]
pub mod spot_instrument {
    use super::*;

    pub fn initialize_config(ctx: Context<InitializeConfigAccounts>, fee_bps: u64) -> Result<()> {
        let config = &mut ctx.accounts.config;

        config.fee_bps = fee_bps;
        config.validate()
    }

    pub fn modify_config(ctx: Context<ModifyConfigAccounts>, fee_bps: u64) -> Result<()> {
        let config = &mut ctx.accounts.config;

        config.fee_bps = fee_bps;
        config.validate()
    }

    pub fn validate_data(
        ctx: Context<ValidateData>,
        instrument_data: Vec<u8>,
        base_asset_index: Option<u16>,
        instrument_decimals: u8,
    ) -> Result<()> {
        let mint_info = &ctx.accounts.mint_info;

        require!(
            instrument_data.len() == std::mem::size_of::<Pubkey>(),
            SpotError::InvalidDataSize
        );
        let mint_in_data: Pubkey = AnchorDeserialize::try_from_slice(&instrument_data)?;

        require_eq!(
            mint_in_data,
            mint_info.mint_address,
            SpotError::PassedMintDoesNotMatch
        );

        match (base_asset_index, mint_info.mint_type) {
            (None, MintType::Stablecoin) => (),
            (Some(passed_base_asset_index), MintType::AssetWithRisk { base_asset_index }) => {
                require!(
                    passed_base_asset_index == u16::from(base_asset_index),
                    SpotError::BaseAssetDoesNotMatch
                );
            }
            _ => err!(SpotError::MintTypeDoesNotMatch)?,
        }

        require!(
            instrument_decimals == mint_info.decimals,
            SpotError::DecimalsAmountDoesNotMatch
        );
        Ok(())
    }

    pub fn prepare_to_settle(ctx: Context<PrepareToSettle>, input: [u8; 3]) -> Result<()> {
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

        let (asset_identifier, side): (AssetIdentifier, AuthoritySide) =
            AnchorDeserialize::try_from_slice(&input)?;

        let asset_data = rfq.get_asset_instrument_data(asset_identifier);
        let expected_mint: Pubkey = AnchorDeserialize::try_from_slice(asset_data)?;
        require!(
            expected_mint == mint.key(),
            SpotError::PassedMintDoesNotMatch
        );

        let asset_receiver = response.get_assets_receiver(rfq, asset_identifier);
        let asset_sender = asset_receiver.inverse();
        if side == asset_sender {
            let token_amount = response.get_asset_amount_to_transfer(rfq, asset_identifier);
            let transfer_accounts = Transfer {
                from: caller_tokens.to_account_info(),
                to: escrow.to_account_info(),
                authority: caller.to_account_info(),
            };
            let transfer_ctx = CpiContext::new(token_program.to_account_info(), transfer_accounts);
            transfer(transfer_ctx, token_amount)?;
        }

        Ok(())
    }

    pub fn settle(mut ctx: Context<Settle>, input: [u8; 2]) -> Result<()> {
        let Settle {
            protocol,
            rfq,
            response,
            escrow,
            config,
            receiver_tokens,
            protocol_tokens,
            token_program,
            ..
        } = &mut ctx.accounts;

        let asset_identifier = AnchorDeserialize::try_from_slice(&input)?;

        response
            .get_assets_receiver(rfq, asset_identifier)
            .validate_is_associated_token_account(
                rfq,
                response,
                escrow.mint,
                receiver_tokens.key(),
            )?;

        require_keys_eq!(
            get_associated_token_address(&protocol.authority, &escrow.mint),
            protocol_tokens.key(),
            SpotError::InvalidProtocolTokensAccount
        );

        let fee_amount = match asset_identifier {
            AssetIdentifier::Leg { leg_index: _ } => 0,
            AssetIdentifier::Quote => config.calculate_fees(escrow.amount),
        };

        if fee_amount > 0 {
            transfer_from_an_escrow(
                escrow,
                protocol_tokens,
                Some(fee_amount),
                response.key(),
                asset_identifier,
                *ctx.bumps.get("escrow").unwrap(),
                token_program,
            )?;

            escrow.reload()?;
        }

        transfer_from_an_escrow(
            escrow,
            receiver_tokens,
            None,
            response.key(),
            asset_identifier,
            *ctx.bumps.get("escrow").unwrap(),
            token_program,
        )?;

        Ok(())
    }

    pub fn revert_preparation(ctx: Context<RevertPreparation>, input: [u8; 3]) -> Result<()> {
        let RevertPreparation {
            rfq,
            response,
            escrow,
            tokens,
            token_program,
            ..
        } = &ctx.accounts;

        let (asset_identifier, side): (AssetIdentifier, AuthoritySide) =
            AnchorDeserialize::try_from_slice(&input)?;

        side.validate_is_associated_token_account(rfq, response, escrow.mint, tokens.key())?;

        if side
            == response
                .get_assets_receiver(rfq, asset_identifier)
                .inverse()
        {
            transfer_from_an_escrow(
                escrow,
                tokens,
                None,
                response.key(),
                asset_identifier,
                *ctx.bumps.get("escrow").unwrap(),
                token_program,
            )?;
        }

        Ok(())
    }

    pub fn clean_up(ctx: Context<CleanUp>, input: [u8; 2]) -> Result<()> {
        let CleanUp {
            rfq,
            response,
            first_to_prepare,
            escrow,
            backup_receiver,
            token_program,
            ..
        } = &ctx.accounts;

        let asset_identifier = AnchorDeserialize::try_from_slice(&input)?;

        let expected_first_to_prepare = response
            .get_preparation_initialized_by(asset_identifier)
            .unwrap()
            .to_public_key(rfq, response);
        require!(
            first_to_prepare.key() == expected_first_to_prepare,
            SpotError::NotFirstToPrepare
        );

        if escrow.amount > 0 {
            let backup_receiver = Account::try_from(backup_receiver)?;

            transfer_from_an_escrow(
                escrow,
                &backup_receiver,
                None,
                response.key(),
                asset_identifier,
                *ctx.bumps.get("escrow").unwrap(),
                token_program,
            )?;
        }

        close_escrow_account(
            escrow,
            first_to_prepare,
            response.key(),
            asset_identifier,
            *ctx.bumps.get("escrow").unwrap(),
            token_program,
        )?;

        Ok(())
    }
}

fn transfer_from_an_escrow<'info>(
    escrow: &Account<'info, TokenAccount>,
    receiver: &Account<'info, TokenAccount>,
    amount: Option<u64>,
    response: Pubkey,
    asset_identifier: AssetIdentifier,
    bump: u8,
    token_program: &Program<'info, Token>,
) -> Result<()> {
    let amount = amount.unwrap_or(escrow.amount);
    let transfer_accounts = Transfer {
        from: escrow.to_account_info(),
        to: receiver.to_account_info(),
        authority: escrow.to_account_info(),
    };
    let response_key = response.key();
    let leg_index_seed = asset_identifier.to_bytes();
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
    asset_identifier: AssetIdentifier,
    bump: u8,
    token_program: &Program<'info, Token>,
) -> Result<()> {
    let close_tokens_account = CloseAccount {
        account: escrow.to_account_info(),
        destination: sol_receiver.to_account_info(),
        authority: escrow.to_account_info(),
    };

    let response_key = response.key();
    let leg_index_seed = asset_identifier.to_bytes();
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
pub struct InitializeConfigAccounts<'info> {
    #[account(mut, constraint = protocol.authority == authority.key() @ SpotError::NotAProtocolAuthority)]
    pub authority: Signer<'info>,
    pub protocol: Box<Account<'info, ProtocolState>>,
    #[account(
        init,
        payer = authority,
        seeds = [CONFIG_SEED.as_bytes()],
        space = 8 + Config::INIT_SPACE,
        bump
    )]
    pub config: Account<'info, Config>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ModifyConfigAccounts<'info> {
    #[account(constraint = protocol.authority == authority.key() @ SpotError::NotAProtocolAuthority)]
    pub authority: Signer<'info>,
    pub protocol: Box<Account<'info, ProtocolState>>,
    #[account(mut)]
    pub config: Account<'info, Config>,
}

#[derive(Accounts)]
pub struct ValidateData<'info> {
    /// protocol provided
    #[account(signer)]
    pub protocol: Box<Account<'info, ProtocolState>>,

    /// user provided
    pub mint_info: Account<'info, MintInfo>,
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
    #[account(mut, constraint = caller_tokens.mint == mint.key() @ SpotError::PassedMintDoesNotMatch)]
    pub caller_tokens: Account<'info, TokenAccount>,

    pub mint: Account<'info, Mint>,

    #[account(init_if_needed, payer = caller, token::mint = mint, token::authority = escrow,
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
    pub config: Account<'info, Config>,
    #[account(mut, seeds = [ESCROW_SEED.as_bytes(), response.key().as_ref(), &asset_identifier.to_bytes()], bump)]
    pub escrow: Box<Account<'info, TokenAccount>>,
    #[account(mut, constraint = receiver_tokens.mint == escrow.mint @ SpotError::PassedMintDoesNotMatch)]
    pub receiver_tokens: Box<Account<'info, TokenAccount>>,
    #[account(mut, constraint = protocol_tokens.mint == escrow.mint @ SpotError::PassedMintDoesNotMatch)]
    pub protocol_tokens: Box<Account<'info, TokenAccount>>,

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
    #[account(mut, seeds = [ESCROW_SEED.as_bytes(), response.key().as_ref(), &asset_identifier.to_bytes()], bump)]
    pub escrow: Account<'info, TokenAccount>,
    #[account(mut, constraint = tokens.mint == escrow.mint @ SpotError::PassedMintDoesNotMatch)]
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
