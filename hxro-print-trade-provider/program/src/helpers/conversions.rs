use anchor_lang::AnchorDeserialize;

use dex::utils::numeric::Fractional;
use rfq::state::{AuthoritySide, Response, Rfq};

use crate::state::ParsedLegData;

// pub fn to_hxro_side(side: AuthoritySide) -> Side {
//     match side {
//         AuthoritySide::Taker => Side::Bid,
//         AuthoritySide::Maker => Side::Ask,
//     }
// }

pub struct ProductInfo {
    pub product_index: u64,
    pub size: Fractional,
}

pub fn to_hxro_product(rfq: &Rfq, response: &Response, leg_index: u8) -> ProductInfo {
    let leg = &rfq.legs[leg_index as usize];
    let leg_data: ParsedLegData = AnchorDeserialize::try_from_slice(&leg.data).unwrap();

    let mut amount = response.get_leg_amount_to_transfer(&rfq, leg_index) as i64;
    if response.get_leg_assets_receiver(rfq, leg_index) == AuthoritySide::Maker {
        amount = -amount;
    }

    ProductInfo {
        product_index: leg_data.product_index as u64,
        size: Fractional {
            m: amount,
            exp: leg.amount_decimals as u64,
        },
    }
}

pub fn to_hxro_price(rfq: &Rfq, response: &Response) -> Fractional {
    let full_amount = response.get_quote_amount_to_transfer(rfq) as i64;

    Fractional {
        m: full_amount,
        exp: rfq.quote_asset.decimals as u64,
    } // missing division by the amount in leg
}
