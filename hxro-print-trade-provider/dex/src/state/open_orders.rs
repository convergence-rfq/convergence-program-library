use crate::{
    state::{constants::*, products::Product},
    utils::numeric::{Fractional, ZERO_FRAC},
};

use agnostic_orderbook::state::{get_side_from_order_id, Side};

use anchor_lang::{
    prelude::*,
    solana_program::{msg, program_error::ProgramError},
};

#[zero_copy]
pub struct OpenOrdersMetadata {
    pub ask_qty_in_book: Fractional,
    pub bid_qty_in_book: Fractional,
    pub head_index: usize,
    pub num_open_orders: u64,
}

#[zero_copy]
pub struct OpenOrders {
    pub free_list_head: usize,
    pub total_open_orders: u64,
    pub products: [OpenOrdersMetadata; MAX_PRODUCTS],
    pub orders: [OpenOrdersNode; MAX_OPEN_ORDERS],
}

#[zero_copy]
pub struct OpenOrdersNode {
    pub id: u128,
    pub qty: u64,
    pub client_id: u64,
    pub prev: usize,
    pub next: usize,
}
