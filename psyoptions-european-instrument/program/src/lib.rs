use anchor_lang::prelude::*;
use anchor_spl::associated_token::get_associated_token_address;
use anchor_spl::token::{
    close_account, transfer, CloseAccount, Mint, Token, TokenAccount, Transfer,
};
use euro_options::EuroMeta;
use rfq::state::{AssetIdentifier, AuthoritySide, MintInfo, ProtocolState, Response, Rfq};
use risk_engine::state::OptionType;

use crate::errors::PsyoptionsEuropeanError;
use crate::state::{AssetIdentifierDuplicate, AuthoritySideDuplicate, ParsedLegData};

mod errors;
mod euro_options;
mod state;

declare_id!("Hk3n7BobDvZuf7sVAD68vpth2ziTFqvuytVtiBGmCwes");

const ESCROW_SEED: &str = "escrow";

#[program]
pub mod psyoptions_european_instrument {
    use rfq::state::MintType;

    use super::*;

    pub fn validate_data(
        ctx: Context<ValidateData>,
        instrument_data: Vec<u8>,
        base_asset_index: Option<u16>,
        instrument_decimals: u8,
    ) -> Result<()> {
        let ValidateData {
            euro_meta,
            mint_info,
            ..
        } = &ctx.accounts;

        require_eq!(
            instrument_data.len(),
            ParsedLegData::SERIALIZED_SIZE,
            PsyoptionsEuropeanError::InvalidDataSize
        );
        let ParsedLegData {
            option_common_data,
            mint_address,
            euro_meta_address,
        } = AnchorDeserialize::try_from_slice(&instrument_data)?;
        require!(
            euro_meta_address == euro_meta.key(),
            PsyoptionsEuropeanError::PassedEuroMetaDoesNotMatch
        );
        let expected_mint = match option_common_data.option_type {
            OptionType::Call => euro_meta.call_option_mint,
            OptionType::Put => euro_meta.put_option_mint,
        };
        require!(
            mint_address == expected_mint,
            PsyoptionsEuropeanError::PassedMintDoesNotMatch
        );
        require!(
            option_common_data.underlying_amount_per_contract
                == euro_meta.underlying_amount_per_contract,
            PsyoptionsEuropeanError::PassedUnderlyingAmountPerContractDoesNotMatch
        );
        require!(
            option_common_data.strike_price == euro_meta.strike_price,
            PsyoptionsEuropeanError::PassedStrikePriceDoesNotMatch
        );
        require!(
            option_common_data.expiration_timestamp == euro_meta.expiration,
            PsyoptionsEuropeanError::PassedExpirationTimestampDoesNotMatch
        );

        require!(
            instrument_decimals == euro_options::TOKEN_DECIMALS,
            PsyoptionsEuropeanError::DecimalsAmountDoesNotMatch
        );

        if let (Some(passed_base_asset_index), MintType::AssetWithRisk { base_asset_index }) =
            (base_asset_index, mint_info.mint_type)
        {
            require!(
                passed_base_asset_index == base_asset_index.into(),
                PsyoptionsEuropeanError::BaseAssetDoesNotMatch
            );
        } else {
            err!(PsyoptionsEuropeanError::StablecoinAsBaseAssetIsNotSupported)?
        }

        Ok(())
    }

