use anchor_lang::prelude::*;
use dex::cpi::initialize_print_trade as initialize_print_trade_cpi;
use dex::utils::numeric::ZERO_FRAC;
use dex::InitializePrintTradeParams;
use dex::{cpi::accounts::InitializePrintTrade, state::print_trade::PrintTradeProductIndex};
use rfq::state::AuthoritySide;

use crate::constants::OPERATOR_SEED;
use crate::state::ProductInfo;
use crate::{
    constants::{OPERATOR_COUNTERPARTY_FEE_PROPORTION, OPERATOR_CREATOR_FEE_PROPORTION},
    PreparePrintTradeAccounts,
};

use super::conversions::to_hxro_price;
use super::conversions::to_hxro_product;
use super::conversions::to_hxro_side;

pub fn initialize_print_trade<'info>(
    ctx: &Context<'_, '_, '_, 'info, PreparePrintTradeAccounts<'info>>,
    authority_side: AuthoritySide,
) -> Result<()> {
    let PreparePrintTradeAccounts {
        rfq,
        response,
        dex,
        market_product_group,
        user,
        taker_trg,
        maker_trg,
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
    for (i, product) in products.iter_mut().enumerate().take(rfq.legs.len()) {
        let ProductInfo {
            product_index,
            size,
        } = to_hxro_product(AuthoritySide::Taker, rfq, response, i as u8)?;
        *product = PrintTradeProductIndex {
            product_index: product_index as usize,
            size: size.into(),
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

    let (creator_trg, counterparty_trg) = if authority_side == AuthoritySide::Taker {
        (taker_trg, maker_trg)
    } else {
        (maker_trg, taker_trg)
    };

    let accounts = InitializePrintTrade {
        user: user.to_account_info(),
        creator: creator_trg.to_account_info(),
        counterparty: counterparty_trg.to_account_info(),
        operator: operator_trg.to_account_info(),
        market_product_group: market_product_group.to_account_info(),
        print_trade: print_trade.to_account_info(),
        system_program: system_program.to_account_info(),
        operator_owner: operator.to_account_info(),
        seed: response.to_account_info(),
    };

    let bump: u8 = *ctx.bumps.get("operator").unwrap();
    let context = CpiContext {
        accounts,
        remaining_accounts: vec![],
        program: dex.to_account_info(),
        signer_seeds: &[&[OPERATOR_SEED.as_bytes(), &[bump]]],
    };

    initialize_print_trade_cpi(context, params)
}
