use anchor_lang::prelude::*;
use anchor_lang::Id;
use std::str::FromStr;

// use dex_cpi::instruction::*;

use errors::HxroError;
use rfq::state::{ProtocolState, Response, Rfq};
use state::AuthoritySideDuplicate;

mod constants;
mod errors;
mod helpers;
mod state;

declare_id!("fZ8jq8MYbf2a2Eu3rYFcFKmnxqvo8X9g5E8otAx48ZE");

#[derive(Debug, Clone)]
pub struct Dex;

impl Id for Dex {
    fn id() -> Pubkey {
        Pubkey::from_str("FUfpR31LmcP1VSbz5zDaM7nxnH55iBHkpwusgrnhaFjL").unwrap()
    }
}

#[program]
pub mod hxro_print_trade_provider {
    use super::*;

    pub fn validate_print_trade(ctx: Context<ValidatePrintTradeAccounts>) -> Result<()> {
        require!(
            ctx.accounts.rfq.legs.len() <= constants::MAX_PRODUCTS_PER_TRADE,
            HxroError::TooManyLegs
        );

        for leg in ctx.accounts.rfq.legs.clone() {
            helpers::validate_leg_data(&ctx, &leg.data)?;
        }

        helpers::validate_quote_data(&ctx, &ctx.accounts.rfq.quote_asset.data)?;

        Ok(())
    }

    pub fn prepare_print_trade<'info>(
        _ctx: Context<'_, '_, '_, 'info, PreparePrintTradeAccounts<'info>>,
        _authority_side: AuthoritySideDuplicate,
    ) -> Result<()> {
        Ok(())
    }

    pub fn settle_print_trade<'info>(
        ctx: Context<'_, '_, '_, 'info, SettlePrintTradeAccounts<'info>>,
    ) -> Result<()> {
        helpers::create_print_trade(&ctx)?;
        helpers::sign_print_trade(&ctx)?;
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
pub struct ValidatePrintTradeAccounts<'info> {
    #[account(signer)]
    pub protocol: Account<'info, ProtocolState>,
    pub rfq: Account<'info, Rfq>,
}

#[derive(Accounts)]
pub struct PreparePrintTradeAccounts<'info> {
    #[account(signer)]
    pub protocol: Box<Account<'info, ProtocolState>>,
    pub rfq: Box<Account<'info, Rfq>>,
    pub response: Box<Account<'info, Response>>,
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