    pub fn prepare_to_settle(
        ctx: Context<PrepareToSettle>,
        asset_identifier: AssetIdentifierDuplicate,
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
        let asset_data = rfq.get_asset_instrument_data(asset_identifier.into());
        let ParsedLegData { mint_address, .. } = AnchorDeserialize::try_from_slice(&asset_data)?;

        require!(
            mint_address == mint.key(),
            PsyoptionsEuropeanError::PassedMintDoesNotMatch
        );

        let side = AuthoritySide::from(side);
        let asset_receiver = response.get_assets_receiver(rfq, asset_identifier.into());
        let asset_sender = asset_receiver.inverse();
        if side == asset_sender {
            let token_amount = response.get_asset_amount_to_transfer(rfq, asset_identifier.into());
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

    pub fn settle(ctx: Context<Settle>, asset_identifier: AssetIdentifierDuplicate) -> Result<()> {
        let Settle {
            rfq,
            response,
            escrow,
            receiver_tokens,
            token_program,
            ..
        } = &ctx.accounts;

        response
            .get_assets_receiver(rfq, asset_identifier.into())
            .validate_is_associated_token_account(
                rfq,
                response,
                escrow.mint,
                receiver_tokens.key(),
            )?;

        transfer_from_an_escrow(
            escrow,
            receiver_tokens,
            response.key(),
            asset_identifier.into(),
            *ctx.bumps.get("escrow").unwrap(),
            token_program,
        )?;

        Ok(())
    }

    pub fn revert_preparation(
        ctx: Context<RevertPreparation>,
        asset_identifier: AssetIdentifierDuplicate,
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

        if side
            == response
                .get_assets_receiver(rfq, asset_identifier.into())
                .inverse()
        {
            transfer_from_an_escrow(
                escrow,
                tokens,
                response.key(),
                asset_identifier.into(),
                *ctx.bumps.get("escrow").unwrap(),
                token_program,
            )?;
        }

        Ok(())
    }

    pub fn clean_up(
        ctx: Context<CleanUp>,
        asset_identifier: AssetIdentifierDuplicate,
    ) -> Result<()> {
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
            PsyoptionsEuropeanError::InvalidBackupAddress
        );

        let expected_first_to_prepare = response
            .get_preparation_initialized_by(asset_identifier.into())
            .unwrap()
            .to_public_key(rfq, response);
        require!(
            first_to_prepare.key() == expected_first_to_prepare,
            PsyoptionsEuropeanError::NotFirstToPrepare
        );

        transfer_from_an_escrow(
            escrow,
            backup_receiver,
            response.key(),
            asset_identifier.into(),
            *ctx.bumps.get("escrow").unwrap(),
            token_program,
        )?;

        close_escrow_account(
            escrow,
            first_to_prepare,
            response.key(),
            asset_identifier.into(),
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
    asset_identifier: AssetIdentifier,
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
    let leg_index_seed = asset_identifier.to_seed_bytes();
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
    let leg_index_seed = asset_identifier.to_seed_bytes();
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
    pub euro_meta: Account<'info, EuroMeta>,
    #[account(constraint = euro_meta.underlying_mint == mint_info.mint_address @ PsyoptionsEuropeanError::PassedMintDoesNotMatch)]
    pub mint_info: Account<'info, MintInfo>,
}

#[derive(Accounts)]
#[instruction(asset_identifier: AssetIdentifier)]
pub struct PrepareToSettle<'info> {
    /// protocol provided
    #[account(signer)]
    pub protocol: Account<'info, ProtocolState>,
    pub rfq: Box<Account<'info, Rfq>>,
    pub response: Account<'info, Response>,

    /// user provided
    #[account(mut)]
    pub caller: Signer<'info>,
    #[account(mut, constraint = caller_tokens.mint == mint.key() @ PsyoptionsEuropeanError::PassedMintDoesNotMatch)]
    pub caller_tokens: Account<'info, TokenAccount>,

    pub mint: Account<'info, Mint>,

    #[account(init_if_needed, payer = caller, token::mint = mint, token::authority = escrow,
        seeds = [ESCROW_SEED.as_bytes(), response.key().as_ref(), &asset_identifier.to_seed_bytes()], bump)]
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
    pub protocol: Account<'info, ProtocolState>,
    pub rfq: Box<Account<'info, Rfq>>,
    pub response: Account<'info, Response>,

    /// user provided
    #[account(mut, seeds = [ESCROW_SEED.as_bytes(), response.key().as_ref(), &asset_identifier.to_seed_bytes()], bump)]
    pub escrow: Account<'info, TokenAccount>,
    #[account(mut, constraint = receiver_tokens.mint == escrow.mint @ PsyoptionsEuropeanError::PassedMintDoesNotMatch)]
    pub receiver_tokens: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
#[instruction(asset_identifier: AssetIdentifier)]
pub struct RevertPreparation<'info> {
    /// protocol provided
    #[account(signer)]
    pub protocol: Account<'info, ProtocolState>,
    pub rfq: Box<Account<'info, Rfq>>,
    pub response: Account<'info, Response>,

    /// user provided
    #[account(mut, seeds = [ESCROW_SEED.as_bytes(), response.key().as_ref(), &asset_identifier.to_seed_bytes()], bump)]
    pub escrow: Account<'info, TokenAccount>,
    #[account(mut, constraint = tokens.mint == escrow.mint @ PsyoptionsEuropeanError::PassedMintDoesNotMatch)]
    pub tokens: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
#[instruction(asset_identifier: AssetIdentifier)]
pub struct CleanUp<'info> {
    /// protocol provided
    #[account(signer)]
    pub protocol: Account<'info, ProtocolState>,
    pub rfq: Box<Account<'info, Rfq>>,
    pub response: Account<'info, Response>,

    /// user provided
    /// CHECK: is an authority first to prepare for settlement
    #[account(mut)]
    pub first_to_prepare: UncheckedAccount<'info>,
    #[account(mut, seeds = [ESCROW_SEED.as_bytes(), response.key().as_ref(), &asset_identifier.to_seed_bytes()], bump)]
    pub escrow: Account<'info, TokenAccount>,
    #[account(mut, constraint = backup_receiver.mint == escrow.mint @ PsyoptionsEuropeanError::PassedMintDoesNotMatch)]
    pub backup_receiver: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}
