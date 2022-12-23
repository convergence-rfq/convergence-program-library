use anchor_lang::prelude::*;

use dex_cpi as dex;

use super::super::CreatePrintTrade;

pub fn create_print_trade(
    ctx: &Context<CreatePrintTrade>,
) -> Result<()> {
    let cpi_accounts = dex_cpi::cpi::accounts::InitializePrintTrade {
        user: ctx.accounts.creator_owner.to_account_info(),
        creator: ctx.accounts.creator.to_account_info(),
        counterparty: ctx.accounts.counterparty.to_account_info(),
        operator: ctx.accounts.operator.to_account_info(),
        market_product_group: ctx.accounts.market_product_group.to_account_info(),
        print_trade: ctx.accounts.print_trade.to_account_info(),
        system_program: ctx.accounts.system_program.to_account_info(),
        operator_owner: ctx.accounts.operator_owner.to_account_info(),
    };

    let cpi_params = dex_cpi::typedefs::InitializePrintTradeParams {
        num_products: data.product_index,
        products: data.size.to_dex_fractional(),
        price: data.price.to_dex_fractional(),
        side: data.creator_side.to_dex_side(),
        operator_creator_fee_proportion: data.operator_creator_fee_proportion.to_dex_fractional(),
        operator_counterparty_fee_proportion: data
            .operator_counterparty_fee_proportion
            .to_dex_fractional(),
        is_operator_signer: true,
    };

    dex::cpi::initialize_print_trade(
        CpiContext::new(ctx.accounts.dex.to_account_info(), cpi_accounts),
        cpi_params,
    )
}