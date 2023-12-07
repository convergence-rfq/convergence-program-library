use anchor_lang::prelude::*;
use constants::{CONFIG_SEED, LOCKED_COLLATERAL_RECORD_SEED, OPERATOR_SEED};
use dex::state::market_product_group::MarketProductGroup;
use dex::state::print_trade::{PrintTrade, PrintTradeExecutionOutput};
use dex::{program::Dex, state::trader_risk_group::TraderRiskGroup};
use rfq::interfaces::print_trade_provider::SettlementResult;
use rfq::state::{ProtocolState, Response, Rfq};
use state::{Config, LockedCollateralRecord, ProductInfo};

// use dex_cpi::instruction::*;

use errors::HxroPrintTradeProviderError;
use helpers::{
    close_print_trade, execute_print_trade, initialize_print_trade, initialize_trader_risk_group,
    to_hxro_product, validate_print_trade_accounts, ValidationInput,
};
use state::AuthoritySideDuplicate;

mod constants;
mod errors;
mod helpers;
mod state;

declare_id!("GyRW7qvzx6UTVW9DkQGMy5f1rp9XK2x53FvWSjUUF7BJ");

// Hxro global TODOS
// 2 points in the pinned message
// 2 bugs from the chat
// print trade address conflict
// trgs checking

#[program]
pub mod hxro_print_trade_provider {
    use crate::state::FractionalCopy;

    use super::*;

    pub fn initialize_config(
        ctx: Context<InitializeConfigAccounts>,
        valid_mpg: Pubkey,
    ) -> Result<()> {
        ctx.accounts.config.valid_mpg = valid_mpg;
        Ok(())
    }

    pub fn modify_config(ctx: Context<ModifyConfigAccounts>, valid_mpg: Pubkey) -> Result<()> {
        ctx.accounts.config.valid_mpg = valid_mpg;
        Ok(())
    }

