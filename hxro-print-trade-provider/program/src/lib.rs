use anchor_lang::prelude::*;
use constants::{CONFIG_SEED, OPERATOR_SEED};
use dex::program::Dex;
use dex::state::market_product_group::MarketProductGroup;
use state::Config;

// use dex_cpi::instruction::*;

use errors::HxroPrintTradeProviderError;
use rfq::state::{ProtocolState, Response, Rfq};
use state::AuthoritySideDuplicate;

mod constants;
mod errors;
mod helpers;
mod state;

declare_id!("fZ8jq8MYbf2a2Eu3rYFcFKmnxqvo8X9g5E8otAx48ZE");

// Hxro global TODOS
// 2 points in the pinned message
// 2 bugs from the chat
// print trade address conflict
// trgs checking

#[program]
pub mod hxro_print_trade_provider {
    use crate::helpers::{create_print_trade, lock_collateral};

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

    pub fn validate_print_trade(ctx: Context<ValidatePrintTradeAccounts>) -> Result<()> {
        let ValidatePrintTradeAccounts {
            rfq,
            market_product_group,
            ..
        } = &ctx.accounts;

        require!(
            rfq.legs.len() <= constants::MAX_PRODUCTS_PER_TRADE,
            HxroPrintTradeProviderError::TooManyLegs
        );

        let mut remaining_accounts = ctx.remaining_accounts;
        let mpg = market_product_group.load()?;
        for leg_index in 0..rfq.legs.len() {
            helpers::validate_leg_data(&rfq, leg_index, &mpg, &mut remaining_accounts)?;
        }

        Ok(())
    }

    pub fn prepare_print_trade<'info>(
        ctx: Context<'_, '_, '_, 'info, PreparePrintTradeAccounts<'info>>,
        authority_side: AuthoritySideDuplicate,
    ) -> Result<()> {
        let PreparePrintTradeAccounts {
            rfq,
            response,
            user,
            ..
        } = &ctx.accounts;

        require!(
            response.get_authority_side(rfq, user.key) == Some(authority_side.into()),
            HxroPrintTradeProviderError::InvalidUserAccount
        );

        lock_collateral(&ctx)?;

        if response.print_trade_initialized_by.is_some() { // if other side have already prepared
             // sign print trade
        } else {
            create_print_trade(&ctx, authority_side.into())?;
        }
        Ok(())
    }

    pub fn settle_print_trade<'info>(
        _ctx: Context<'_, '_, '_, 'info, SettlePrintTradeAccounts<'info>>,
    ) -> Result<()> {
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
pub struct ValidatePrintTradeAccounts<'info> {
    #[account(signer)]
    pub protocol: Account<'info, ProtocolState>,
    pub rfq: Account<'info, Rfq>,

    pub config: Account<'info, Config>,
    #[account(constraint = config.valid_mpg == market_product_group.key() @ HxroPrintTradeProviderError::NotAValidatedMpg)]
    pub market_product_group: AccountLoader<'info, MarketProductGroup>,
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
    /// CHECK done inside hxro CPI
    pub user_trg: UncheckedAccount<'info>,
    /// CHECK done inside hxro CPI
    pub counterparty_trg: UncheckedAccount<'info>, // TODO security issue, taker can send invalid TRG here
    /// CHECK done inside hxro CPI
    pub operator_trg: UncheckedAccount<'info>, // TODO security issue, taker can send invalid TRG here
    /// CHECK done inside hxro CPI
    pub print_trade: UncheckedAccount<'info>,
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
    pub fee_state_acct: UncheckedAccount<'info>,
    /// CHECK done inside hxro CPI
    pub risk_state_acct: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SettlePrintTradeAccounts<'info> {
    #[account(signer)]
    pub protocol: Box<Account<'info, ProtocolState>>,
    pub rfq: Box<Account<'info, Rfq>>,
    pub response: Box<Account<'info, Response>>,

    #[account(mut)]
    pub taker: Signer<'info>,
    /// CHECK
    #[account(mut)]
    pub maker: AccountInfo<'info>,

    pub dex: Program<'info, Dex>,
    /// CHECK
    #[account(mut)]
    pub creator: AccountInfo<'info>,
    /// CHECK
    #[account(mut)]
    pub counterparty: AccountInfo<'info>,
    /// CHECK
    #[account(mut)]
    pub operator: AccountInfo<'info>,
    /// CHECK
    #[account(mut)]
    pub market_product_group: AccountInfo<'info>,
    /// CHECK
    pub product: AccountInfo<'info>,
    /// CHECK
    #[account(mut)]
    pub print_trade: AccountInfo<'info>,
    /// CHECK
    pub system_program: AccountInfo<'info>,
    /// CHECK
    pub fee_model_program: AccountInfo<'info>,
    /// CHECK
    pub fee_model_configuration_acct: AccountInfo<'info>,
    /// CHECK
    #[account(mut)]
    pub fee_output_register: AccountInfo<'info>,
    /// CHECK
    pub risk_engine_program: AccountInfo<'info>,
    /// CHECK
    pub risk_model_configuration_acct: AccountInfo<'info>,
    /// CHECK
    #[account(mut)]
    pub risk_output_register: AccountInfo<'info>,
    /// CHECK
    pub risk_and_fee_signer: AccountInfo<'info>,
    /// CHECK
    #[account(mut)]
    pub creator_trader_fee_state_acct: AccountInfo<'info>,
    /// CHECK
    #[account(mut)]
    pub creator_trader_risk_state_acct: AccountInfo<'info>,
    /// CHECK
    #[account(mut)]
    pub counterparty_trader_fee_state_acct: AccountInfo<'info>,
    /// CHECK
    #[account(mut)]
    pub counterparty_trader_risk_state_acct: AccountInfo<'info>,
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
