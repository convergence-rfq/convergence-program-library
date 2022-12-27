use anchor_lang::prelude::*;

use dex_cpi as dex;
use rfq::state::{Quote, response::PriceQuote::AbsolutePrice};

use super::super::state::{ParsedLegData, ParsedQuoteData};
use super::super::CreatePrintTrade;
use super::super::MAX_PRODUCTS_PER_TRADE;

pub fn create_print_trade(ctx: &Context<CreatePrintTrade>) -> Result<()> {
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

    // HXRO typed side
    let side = match response.bid {
        Some(_) => dex::typedefs::Side::Bid,
        None => dex::typedefs::Side::Ask,
    };

    // params for the instrument data
    let ParsedQuoteData {
        operator_creator_fee_proportion,
        operator_counterparty_fee_proportion,
    } = AnchorDeserialize::try_from_slice(&rfq.quote_asset.instrument_data)?;

    // create vec of PrintTradeProductIndex
    let product_vec: Vec<dex::typedefs::PrintTradeProductIndex> = rfq
        .legs
        .iter()
        .enumerate()
        .map(|(i, leg)| {
            let leg_data: ParsedLegData = AnchorDeserialize::try_from_slice(&leg.instrument_data).unwrap();

            dex::typedefs::PrintTradeProductIndex {
                product_index: leg_data.product_index,
                size: dex::typedefs::Fractional {
                    m: response.get_leg_amount_to_transfer(&rfq, i as u8, response.print_trade_prepared_by.unwrap()),
                    exp: 10_u32.pow(leg.instrument_decimals as u32) as u64,
                },
            }
        })
        .collect();

    // we need to pass an array with fixed size to HXRO
    let mut products = [dex::typedefs::PrintTradeProductIndex::default(); MAX_PRODUCTS_PER_TRADE];
    for i in 0..product_vec.len() {
        products[i] = product_vec[i];
    }

    let abs_price =  match response.get_confirmed_quote().unwrap() {
        Quote::Standart {
            price_quote: AbsolutePrice {
                amount_bps
            },
            legs_multiplier_bps
        } => {
            amount_bps * response.calculate_confirmed_legs_multiplier_bps(
                &rfq
            ) as u128
        },
        Quote::FixedSize {
            price_quote: AbsolutePrice {
                amount_bps
            },
        } => {
            amount_bps
        }
    } as i64;
    let price = dex::typedefs::Fractional {
        m: abs_price,
        exp: 1
    };

    let cpi_params = dex_cpi::typedefs::InitializePrintTradeParams {
        num_products: rfq.legs.len() as u64,
        products,
        price,
        side,
        operator_creator_fee_proportion,
        operator_counterparty_fee_proportion,
        is_operator_signer: true,
    };

    dex::cpi::initialize_print_trade(
        CpiContext::new(ctx.accounts.dex.to_account_info(), cpi_accounts),
        cpi_params,
    )
}