    pub fn initialize_operator_trader_risk_group<'info>(
        ctx: Context<'_, '_, '_, 'info, InitializeOperatorTraderRiskGroupAccounts<'info>>,
    ) -> Result<()> {
        initialize_trader_risk_group(ctx)
    }

    pub fn remove_locked_collateral_record(
        _ctx: Context<RemoveLockedCollateralRecord>,
    ) -> Result<()> {
        Ok(())
    }

    pub fn validate_print_trade(ctx: Context<ValidatePrintTradeAccounts>) -> Result<()> {
        let ValidatePrintTradeAccounts {
            rfq,
            market_product_group,
            trader_risk_group,
            ..
        } = &ctx.accounts;

        helpers::validate_taker_trg(rfq, market_product_group.key(), trader_risk_group)?;

        require!(
            rfq.legs.len() <= constants::MAX_PRODUCTS_PER_TRADE,
            HxroPrintTradeProviderError::TooManyLegs
        );

        require_eq!(
            rfq.quote_asset.decimals,
            constants::EXPECTED_DECIMALS,
            HxroPrintTradeProviderError::InvalidDecimals
        );

        let mut remaining_accounts = ctx.remaining_accounts;
        let mpg = market_product_group.load()?;
        for leg_index in 0..rfq.legs.len() {
            helpers::validate_leg_data(rfq, leg_index, &mpg, &mut remaining_accounts)?;
        }

        Ok(())
    }

    pub fn validate_response(ctx: Context<ValidateResponseAccounts>) -> Result<()> {
        let ValidateResponseAccounts {
            response,
            config,
            trader_risk_group,
            ..
        } = &ctx.accounts;

        helpers::validate_maker_trg(&response, config.valid_mpg, trader_risk_group)
    }

    pub fn prepare_print_trade<'info>(
        ctx: Context<'_, '_, '_, 'info, PreparePrintTradeAccounts<'info>>,
        authority_side: AuthoritySideDuplicate,
    ) -> Result<()> {
        let PreparePrintTradeAccounts {
            rfq,
            response,
            user,
            taker_trg,
            maker_trg,
            operator,
            operator_trg,
            market_product_group,
            print_trade,
            ..
        } = &ctx.accounts;

        require!(
            response.get_authority_side(rfq, user.key) == Some(authority_side.into()),
            HxroPrintTradeProviderError::InvalidUserAccount
        );

        let first_to_prepare = response
            .print_trade_initialized_by
            .unwrap_or(authority_side.into());
        validate_print_trade_accounts(ValidationInput {
            first_to_prepare,
            rfq,
            response,
            operator,
            taker_trg,
            maker_trg,
            operator_trg,
            print_trade_key: print_trade.key(),
        })?;

        if response.print_trade_initialized_by.is_some() {
            let print_trade = AccountLoader::<PrintTrade>::try_from(print_trade)?;
            let print_trade_data = print_trade.load()?;

            require_keys_eq!(
                Pubkey::from(print_trade_data.operator),
                operator_trg.key(),
                HxroPrintTradeProviderError::InvalidPrintTradeParams
            );

            require_keys_eq!(
                print_trade_data.market_product_group,
                market_product_group.key(),
                HxroPrintTradeProviderError::InvalidPrintTradeParams
            );

            require!(
                print_trade_data.is_signed,
                HxroPrintTradeProviderError::ExpectedSignedPrintTrade
            );
        } else {
            initialize_print_trade(&ctx, authority_side.into())?;
        }

        let mut locks = [ProductInfo {
            product_index: 0,
            size: FractionalCopy { m: 0, exp: 0 },
        }; 6];
        for i in 0..rfq.legs.len() {
            locks[i] = to_hxro_product(authority_side.into(), rfq, response, i as u8)?;
        }
        ctx.accounts
            .locked_collateral_record
            .set_inner(LockedCollateralRecord {
                user: user.key(),
                response: response.key(),
                locks,
            });

        Ok(())
    }

    pub fn settle_print_trade<'info>(
        ctx: Context<'_, '_, '_, 'info, SettlePrintTradeAccounts<'info>>,
    ) -> Result<SettlementResult> {
        let SettlePrintTradeAccounts {
            rfq,
            response,
            taker_trg,
            maker_trg,
            operator,
            operator_trg,
            print_trade,
            ..
        } = &ctx.accounts;

        validate_print_trade_accounts(ValidationInput {
            first_to_prepare: response.print_trade_initialized_by.unwrap(),
            rfq,
            response,
            operator,
            taker_trg,
            maker_trg,
            operator_trg,
            print_trade_key: print_trade.key(),
        })?;

        execute_print_trade(&ctx)
    }

    pub fn revert_print_trade_preparation<'info>(
        _ctx: Context<'_, '_, '_, 'info, RevertPrintTradePreparationAccounts<'info>>,
        _authority_side: AuthoritySideDuplicate,
    ) -> Result<()> {
        Ok(())
    }

    pub fn clean_up_print_trade<'info>(
        ctx: Context<'_, '_, '_, 'info, CleanUpPrintTradeAccounts<'info>>,
    ) -> Result<()> {
        let CleanUpPrintTradeAccounts {
            rfq,
            response,
            taker_trg,
            maker_trg,
            operator,
            operator_trg,
            print_trade,
            ..
        } = &ctx.accounts;

        validate_print_trade_accounts(ValidationInput {
            first_to_prepare: response.print_trade_initialized_by.unwrap(),
            rfq,
            response,
            operator,
            taker_trg,
            maker_trg,
            operator_trg,
            print_trade_key: print_trade.key(),
        })?;

        close_print_trade(&ctx)
    }
}

#[derive(Accounts)]
pub struct InitializeConfigAccounts<'info> {
    #[account(mut, constraint = protocol.authority == authority.key() @ HxroPrintTradeProviderError::NotAProtocolAuthority)]
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
    #[account(constraint = protocol.authority == authority.key() @ HxroPrintTradeProviderError::NotAProtocolAuthority)]
    pub authority: Signer<'info>,
    pub protocol: Box<Account<'info, ProtocolState>>,
    #[account(mut)]
    pub config: Account<'info, Config>,
}

