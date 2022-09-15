use anchor_lang::prelude::*;

use dex_cpi as dex;
use dex_cpi::typedefs::InitializePrintTradeParams;

mod errors;
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

    pub fn settle(ctx: Context<Settle>, params: InitializePrintTradeParams) -> Result<()> {
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

        let cpi_ctx = CpiContext::new(ctx.accounts.dex.to_account_info(), cpi_accounts);
        dex::cpi::initialize_print_trade(cpi_ctx, params)?;

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
}

#[derive(Accounts)]
pub struct RevertPreparation {}

#[derive(Accounts)]
pub struct CleanUp {}
