use anchor_lang::prelude::*;
use constants::{CONFIG_SEED, OPERATOR_SEED};
use dex::state::market_product_group::MarketProductGroup;
use dex::state::print_trade::{PrintTrade, PrintTradeExecutionOutput};
use dex::{program::Dex, state::trader_risk_group::TraderRiskGroup, ID as DexID};
use rfq::state::{AuthoritySide, ProtocolState, Response, Rfq};
use state::Config;

// use dex_cpi::instruction::*;

use errors::HxroPrintTradeProviderError;
use helpers::{
    common::{parse_maker_trg, parse_taker_trg},
    execute_print_trade, initialize_print_trade, initialize_trader_risk_group,
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
            user_trg,
            counterparty_trg,
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

        let (taker_trg, maker_trg) = if authority_side == AuthoritySideDuplicate::Taker {
            (user_trg, counterparty_trg)
        } else {
            (counterparty_trg, user_trg)
        };
        require_keys_eq!(
            taker_trg.key(),
            parse_taker_trg(&rfq)?,
            HxroPrintTradeProviderError::UnexpectedTRG
        );
        require_keys_eq!(
            maker_trg.key(),
            parse_maker_trg(&response)?,
            HxroPrintTradeProviderError::UnexpectedTRG
        );

        let operator_trg_owner = operator_trg.load()?.owner;
        require_keys_eq!(
            operator.key(),
            operator_trg_owner,
            HxroPrintTradeProviderError::InvalidOperatorTRG
        );

        let first_to_prepare = response
            .print_trade_initialized_by
            .unwrap_or(authority_side.into());
        let (creator, counterparty) = if first_to_prepare == AuthoritySide::Taker {
            (taker_trg, maker_trg)
        } else {
            (maker_trg, taker_trg)
        };
        let (expected_print_trade_address, _) = Pubkey::find_program_address(
            &[
                b"print_trade",
                creator.key().as_ref(),
                counterparty.key().as_ref(),
                response.key().as_ref(),
            ],
            &DexID,
        );
        require_keys_eq!(
            print_trade.key(),
            expected_print_trade_address,
            HxroPrintTradeProviderError::InvalidPrintTradeAddress
        );

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
        Ok(())
    }

    pub fn settle_print_trade<'info>(
        ctx: Context<'_, '_, '_, 'info, SettlePrintTradeAccounts<'info>>,
    ) -> Result<()> {
        let SettlePrintTradeAccounts {
            rfq,
            response,
            creator_trg,
            counterparty_trg,
            operator,
            operator_trg,
            print_trade,
            ..
        } = &ctx.accounts;

        let (taker_trg, maker_trg) = match response.print_trade_initialized_by {
            Some(AuthoritySide::Taker) => (creator_trg, counterparty_trg),
            Some(AuthoritySide::Maker) => (counterparty_trg, creator_trg),
            _ => unreachable!("Print trade should always store who prepared first here"),
        };

        require_keys_eq!(
            taker_trg.key(),
            parse_taker_trg(&rfq)?,
            HxroPrintTradeProviderError::UnexpectedTRG
        );
        require_keys_eq!(
            maker_trg.key(),
            parse_maker_trg(&response)?,
            HxroPrintTradeProviderError::UnexpectedTRG
        );

        let operator_trg_owner = operator_trg.load()?.owner;
        require_keys_eq!(
            operator.key(),
            operator_trg_owner,
            HxroPrintTradeProviderError::InvalidOperatorTRG
        );

        let (expected_print_trade_address, _) = Pubkey::find_program_address(
            &[
                b"print_trade",
                creator_trg.key().as_ref(),
                counterparty_trg.key().as_ref(),
                response.key().as_ref(),
            ],
            &DexID,
        );
        require_keys_eq!(
            print_trade.key(),
            expected_print_trade_address,
            HxroPrintTradeProviderError::InvalidPrintTradeAddress
        );

        execute_print_trade(&ctx)?;

        Ok(())
    }

    pub fn revert_print_trade_preparation<'info>(
        _ctx: Context<'_, '_, '_, 'info, RevertPrintTradePreparationAccounts<'info>>,
        _authority_side: AuthoritySideDuplicate,
    ) -> Result<()> {
        Ok(())
    }

    pub fn clean_up_print_trade(_ctx: Context<CleanUpPrintTradeAccounts>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeConfigAccounts<'info> {
    #[account(mut, constraint = protocol.authority == authority.key() @ HxroPrintTradeProviderError::NotAProtocolAuthority)]
    pub authority: Signer<'info>,
    pub protocol: Account<'info, ProtocolState>,
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
    pub protocol: Account<'info, ProtocolState>,
    #[account(mut)]
    pub config: Account<'info, Config>,
}

#[derive(Accounts)]
pub struct InitializeOperatorTraderRiskGroupAccounts<'info> {
    #[account(mut, constraint = protocol.authority == authority.key() @ HxroPrintTradeProviderError::NotAProtocolAuthority)]
    pub authority: Signer<'info>,
    pub protocol: Account<'info, ProtocolState>,
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
    pub protocol: Account<'info, ProtocolState>,
    pub rfq: Account<'info, Rfq>,

    pub config: Account<'info, Config>,
    #[account(constraint = config.valid_mpg == market_product_group.key() @ HxroPrintTradeProviderError::NotAValidatedMpg)]
    pub market_product_group: AccountLoader<'info, MarketProductGroup>,
    pub trader_risk_group: AccountLoader<'info, TraderRiskGroup>,
}

#[derive(Accounts)]
pub struct ValidateResponseAccounts<'info> {
    #[account(signer)]
    pub protocol: Account<'info, ProtocolState>,
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

    /// CHECK PDA account
    #[account(seeds = [OPERATOR_SEED.as_bytes()], bump)]
    pub operator: UncheckedAccount<'info>,
    pub config: Account<'info, Config>,
    pub dex: Program<'info, Dex>,
    #[account(constraint = config.valid_mpg == market_product_group.key() @ HxroPrintTradeProviderError::NotAValidatedMpg)]
    pub market_product_group: AccountLoader<'info, MarketProductGroup>,
    pub user: Signer<'info>,
    pub user_trg: AccountLoader<'info, TraderRiskGroup>,
    pub counterparty_trg: AccountLoader<'info, TraderRiskGroup>,
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
    pub creator_trg: AccountLoader<'info, TraderRiskGroup>,
    pub counterparty_trg: AccountLoader<'info, TraderRiskGroup>,
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
}