#[derive(Accounts)]
pub struct RemoveLockedCollateralRecord<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(mut, close=user, constraint = locked_collateral_record.user == user.key() @ HxroPrintTradeProviderError::NotALockCreator)]
    pub locked_collateral_record: Account<'info, LockedCollateralRecord>,
}

#[derive(Accounts)]
pub struct InitializeOperatorTraderRiskGroupAccounts<'info> {
    #[account(mut, constraint = protocol.authority == authority.key() @ HxroPrintTradeProviderError::NotAProtocolAuthority)]
    pub authority: Signer<'info>,
    pub protocol: Box<Account<'info, ProtocolState>>,
    #[account(mut)]
    pub config: Account<'info, Config>,
    #[account(constraint = config.valid_mpg == market_product_group.key() @ HxroPrintTradeProviderError::NotAValidatedMpg)]
    pub market_product_group: AccountLoader<'info, MarketProductGroup>,

    /// CHECK PDA account
    #[account(mut, seeds = [OPERATOR_SEED.as_bytes()], bump)]
    pub operator: UncheckedAccount<'info>,
    pub dex: Program<'info, Dex>,
    /// CHECK done inside hxro CPI
    #[account(mut)]
    pub operator_trg: UncheckedAccount<'info>,
    /// CHECK done inside hxro CPI
    pub risk_and_fee_signer: UncheckedAccount<'info>,
    /// CHECK done inside hxro CPI
    #[account(mut)]
    pub trader_risk_state_acct: Signer<'info>,
    /// CHECK done inside hxro CPI
    #[account(mut)]
    pub trader_fee_state_acct: UncheckedAccount<'info>,
    /// CHECK done inside hxro CPI
    pub risk_engine_program: UncheckedAccount<'info>,
    /// CHECK done inside hxro CPI
    pub fee_model_config_acct: UncheckedAccount<'info>,
    /// CHECK done inside hxro CPI
    pub fee_model_program: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ValidatePrintTradeAccounts<'info> {
    #[account(signer)]
    pub protocol: Box<Account<'info, ProtocolState>>,
    pub rfq: Account<'info, Rfq>,

    pub config: Account<'info, Config>,
    #[account(constraint = config.valid_mpg == market_product_group.key() @ HxroPrintTradeProviderError::NotAValidatedMpg)]
    pub market_product_group: AccountLoader<'info, MarketProductGroup>,
    pub trader_risk_group: AccountLoader<'info, TraderRiskGroup>,
}

#[derive(Accounts)]
pub struct ValidateResponseAccounts<'info> {
    #[account(signer)]
    pub protocol: Box<Account<'info, ProtocolState>>,
    pub rfq: Account<'info, Rfq>,
    pub response: Account<'info, Response>,

    pub config: Account<'info, Config>,
    pub trader_risk_group: AccountLoader<'info, TraderRiskGroup>,
}

