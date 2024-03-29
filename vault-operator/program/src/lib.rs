#![allow(clippy::result_large_err)]

use anchor_lang::prelude::*;
use anchor_lang::solana_program;
use anchor_spl::associated_token::get_associated_token_address;
use anchor_spl::token::{
    close_account, transfer, CloseAccount, Mint, Token, TokenAccount, Transfer,
};
use errors::VaultError;
use rfq::cpi::accounts::{
    ConfirmResponseAccounts, CreateRfqAccounts, FinalizeRfqConstructionAccounts,
    InitializeCollateralAccounts, PrepareEscrowSettlementAccounts,
};
use rfq::cpi::{
    confirm_response as confirm_response_cpi, create_rfq as create_rfq_cpi,
    finalize_rfq_construction, initialize_collateral, prepare_escrow_settlement,
};
use rfq::program::Rfq as RfqProgram;
use rfq::state::whitelist::Whitelist;
use rfq::state::{
    ApiLeg, AuthoritySide, BaseAssetIndex, FixedSize, Leg, LegSide, OrderType, ProtocolState,
    QuoteAsset, QuoteSide, Response, Rfq, SettlementTypeMetadata,
};
use seeds::OPERATOR_SEED;
use spot_instrument::ID as SpotID;
use state::VaultParams;

pub mod errors;
pub mod seeds;
pub mod state;

declare_id!("DftT8Q74YPqwrtJzy6g97XLzouG2YWaWZfRad6yK2GvA");

pub const CONFIG_SEED: &str = "config";

#[program]
pub mod vault_operator {
    use super::*;

