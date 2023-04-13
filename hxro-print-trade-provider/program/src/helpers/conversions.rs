use anchor_lang::AnchorDeserialize;
use dex_cpi::Fractional;
use rfq::state::{AuthoritySide, Response, Rfq};

use crate::state::ParsedLegData;

pub fn to_hxro_side(side: AuthoritySide) -> dex_cpi::typedefs::Side {
    match side {
        AuthoritySide::Taker => dex_cpi::typedefs::Side::Bid,
        AuthoritySide::Maker => dex_cpi::typedefs::Side::Ask,
    }
}

pub struct ProductInfo {
    pub product_index: u64,
    pub size: Fractional,
}

pub fn to_hxro_product(rfq: &Rfq, response: &Response, leg_index: u8) -> ProductInfo {
    let leg = &rfq.legs[leg_index as usize];
    let leg_data: ParsedLegData = AnchorDeserialize::try_from_slice(&leg.data).unwrap();

    let amount = response.get_leg_amount_to_transfer(&rfq, leg_index) as i64;

    ProductInfo {
        product_index: leg_data.product_index as u64,
        size: dex_cpi::typedefs::Fractional {
            m: amount,
            exp: leg.amount_decimals as u64,
        },
    }
}