#[derive(Accounts)]
pub struct PreparePrintTradeAccounts<'info> {
    #[account(signer)]
    pub protocol: Box<Account<'info, ProtocolState>>,
    pub rfq: Box<Account<'info, Rfq>>,
    pub response: Box<Account<'info, Response>>,

    #[account(
        init,
        payer = user,
        seeds = [LOCKED_COLLATERAL_RECORD_SEED.as_bytes(), user.key().as_ref(), response.key().as_ref()],
        space = 8 + LockedCollateralRecord::INIT_SPACE,
        bump
    )]
    pub locked_collateral_record: Account<'info, LockedCollateralRecord>,
    /// CHECK PDA account
    #[account(seeds = [OPERATOR_SEED.as_bytes()], bump)]
    pub operator: UncheckedAccount<'info>,
    pub config: Account<'info, Config>,
    pub dex: Program<'info, Dex>,
    #[account(constraint = config.valid_mpg == market_product_group.key() @ HxroPrintTradeProviderError::NotAValidatedMpg)]
    pub market_product_group: AccountLoader<'info, MarketProductGroup>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub taker_trg: AccountLoader<'info, TraderRiskGroup>,
    pub maker_trg: AccountLoader<'info, TraderRiskGroup>,
    pub operator_trg: AccountLoader<'info, TraderRiskGroup>,
    /// CHECK done inside method or hxro CPI
    pub print_trade: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SettlePrintTradeAccounts<'info> {
    #[account(signer)]
    pub protocol: Box<Account<'info, ProtocolState>>,
    pub rfq: Box<Account<'info, Rfq>>,
    pub response: Box<Account<'info, Response>>,

    /// CHECK PDA account
    #[account(seeds = [OPERATOR_SEED.as_bytes()], bump)]
    pub operator: UncheckedAccount<'info>,
    pub config: Account<'info, Config>,
    pub dex: Program<'info, Dex>,
    #[account(constraint = config.valid_mpg == market_product_group.key() @ HxroPrintTradeProviderError::NotAValidatedMpg)]
    pub market_product_group: AccountLoader<'info, MarketProductGroup>,
    pub taker_trg: AccountLoader<'info, TraderRiskGroup>,
    pub maker_trg: AccountLoader<'info, TraderRiskGroup>,
    pub operator_trg: AccountLoader<'info, TraderRiskGroup>,
    pub print_trade: AccountLoader<'info, PrintTrade>,
    pub execution_output: AccountLoader<'info, PrintTradeExecutionOutput>,

    /// CHECK done inside hxro CPI
    pub fee_model_program: UncheckedAccount<'info>,
    /// CHECK done inside hxro CPI
    pub fee_model_configuration_acct: UncheckedAccount<'info>,
    /// CHECK done inside hxro CPI
    pub fee_output_register: UncheckedAccount<'info>,
    /// CHECK done inside hxro CPI
    pub risk_engine_program: UncheckedAccount<'info>,
    /// CHECK done inside hxro CPI
    pub risk_model_configuration_acct: UncheckedAccount<'info>,
    /// CHECK done inside hxro CPI
    pub risk_output_register: UncheckedAccount<'info>,
    /// CHECK done inside hxro CPI
    pub risk_and_fee_signer: UncheckedAccount<'info>,
    /// CHECK done inside hxro CPI
    pub creator_fee_state_acct: UncheckedAccount<'info>,
    /// CHECK done inside hxro CPI
    pub creator_risk_state_acct: UncheckedAccount<'info>,
    /// CHECK done inside hxro CPI
    pub counterparty_fee_state_acct: UncheckedAccount<'info>,
    /// CHECK done inside hxro CPI
    pub counterparty_risk_state_acct: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RevertPrintTradePreparationAccounts<'info> {
    #[account(signer)]
    pub protocol: Box<Account<'info, ProtocolState>>,
    pub rfq: Box<Account<'info, Rfq>>,
    pub response: Box<Account<'info, Response>>,
}

#[derive(Accounts)]
pub struct CleanUpPrintTradeAccounts<'info> {
    #[account(signer)]
    pub protocol: Box<Account<'info, ProtocolState>>,
    pub rfq: Box<Account<'info, Rfq>>,
    pub response: Box<Account<'info, Response>>,

    /// CHECK PDA account
    #[account(seeds = [OPERATOR_SEED.as_bytes()], bump)]
    pub operator: UncheckedAccount<'info>,
    pub config: Account<'info, Config>,
    pub dex: Program<'info, Dex>,
    #[account(constraint = config.valid_mpg == market_product_group.key() @ HxroPrintTradeProviderError::NotAValidatedMpg)]
    pub market_product_group: AccountLoader<'info, MarketProductGroup>,
    pub taker_trg: AccountLoader<'info, TraderRiskGroup>,
    pub maker_trg: AccountLoader<'info, TraderRiskGroup>,
    pub operator_trg: AccountLoader<'info, TraderRiskGroup>,
    pub print_trade: AccountLoader<'info, PrintTrade>,
    /// CHECK on hxro side
    pub creator_wallet: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}
