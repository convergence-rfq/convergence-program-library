use anchor_lang::AnchorDeserialize;
use dex_cpi::Fractional;
use rfq::state::{AuthoritySide, Response, Rfq, Side};

use crate::state::ParsedLegData;

pub fn to_hxro_side(response: &Response) -> dex_cpi::typedefs::Side {
    match response.confirmed.unwrap().side {
        Side::Bid => dex_cpi::typedefs::Side::Bid,
        Side::Ask => dex_cpi::typedefs::Side::Ask,
    }
}

pub struct ProductInfo {
    pub product_index: u64,
    pub size: Fractional,
}

pub fn to_hxro_product(
    rfq: &Rfq,
    response: &Response,
    authority_side: AuthoritySide,
    leg_index: u8,
) -> ProductInfo {
    let leg = &rfq.legs[leg_index as usize];
    let leg_data: ParsedLegData = AnchorDeserialize::try_from_slice(&leg.instrument_data).unwrap();

    let mut amount = response.get_leg_amount_to_transfer(&rfq, leg_index) as i64;
    if authority_side != response.get_leg_assets_receiver(&rfq, leg_index) {
        amount = -amount;
    }

    ProductInfo {
        product_index: leg_data.product_index as u64,
        size: dex_cpi::typedefs::Fractional {
            m: amount,
            exp: leg.instrument_decimals as u64,
        },
    }
}
