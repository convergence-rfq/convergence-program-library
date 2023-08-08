use anchor_lang::prelude::*;
use dex::cpi::initialize_print_trade;
use dex::utils::numeric::ZERO_FRAC;
use dex::InitializePrintTradeParams;
use dex::{cpi::accounts::InitializePrintTrade, state::print_trade::PrintTradeProductIndex};
use rfq::state::AuthoritySide;

use crate::constants::OPERATOR_SEED;
use crate::{
    constants::{OPERATOR_COUNTERPARTY_FEE_PROPORTION, OPERATOR_CREATOR_FEE_PROPORTION},
    PreparePrintTradeAccounts,
};

use super::conversions::to_hxro_product;
use super::conversions::to_hxro_side;
use super::conversions::{to_hxro_price, ProductInfo};

pub fn create_print_trade<'info>(
    ctx: &Context<'_, '_, '_, 'info, PreparePrintTradeAccounts<'info>>,
    authority_side: AuthoritySide,
) -> Result<()> {
    let PreparePrintTradeAccounts {
        rfq,
        response,
        dex,
        market_product_group,
        user,
        user_trg,
        counterparty_trg,
        operator,
        operator_trg,
        print_trade,
        system_program,
        ..
    } = &ctx.accounts;

    let price = to_hxro_price(rfq, response);
    let mut products = [PrintTradeProductIndex {
        product_index: 0,
        size: ZERO_FRAC,
    }; 6];
    for i in 0..rfq.legs.len() {
        let ProductInfo {
            product_index,
            size,
        } = to_hxro_product(rfq, response, i as u8)?;
        products[i] = PrintTradeProductIndex {
            product_index: product_index as usize,
            size,
        };
    }
    let params = InitializePrintTradeParams {
        num_products: rfq.legs.len(),
        products,
        is_operator_signer: true,
        price,
        side: to_hxro_side(authority_side),
        operator_creator_fee_proportion: OPERATOR_CREATOR_FEE_PROPORTION,
        operator_counterparty_fee_proportion: OPERATOR_COUNTERPARTY_FEE_PROPORTION,
    };

    let accounts = InitializePrintTrade {
        user: user.to_account_info(),
        creator: user_trg.to_account_info(),
        counterparty: counterparty_trg.to_account_info(),
        operator: operator_trg.to_account_info(),
        market_product_group: market_product_group.to_account_info(),
        print_trade: print_trade.to_account_info(),
        system_program: system_program.to_account_info(),
        operator_owner: operator.to_account_info(),
    };

    let bump: u8 = *ctx.bumps.get("operator").unwrap();
    let context = CpiContext {
        accounts,
        remaining_accounts: vec![],
        program: dex.to_account_info(),
        signer_seeds: &[&[OPERATOR_SEED.as_bytes(), &[bump]]],
    };

    initialize_print_trade(context, params)
}