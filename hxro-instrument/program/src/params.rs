use anchor_lang::{AnchorSerialize, AnchorDeserialize};

use crate::custom_data_types::{Fractional, Side};

#[repr(C)]
#[derive(AnchorSerialize, AnchorDeserialize, PartialEq, Debug, Clone)]
pub struct SettleParams {
    pub leg_index: u8,
    pub product_index: u64,
    pub size: Fractional,
    pub price: Fractional,
    pub creator_side: Side,
    pub counterparty_side: Side,
    pub operator_creator_fee_proportion: Fractional,
    pub operator_counterparty_fee_proportion: Fractional,
}
