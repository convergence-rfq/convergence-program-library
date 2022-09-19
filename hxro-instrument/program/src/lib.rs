use anchor_lang::prelude::*;

use dex_cpi as dex;
use params::InitializePrintTradeParams;

mod custom_data_types;
mod errors;
mod params;
mod state;

declare_id!("5UN45ET29ci94jE7pgsrBG86nqanG4DNipW34RsdQ6LS");

#[program]
pub mod hxro_instrument {
    use super::*;

    pub fn validate_data(_ctx: Context<ValidateData>) -> Result<()> {
        Ok(())
    }

    pub fn prepare_to_settle(_ctx: Context<PrepareToSettle>) -> Result<()> {
        Ok(())
    }

    pub fn settle(ctx: Context<Settle>, data: InitializePrintTradeParams) -> Result<()> {
        call_initialize_print_trade(&ctx, &data)?;
        call_sign_print_trade(&ctx, &data)?;

        msg!("Sent!");

        Ok(())
    }

    pub fn revert_preparation(_ctx: Context<RevertPreparation>) -> Result<()> {
        Ok(())
    }

    pub fn clean_up(_ctx: Context<CleanUp>) -> Result<()> {
        Ok(())
    }
}

fn call_initialize_print_trade(
    ctx: &Context<Settle>,
    data: &InitializePrintTradeParams,
) -> Result<()> {
    let cpi_accounts = dex_cpi::cpi::accounts::InitializePrintTrade {
        user: ctx.accounts.user.to_account_info(),
        creator: ctx.accounts.creator.to_account_info(),
        counterparty: ctx.accounts.counterparty.to_account_info(),
        operator: ctx.accounts.operator.to_account_info(),
        market_product_group: ctx.accounts.market_product_group.to_account_info(),
        product: ctx.accounts.product.to_account_info(),
        print_trade: ctx.accounts.print_trade.to_account_info(),
        system_program: ctx.accounts.system_program.to_account_info(),
    };

    let cpi_params = dex_cpi::typedefs::InitializePrintTradeParams {
        product_index: data.product_index,
        size: data.size.to_dex_fractional(),
        price: data.price.to_dex_fractional(),
        side: data.side.to_dex_side(),
        operator_creator_fee_proportion: data.operator_creator_fee_proportion.to_dex_fractional(),
        operator_counterparty_fee_proportion: data
            .operator_counterparty_fee_proportion
            .to_dex_fractional(),
    };

    let cpi_ctx = CpiContext::new(ctx.accounts.dex.to_account_info(), cpi_accounts);

    dex::cpi::initialize_print_trade(cpi_ctx, cpi_params)
}

fn call_sign_print_trade(ctx: &Context<Settle>, data: &InitializePrintTradeParams) -> Result<()> {
    let cpi_accounts = dex_cpi::cpi::accounts::SignPrintTrade {
        user: ctx.accounts.user.to_account_info(),
        creator: ctx.accounts.creator.to_account_info(),
        counterparty: ctx.accounts.counterparty.to_account_info(),
        operator: ctx.accounts.operator.to_account_info(),
        market_product_group: ctx.accounts.market_product_group.to_account_info(),
        product: ctx.accounts.product.to_account_info(),
        print_trade: ctx.accounts.print_trade.to_account_info(),
        system_program: ctx.accounts.system_program.to_account_info(),
        fee_model_program: ctx.accounts.fee_model_program.to_account_info(),
        fee_model_configuration_acct: ctx.accounts.fee_model_configuration_acct.to_account_info(),
        fee_output_register: ctx.accounts.fee_output_register.to_account_info(),
        risk_engine_program: ctx.accounts.risk_engine_program.to_account_info(),
        risk_model_configuration_acct: ctx.accounts.risk_model_configuration_acct.to_account_info(),
        risk_output_register: ctx.accounts.risk_output_register.to_account_info(),
        risk_and_fee_signer: ctx.accounts.risk_and_fee_signer.to_account_info(),
        creator_trader_fee_state_acct: ctx.accounts.creator_trader_fee_state_acct.to_account_info(),
        creator_trader_risk_state_acct: ctx.accounts.creator_trader_risk_state_acct.to_account_info(),
        counterparty_trader_fee_state_acct: ctx.accounts.counterparty_trader_fee_state_acct.to_account_info(),
        counterparty_trader_risk_state_acct: ctx.accounts.counterparty_trader_risk_state_acct.to_account_info(),
    };

    let cpi_params = dex_cpi::typedefs::SignPrintTradeParams {
        product_index: data.product_index,
        size: data.size.to_dex_fractional(),
        price: data.price.to_dex_fractional(),
        side: data.side.to_dex_side(),
        operator_creator_fee_proportion: data.operator_creator_fee_proportion.to_dex_fractional(),
        operator_counterparty_fee_proportion: data
            .operator_counterparty_fee_proportion
            .to_dex_fractional(),
    };

    let cpi_ctx = CpiContext::new(ctx.accounts.dex.to_account_info(), cpi_accounts);

    dex::cpi::sign_print_trade(cpi_ctx, cpi_params)
}

#[derive(Accounts)]
pub struct ValidateData {}

#[derive(Accounts)]
pub struct PrepareToSettle {}

#[derive(Accounts)]
pub struct Settle<'info> {
    /// CHECK:
    pub dex: AccountInfo<'info>,

    pub user: Signer<'info>,
    /// CHECK:
    pub creator: AccountInfo<'info>,
    /// CHECK:
    pub counterparty: AccountInfo<'info>,
    /// CHECK:
    pub operator: AccountInfo<'info>,

    /// CHECK:
    pub market_product_group: AccountInfo<'info>,
    /// CHECK:
    pub product: AccountInfo<'info>,

    /// CHECK:
    pub print_trade: AccountInfo<'info>,
    /// CHECK:
    pub system_program: Program<'info, System>,

    /// CHECK:
    pub fee_model_program: AccountInfo<'info>,
    /// CHECK:
    pub fee_model_configuration_acct: AccountInfo<'info>,
    /// CHECK:
    pub fee_output_register: AccountInfo<'info>,
    /// CHECK:
    pub risk_engine_program: AccountInfo<'info>,
    /// CHECK:
    pub risk_model_configuration_acct: AccountInfo<'info>,
    /// CHECK:
    pub risk_output_register: AccountInfo<'info>,
    /// CHECK:
    pub risk_and_fee_signer: AccountInfo<'info>,
    /// CHECK:
    pub creator_trader_fee_state_acct: AccountInfo<'info>,
    /// CHECK:
    pub creator_trader_risk_state_acct: AccountInfo<'info>,
    /// CHECK:
    pub counterparty_trader_fee_state_acct: AccountInfo<'info>,
    /// CHECK:
    pub counterparty_trader_risk_state_acct: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct RevertPreparation {}

#[derive(Accounts)]
pub struct CleanUp {}
