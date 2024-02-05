use crate::{
    state::{constants::*, products::Product},
    utils::numeric::{Fractional, ZERO_FRAC},
};

use agnostic_orderbook::state::{get_side_from_order_id, Side};

use anchor_lang::{
    prelude::*,
    solana_program::{msg, program_error::ProgramError},
};

#[zero_copy(unsafe)]
pub struct OpenOrdersMetadata {
    pub ask_qty_in_book: i64,
    pub bid_qty_in_book: i64,
    pub head_index: u16,
    pub num_open_orders: u16,
}

#[zero_copy(unsafe)]
pub struct OpenOrders {
    pub free_list_head: u16,
    pub total_open_orders: u16,
    pub max_open_orders: u16,
    pub products: [OpenOrdersMetadata; MAX_PRODUCTS],
    pub orders: [OpenOrdersNode; MAX_OPEN_ORDERS],
}

#[zero_copy(unsafe)]
pub struct OpenOrdersNode {
    pub id: u128,
    pub qty: u64,
    pub client_id: u64,
    pub prev: u16,
    pub next: u16,
}