    #[allow(clippy::too_many_arguments)]
    pub fn create_rfq<'info>(
        ctx: Context<'_, '_, '_, 'info, CreateVaultAccounts<'info>>,
        acceptable_price_limit: u128,
        leg_base_asset_index: u16,
        order_type: u8,
        size: u64,
        active_window: u32,
        settling_window: u32,
        recent_timestamp: u64,
    ) -> Result<()> {
        let CreateVaultAccounts {
            creator,
            vault_params,
            operator,
            send_mint,
            receive_mint,
            vault,
            vault_tokens_source,
            protocol,
            rfq,
            whitelist,
            collateral_info,
            collateral_token,
            collateral_mint,
            risk_engine,
            rfq_program,
            system_program,
            token_program,
            rent,
        } = ctx.accounts;

        require_keys_eq!(
            get_associated_token_address(&operator.key(), &send_mint.key()),
            vault.key(),
            VaultError::WrongVaultAddress
        );

        vault_params.set_inner(VaultParams {
            creator: creator.key(),
            rfq: rfq.key(),
            active_window_expiration: Clock::get()?.unix_timestamp + active_window as i64,
            tokens_withdrawn: false,
            acceptable_price_limit,
            confirmed_response: Pubkey::default(),
        });

        let spot_index = protocol
            .instruments
            .iter()
            .position(|x| x.program_key == SpotID)
            .ok_or(VaultError::SpotInstrumentNotFound)? as u8;

        let order_type = AnchorDeserialize::try_from_slice(&[order_type])?;

        let (leg_mint, quote_mint, vault_amount, fixed_size) = match order_type {
            OrderType::Sell => {
                let leg_tokens_to_transfer = Response::get_leg_amount_to_transfer_inner(
                    10_u64.pow(send_mint.decimals as u32),
                    size,
                    AuthoritySide::Maker,
                );
                let fixed_size = FixedSize::BaseAsset {
                    legs_multiplier_bps: size,
                };

                (send_mint, receive_mint, leg_tokens_to_transfer, fixed_size)
            }
            OrderType::Buy => {
                let fixed_size = FixedSize::QuoteAsset { quote_amount: size };
                (receive_mint, send_mint, size, fixed_size)
            }
            _ => return err!(VaultError::UnsupportedRfqType),
        };

        let quote_asset = QuoteAsset {
            settlement_type_metadata: SettlementTypeMetadata::Instrument {
                instrument_index: spot_index,
            },
            data: quote_mint.key().to_bytes().to_vec(),
            decimals: quote_mint.decimals,
        };

        let api_leg = ApiLeg {
            settlement_type_metadata: SettlementTypeMetadata::Instrument {
                instrument_index: spot_index,
            },
            base_asset_index: BaseAssetIndex::new(leg_base_asset_index),
            data: leg_mint.key().to_bytes().to_vec(),
            amount: 10_u64.pow(leg_mint.decimals as u32),
            amount_decimals: leg_mint.decimals,
            side: LegSide::Long,
        };

        let create_accounts = CreateRfqAccounts {
            taker: operator.to_account_info(),
            protocol: protocol.to_account_info(),
            rfq: rfq.to_account_info(),
            whitelist: whitelist.as_ref().map(|x| x.to_account_info()),
            system_program: system_program.to_account_info(),
        };

        let vault_params_key = vault_params.key();
        let bump_seed = [*ctx.bumps.get("operator").unwrap()];
        let operator_seeds = &[&[
            OPERATOR_SEED.as_bytes(),
            vault_params_key.as_ref(),
            &bump_seed,
        ][..]];
        let create_cpi_context = CpiContext::new_with_signer(
            rfq_program.to_account_info(),
            create_accounts,
            operator_seeds,
        )
        .with_remaining_accounts(ctx.remaining_accounts.to_vec());

        let full_legs: Vec<Leg> = vec![api_leg.clone().into()];
        let serialized_legs = full_legs.try_to_vec()?;
        let legs_hash = solana_program::hash::hash(&serialized_legs);

        create_rfq_cpi(
            create_cpi_context,
            serialized_legs.len() as u16,
            legs_hash.to_bytes(),
            vec![api_leg],
            None,
            order_type,
            quote_asset,
            fixed_size,
            active_window,
            settling_window,
            recent_timestamp,
        )?;

        let initialize_collateral_accounts = InitializeCollateralAccounts {
            user: operator.to_account_info(),
            protocol: protocol.to_account_info(),
            collateral_info: collateral_info.to_account_info(),
            collateral_token: collateral_token.to_account_info(),
            collateral_mint: collateral_mint.to_account_info(),
            system_program: system_program.to_account_info(),
            token_program: token_program.to_account_info(),
            rent: rent.to_account_info(),
        };
        let initialize_collateral_context = CpiContext::new_with_signer(
            rfq_program.to_account_info(),
            initialize_collateral_accounts,
            operator_seeds,
        );
        initialize_collateral(initialize_collateral_context)?;

        let finalize_accounts = FinalizeRfqConstructionAccounts {
            taker: operator.to_account_info(),
            protocol: protocol.to_account_info(),
            rfq: rfq.to_account_info(),
            collateral_info: collateral_info.to_account_info(),
            collateral_token: collateral_token.to_account_info(),
            risk_engine: risk_engine.to_account_info(),
        };
        let finalize_cpi_context = CpiContext::new_with_signer(
            rfq_program.to_account_info(),
            finalize_accounts,
            operator_seeds,
        );
        finalize_rfq_construction(finalize_cpi_context)?;

        let transfer_accounts = Transfer {
            from: vault_tokens_source.to_account_info(),
            to: vault.to_account_info(),
            authority: creator.to_account_info(),
        };
        let transfer_ctx = CpiContext::new(token_program.to_account_info(), transfer_accounts);
        transfer(transfer_ctx, vault_amount)?;

        Ok(())
    }

    pub fn confirm_response<'info>(
        ctx: Context<'_, '_, '_, 'info, ConfirmVaultResponseAccounts<'info>>,
    ) -> Result<()> {
        let ConfirmVaultResponseAccounts {
            vault_params,
            operator,
            protocol,
            rfq,
            response,
            collateral_info,
            maker_collateral_info,
            collateral_token,
            risk_engine,
            rfq_program,
        } = ctx.accounts;

        require_keys_eq!(
            vault_params.confirmed_response,
            Pubkey::default(),
            VaultError::AlreadyConfirmed
        );

        let quote_side = match rfq.order_type {
            OrderType::Buy => QuoteSide::Ask,
            OrderType::Sell => QuoteSide::Bid,
            OrderType::TwoWay => unreachable!(),
        };
        let quote = match quote_side {
            QuoteSide::Ask => response.ask.unwrap(),
            QuoteSide::Bid => response.bid.unwrap(),
        };

        let limit_price = vault_params.acceptable_price_limit as i128;
        match quote_side {
            QuoteSide::Ask => require_gte!(
                limit_price,
                quote.get_price_bps(),
                VaultError::PriceWorseThanLimit
            ),
            QuoteSide::Bid => require_gte!(
                quote.get_price_bps(),
                limit_price,
                VaultError::PriceWorseThanLimit
            ),
        };

        vault_params.confirmed_response = response.key();

        let vault_params_key = vault_params.key();
        let bump_seed = [*ctx.bumps.get("operator").unwrap()];
        let operator_seeds = &[&[
            OPERATOR_SEED.as_bytes(),
            vault_params_key.as_ref(),
            &bump_seed,
        ][..]];

        let accounts = ConfirmResponseAccounts {
            taker: operator.to_account_info(),
            protocol: protocol.to_account_info(),
            rfq: rfq.to_account_info(),
            response: response.to_account_info(),
            collateral_info: collateral_info.to_account_info(),
            maker_collateral_info: maker_collateral_info.to_account_info(),
            collateral_token: collateral_token.to_account_info(),
            risk_engine: risk_engine.to_account_info(),
        };

        let cpi_context =
            CpiContext::new_with_signer(rfq_program.to_account_info(), accounts, operator_seeds)
                .with_remaining_accounts(ctx.remaining_accounts.to_vec());

        confirm_response_cpi(cpi_context, quote_side, None)
    }

    pub fn prepare_settlement<'info>(
        ctx: Context<'_, '_, '_, 'info, PrepareVaultSettlementAccounts<'info>>,
    ) -> Result<()> {
        let PrepareVaultSettlementAccounts {
            vault_params,
            operator,
            protocol,
            rfq,
            response,
            rfq_program,
        } = ctx.accounts;

        let vault_params_key = vault_params.key();
        let bump_seed = [*ctx.bumps.get("operator").unwrap()];
        let operator_seeds = &[&[
            OPERATOR_SEED.as_bytes(),
            vault_params_key.as_ref(),
            &bump_seed,
        ][..]];

        let accounts = PrepareEscrowSettlementAccounts {
            caller: operator.to_account_info(),
            protocol: protocol.to_account_info(),
            rfq: rfq.to_account_info(),
            response: response.to_account_info(),
        };

        let cpi_context =
            CpiContext::new_with_signer(rfq_program.to_account_info(), accounts, operator_seeds)
                .with_remaining_accounts(ctx.remaining_accounts.to_vec());

        prepare_escrow_settlement(cpi_context, AuthoritySide::Taker, 1)
    }

    pub fn withdraw_tokens<'info>(
        ctx: Context<'_, '_, '_, 'info, WithdrawVaultTokensAccounts<'info>>,
    ) -> Result<()> {
        let WithdrawVaultTokensAccounts {
            creator,
            vault_params,
            operator,
            response,
            leg_vault,
            leg_tokens,
            leg_mint,
            quote_vault,
            quote_tokens,
            quote_mint,
            token_program,
        } = ctx.accounts;

        require_keys_eq!(
            get_associated_token_address(&operator.key(), &leg_mint.key()),
            leg_vault.key(),
            VaultError::WrongVaultAddress
        );
        require_keys_eq!(
            get_associated_token_address(&operator.key(), &quote_mint.key()),
            quote_vault.key(),
            VaultError::WrongVaultAddress
        );
        require_keys_eq!(
            get_associated_token_address(&creator.key(), &leg_mint.key()),
            leg_tokens.key(),
            VaultError::WrongCreatorTokenAddress
        );
        require_keys_eq!(
            get_associated_token_address(&creator.key(), &quote_mint.key()),
            quote_tokens.key(),
            VaultError::WrongCreatorTokenAddress
        );
        if vault_params.confirmed_response == Pubkey::default() {
            require!(
                Clock::get()?.unix_timestamp >= vault_params.active_window_expiration,
                VaultError::ActiveWindowHasNotFinished
            );
        } else {
            require!(response.data_is_empty(), VaultError::ResponseStillExist);
        }

        vault_params.tokens_withdrawn = true;

        let vault_params_key = vault_params.key();
        let bump_seed = [*ctx.bumps.get("operator").unwrap()];
        let operator_seeds = &[&[
            OPERATOR_SEED.as_bytes(),
            vault_params_key.as_ref(),
            &bump_seed,
        ][..]];

        let transfer_accounts = Transfer {
            from: leg_vault.to_account_info(),
            to: leg_tokens.to_account_info(),
            authority: operator.to_account_info(),
        };
        let transfer_ctx = CpiContext::new_with_signer(
            token_program.to_account_info(),
            transfer_accounts,
            operator_seeds,
        );
        transfer(transfer_ctx, leg_vault.amount)?;
        let close_accounts = CloseAccount {
            account: leg_vault.to_account_info(),
            destination: creator.to_account_info(),
            authority: operator.to_account_info(),
        };
        let close_ctx = CpiContext::new_with_signer(
            token_program.to_account_info(),
            close_accounts,
            operator_seeds,
        );
        close_account(close_ctx)?;

        let transfer_accounts = Transfer {
            from: quote_vault.to_account_info(),
            to: quote_tokens.to_account_info(),
            authority: operator.to_account_info(),
        };
        let transfer_ctx = CpiContext::new_with_signer(
            token_program.to_account_info(),
            transfer_accounts,
            operator_seeds,
        );
        transfer(transfer_ctx, quote_vault.amount)?;
        let close_accounts = CloseAccount {
            account: quote_vault.to_account_info(),
            destination: creator.to_account_info(),
            authority: operator.to_account_info(),
        };
        let close_ctx = CpiContext::new_with_signer(
            token_program.to_account_info(),
            close_accounts,
            operator_seeds,
        );
        close_account(close_ctx)?;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct CreateVaultAccounts<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(init, payer = creator, space = 8 + VaultParams::INIT_SPACE)]
    pub vault_params: Account<'info, VaultParams>,
    /// CHECK: empty PDA account
    #[account(mut, seeds = [OPERATOR_SEED.as_bytes(), vault_params.key().as_ref()], bump)]
    pub operator: UncheckedAccount<'info>,
    pub send_mint: Account<'info, Mint>,
    pub receive_mint: Account<'info, Mint>,
    #[account(mut)]
    pub vault: Box<Account<'info, TokenAccount>>,
    #[account(mut, constraint = vault_tokens_source.mint == send_mint.key() @ VaultError::MintDoesNotMatch)]
    pub vault_tokens_source: Box<Account<'info, TokenAccount>>,

    pub protocol: Box<Account<'info, ProtocolState>>,
    /// CHECK: rfq program checks this account address
    #[account(mut)]
    pub rfq: UncheckedAccount<'info>,
    pub whitelist: Option<Box<Account<'info, Whitelist>>>,
    /// CHECK: is checked in the rfq program
    #[account(mut)]
    pub collateral_info: UncheckedAccount<'info>,
    /// CHECK: is checked in the rfq program
    #[account(mut)]
    pub collateral_token: UncheckedAccount<'info>,
    pub collateral_mint: Account<'info, Mint>,

    /// CHECK: is checked in the rfq program
    pub risk_engine: UncheckedAccount<'info>,
    pub rfq_program: Program<'info, RfqProgram>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct ConfirmVaultResponseAccounts<'info> {
    #[account(mut)]
    pub vault_params: Account<'info, VaultParams>,
    /// CHECK: empty PDA account
    #[account(mut, seeds = [OPERATOR_SEED.as_bytes(), vault_params.key().as_ref()], bump)]
    pub operator: UncheckedAccount<'info>,

    /// CHECK: is checked in the rfq program
    pub protocol: UncheckedAccount<'info>,
    #[account(mut, constraint = rfq.key() == vault_params.rfq @ VaultError::InvalidRfq)]
    pub rfq: Box<Account<'info, Rfq>>,
    #[account(mut)]
    pub response: Box<Account<'info, Response>>,
    /// CHECK: is checked in the rfq program
    #[account(mut)]
    pub collateral_info: UncheckedAccount<'info>,
    /// CHECK: is checked in the rfq program
    #[account(mut)]
    pub maker_collateral_info: UncheckedAccount<'info>,
    /// CHECK: is checked in the rfq program
    pub collateral_token: UncheckedAccount<'info>,

    /// CHECK: is checked in the rfq program
    pub risk_engine: UncheckedAccount<'info>,
    pub rfq_program: Program<'info, RfqProgram>,
}

