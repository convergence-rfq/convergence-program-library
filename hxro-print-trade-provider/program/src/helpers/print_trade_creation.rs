use anchor_lang::prelude::*;
use rfq::state::AuthoritySide;

use dex_cpi;

use crate::{
    SettlePrintTradeAccounts, OPERATOR_COUNTERPARTY_FEE_PROPORTION, OPERATOR_CREATOR_FEE_PROPORTION,
};

use super::conversions::to_hxro_price;
use super::conversions::to_hxro_product;
use super::conversions::to_hxro_side;

pub fn create_print_trade<'info>(
    ctx: &Context<'_, '_, '_, 'info, SettlePrintTradeAccounts<'info>>,
) -> Result<()> {
    let SettlePrintTradeAccounts { rfq, response, .. } = &ctx.accounts;

    let side = to_hxro_side(AuthoritySide::Taker);
    let product = to_hxro_product(rfq, response, 0);
    let price = to_hxro_price(rfq, response);

    let params = dex_cpi::typedefs::InitializePrintTradeParams {
        product_index: product.product_index,
        size: product.size,
        price,
        side,
        operator_creator_fee_proportion: OPERATOR_CREATOR_FEE_PROPORTION,
        operator_counterparty_fee_proportion: OPERATOR_COUNTERPARTY_FEE_PROPORTION,
    };

    let accounts = dex_cpi::cpi::accounts::InitializePrintTrade {
        user: ctx.accounts.taker.to_account_info(),
        creator: ctx.accounts.creator.to_account_info(),
        counterparty: ctx.accounts.counterparty.to_account_info(),
        operator: ctx.accounts.operator.to_account_info(),
        market_product_group: ctx.accounts.market_product_group.to_account_info(),
        product: ctx.accounts.product.to_account_info(),
        print_trade: ctx.accounts.print_trade.to_account_info(),
        system_program: ctx.accounts.system_program.to_account_info(),
    };

    let context = CpiContext {
        accounts,
        remaining_accounts: ctx.remaining_accounts.to_vec(),
        program: ctx.accounts.dex.to_account_info(),
        signer_seeds: &[],
    };

    dex_cpi::cpi::initialize_print_trade(context, params)
}
