use anchor_lang::prelude::*;
mod state;
use anchor_spl::associated_token::get_associated_token_address;
use anchor_spl::token::{close_account, transfer, CloseAccount, Token, TokenAccount, Transfer};
use state::{AssetIdentifierDuplicate, ParsedLegData};
mod instructions;
use instructions::*;
use state::{AuthoritySideDuplicate, TOKEN_DECIMALS};
mod errors;
use errors::PsyoptionsAmericanError;
use rfq::state::MintType;
use rfq::state::{AssetIdentifier, AuthoritySide};

declare_id!("ATtEpDQ6smvJnMSJvhLc21DBCTBKutih7KBf9Qd5b8xy");

const ESCROW_SEED: &str = "escrow";
#[program]
pub mod psyoptions_american_instrument {

    use super::*;

    pub fn validate_data(
        ctx: Context<ValidateData>,
        instrument_data: Vec<u8>,
        base_asset_index: Option<u16>,
        instrument_decimals: u8,
    ) -> Result<()> {
        let ValidateData {
            american_meta,
            mint_info,
            ..
        } = &ctx.accounts;

        require_eq!(
            instrument_data.len(),
            ParsedLegData::SERIALIZED_SIZE,
            PsyoptionsAmericanError::InvalidDataSize
        );
        let ParsedLegData {
            option_common_data,
            mint_address,
            american_meta_address,
        } = AnchorDeserialize::try_from_slice(&instrument_data)?;
        require!(
            american_meta_address == american_meta.key(),
            PsyoptionsAmericanError::PassedAmericanMetaDoesNotMatch
        );
        let expected_mint = american_meta.option_mint;
        require!(
            mint_address == expected_mint,
            PsyoptionsAmericanError::PassedMintDoesNotMatch
        );
        require!(
            option_common_data.underlying_amount_per_contract
                == american_meta.underlying_amount_per_contract,
            PsyoptionsAmericanError::PassedUnderlyingAmountPerContractDoesNotMatch
        );
        require!(
            option_common_data.strike_price == american_meta.quote_amount_per_contract,
            PsyoptionsAmericanError::PassedStrikePriceDoesNotMatch
        );
        require!(
            option_common_data.expiration_timestamp == american_meta.expiration_unix_timestamp,
            PsyoptionsAmericanError::PassedExpirationTimestampDoesNotMatch
        );

        require!(
            instrument_decimals == TOKEN_DECIMALS,
            PsyoptionsAmericanError::DecimalsAmountDoesNotMatch
        );

        if let (Some(passed_base_asset_index), MintType::AssetWithRisk { base_asset_index }) =
            (base_asset_index, mint_info.mint_type)
        {
            require!(
                passed_base_asset_index == base_asset_index.into(),
                PsyoptionsAmericanError::BaseAssetDoesNotMatch
            );
        } else {
            err!(PsyoptionsAmericanError::StablecoinAsBaseAssetIsNotSupported)?
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
            caller_token_account,
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
            PsyoptionsAmericanError::PassedMintDoesNotMatch
        );

        require!(
            caller_token_account.mint == mint.key(),
            PsyoptionsAmericanError::PassedMintDoesNotMatch
        );

        let token_amount =
            response.get_asset_amount_to_transfer(rfq, asset_identifier.into(), side.into());

        if token_amount > 0 {
            let transfer_accounts = Transfer {
                from: caller_token_account.to_account_info(),
                to: escrow.to_account_info(),
                authority: caller.to_account_info(),
            };
            let transfer_ctx = CpiContext::new(token_program.to_account_info(), transfer_accounts);
            transfer(transfer_ctx, token_amount as u64)?;
        }

        Ok(())
    }

    pub fn settle(ctx: Context<Settle>, asset_identifier: AssetIdentifierDuplicate) -> Result<()> {
        let Settle {
            rfq,
            response,
            escrow,
            receiver_token_account,
            token_program,
            ..
        } = &ctx.accounts;

        response
            .get_assets_receiver(rfq, asset_identifier.into())
            .validate_is_associated_token_account(
                rfq,
                response,
                escrow.mint,
                receiver_token_account.key(),
            )?;

        transfer_from_an_escrow(
            escrow,
            receiver_token_account,
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
                .revert()
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
            PsyoptionsAmericanError::InvalidBackupAddress
        );

        let expected_first_to_prepare = response
            .get_preparation_initialized_by(asset_identifier.into())
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
    escrow_token_account: &Account<'info, TokenAccount>,
    receiver_token_account: &Account<'info, TokenAccount>,
    response: Pubkey,
    asset_identifier: AssetIdentifier,
    bump: u8,
    token_program: &Program<'info, Token>,
) -> Result<()> {
    let amount = escrow_token_account.amount;
    let transfer_accounts = Transfer {
        from: escrow_token_account.to_account_info(),
        to: receiver_token_account.to_account_info(),
        authority: escrow_token_account.to_account_info(),
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
    escrow_token_account: &Account<'info, TokenAccount>,
    sol_receiver: &UncheckedAccount<'info>,
    response: Pubkey,
    asset_identifier: AssetIdentifier,
    bump: u8,
    token_program: &Program<'info, Token>,
) -> Result<()> {
    let close_tokens_account = CloseAccount {
        account: escrow_token_account.to_account_info(),
        destination: sol_receiver.to_account_info(),
        authority: escrow_token_account.to_account_info(),
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