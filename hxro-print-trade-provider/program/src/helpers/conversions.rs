use anchor_lang::prelude::*;

use agnostic_orderbook::state::Side;
use dex::utils::numeric::Fractional;
use rfq::state::{AuthoritySide, Response, Rfq};

use crate::state::{FractionalCopy, ParsedLegData, ProductInfo};

use super::common::{get_leg_instrument_type, parse_leg_data};

pub fn to_hxro_side(side: AuthoritySide) -> Side {
    match side {
        AuthoritySide::Taker => Side::Bid,
        AuthoritySide::Maker => Side::Ask,
    }
}

pub fn to_hxro_product(
    perspective: AuthoritySide,
    rfq: &Rfq,
    response: &Response,
    leg_index: u8,
) -> Result<ProductInfo> {
    let leg = &rfq.legs[leg_index as usize];
    let instrument_type = get_leg_instrument_type(leg)?;
    let (_, ParsedLegData { product_index }) = parse_leg_data(leg, instrument_type)?;

    let mut amount = response.get_leg_amount_to_transfer(rfq, leg_index) as i64;
    if response.get_leg_assets_receiver(rfq, leg_index) == perspective.inverse() {
        amount = -amount;
    }

    let result = ProductInfo {
        product_index: product_index as u64,
        size: FractionalCopy {
            m: amount,
            exp: leg.amount_decimals as u64,
        },
    };

    Ok(result)
}

pub fn to_hxro_price(rfq: &Rfq, response: &Response) -> Fractional {
    let mut full_amount = response.get_quote_amount_to_transfer(rfq) as i64;

    if response.get_quote_tokens_receiver() == AuthoritySide::Taker {
        full_amount = -full_amount;
    }

    Fractional {
        m: full_amount,
        exp: rfq.quote_asset.decimals as u64,
    }
}