#[derive(Accounts)]
pub struct PrepareVaultSettlementAccounts<'info> {
    pub vault_params: Account<'info, VaultParams>,
    /// CHECK: empty PDA account
    #[account(mut, seeds = [OPERATOR_SEED.as_bytes(), vault_params.key().as_ref()], bump)]
    pub operator: UncheckedAccount<'info>,

    /// CHECK: is checked in the rfq program
    pub protocol: UncheckedAccount<'info>,
    #[account(mut, constraint = rfq.key() == vault_params.rfq @ VaultError::InvalidRfq)]
    pub rfq: Box<Account<'info, Rfq>>,
    #[account(mut, constraint = response.key() == vault_params.confirmed_response @ VaultError::WrongResponse)]
    pub response: Box<Account<'info, Response>>,

    pub rfq_program: Program<'info, RfqProgram>,
}

#[derive(Accounts)]
pub struct WithdrawVaultTokensAccounts<'info> {
    /// CHECK: vault creator
    #[account(mut, constraint = creator.key() == vault_params.creator @ VaultError::WrongCreatorAddress)]
    pub creator: UncheckedAccount<'info>,

    #[account(mut)]
    pub vault_params: Account<'info, VaultParams>,
    /// CHECK: empty PDA account
    #[account(mut, seeds = [OPERATOR_SEED.as_bytes(), vault_params.key().as_ref()], bump)]
    pub operator: UncheckedAccount<'info>,

    #[account(mut)]
    pub leg_vault: Box<Account<'info, TokenAccount>>,
    #[account(mut)]
    pub leg_tokens: Box<Account<'info, TokenAccount>>,
    pub leg_mint: Box<Account<'info, Mint>>,
    #[account(mut)]
    pub quote_vault: Box<Account<'info, TokenAccount>>,
    #[account(mut)]
    pub quote_tokens: Box<Account<'info, TokenAccount>>,
    pub quote_mint: Box<Account<'info, Mint>>,

    /// CHECK: can already be deleted
    #[account(constraint = response.key() == vault_params.confirmed_response @ VaultError::WrongResponse)]
    pub response: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
}
