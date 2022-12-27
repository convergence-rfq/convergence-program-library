use anchor_lang::prelude::*;
use anchor_lang::Id;
use std::str::FromStr;

use errors::HxroError;
use rfq::state::{ProtocolState, Response, Rfq};

mod errors;
mod state;
mod helpers;

declare_id!("5Vhsk4PT6MDMrGSsQoQGEHfakkntEYydRYTs14T1PooL");

const MAX_PRODUCTS_PER_TRADE: usize = 6;

#[derive(Debug, Clone)]
pub struct Dex;

impl Id for Dex {
    fn id() -> Pubkey {
        Pubkey::from_str("FUfpR31LmcP1VSbz5zDaM7nxnH55iBHkpwusgrnhaFjL").unwrap()
    }
}

#[program]
pub mod hxro_instrument {
    use super::*;

    pub fn validate_data(ctx: Context<ValidateData>) -> Result<()> {
        require!(ctx.accounts.rfq.legs.len() <= 6, HxroError::TooManyLegs);

        for leg in ctx.accounts.rfq.legs.clone() {
            helpers::validate_instrument_data(&ctx, &leg.instrument_data)?;
        }

        // TODO: custom validation for the quote asset instrument data
        helpers::validate_instrument_data(&ctx, &ctx.accounts.rfq.quote_asset.instrument_data)?;

        Ok(())
    }

    pub fn create_print_trade(ctx: Context<CreatePrintTrade>) -> Result<()> {
        helpers::create_print_trade(&ctx)
    }

    pub fn settle_print_trade(ctx: Context<SettlePrintTrade>) -> Result<()> {
        Ok(())
    }

    pub fn clean_up(ctx: Context<CleanUp>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct ValidateData<'info> {
    /// protocol provided
    #[account(signer)]
    pub protocol: Account<'info, ProtocolState>,

    pub rfq: Account<'info, Rfq>,

    /// CHECK:
    pub dex: AccountInfo<'info>,
    /// CHECK:
    pub fee_model_program: AccountInfo<'info>,
    /// CHECK:
    pub risk_engine_program: AccountInfo<'info>,
    /// CHECK:
    pub fee_model_configuration_acct: AccountInfo<'info>,
    /// CHECK:
    pub risk_model_configuration_acct: AccountInfo<'info>,
    /// CHECK:
    pub fee_output_register: AccountInfo<'info>,
    /// CHECK:
    pub risk_output_register: AccountInfo<'info>,
    /// CHECK:
    pub risk_and_fee_signer: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct CreatePrintTrade<'info> {
    pub rfq: Account<'info, Rfq>,

    pub response: Account<'info, Response>,

    /// CHECK:
    pub dex: Program<'info, Dex>,

    #[account(mut)]
    pub creator_owner: Signer<'info>,
    /// CHECK:
    #[account(mut)]
    pub counterparty_owner: Signer<'info>,
    #[account(mut)]
    pub operator_owner: Signer<'info>,
    /// CHECK:
    #[account(mut)]
    pub creator: AccountInfo<'info>,
    /// CHECK:
    #[account(mut)]
    pub counterparty: AccountInfo<'info>,
    /// CHECK:
    #[account(mut)]
    pub operator: AccountInfo<'info>,

    /// CHECK:
    #[account(mut)]
    pub market_product_group: AccountInfo<'info>,

    /// CHECK:
    #[account(mut)]
    pub print_trade: AccountInfo<'info>,
    /// CHECK:
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SettlePrintTrade {}

#[derive(Accounts)]
#[instruction(leg_index: u8)]
pub struct CleanUp {}
