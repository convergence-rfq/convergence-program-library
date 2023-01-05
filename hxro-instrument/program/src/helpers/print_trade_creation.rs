use anchor_lang::prelude::*;

use dex_cpi;
use rfq::state::{AuthoritySide, Side};

use crate::{
    state::{AuthoritySideDuplicate, ParsedLegData},
    CreatePrintTrade, MAX_PRODUCTS_PER_TRADE, OPERATOR_COUNTERPARTY_FEE_PROPORTION,
    OPERATOR_CREATOR_FEE_PROPORTION,
};

pub fn create_print_trade(
    ctx: &Context<CreatePrintTrade>,
    authority_side_duplicate: AuthoritySideDuplicate,
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

    let response = &ctx.accounts.response;
    let rfq = &ctx.accounts.rfq;

    let authority_side = match authority_side_duplicate {
        AuthoritySideDuplicate::Taker => AuthoritySide::Taker,
        AuthoritySideDuplicate::Maker => AuthoritySide::Maker,
    };

    // HXRO typed side
    let side = match response.confirmed.unwrap().side {
        Side::Bid => dex_cpi::typedefs::Side::Bid,
        Side::Ask => dex_cpi::typedefs::Side::Ask,
    };

    // create vec of PrintTradeProductIndex
    let product_vec: Vec<dex_cpi::typedefs::PrintTradeProductIndex> = rfq
        .legs
        .iter()
        .enumerate()
        .map(|(i, leg)| {
            let leg_data: ParsedLegData =
                AnchorDeserialize::try_from_slice(&leg.instrument_data).unwrap();

            dex_cpi::typedefs::PrintTradeProductIndex {
                product_index: leg_data.product_index as u64,
                size: dex_cpi::typedefs::Fractional {
                    m: response.get_leg_amount_to_transfer(&rfq, i as u8, authority_side),
                    exp: leg.instrument_decimals as u64,
                },
            }
        })
        .collect();

    // we need to pass an array with fixed size to HXRO
    let mut products = [dex_cpi::typedefs::PrintTradeProductIndex::default(); MAX_PRODUCTS_PER_TRADE];
    for i in 0..product_vec.len() {
        products[i] = product_vec[i];
    }

    let abs_price = response.get_quote_amount_to_transfer(&rfq, authority_side);
    let price = dex_cpi::typedefs::Fractional {
        m: abs_price,
        exp: 1,
    };

    let cpi_params = dex_cpi::typedefs::InitializePrintTradeParams {
        num_products: rfq.legs.len() as u64,
        products,
        price,
        side,
        operator_creator_fee_proportion: OPERATOR_CREATOR_FEE_PROPORTION,
        operator_counterparty_fee_proportion: OPERATOR_COUNTERPARTY_FEE_PROPORTION,
        is_operator_signer: false,
    };

    dex_cpi::cpi::initialize_print_trade(
        CpiContext::new(ctx.accounts.dex.to_account_info(), cpi_accounts),
        cpi_params,
    )
}