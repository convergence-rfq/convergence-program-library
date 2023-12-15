use std::ops::{Deref, DerefMut};

use agnostic_orderbook::state::Side;
use anchor_lang::{
    prelude::*,
    solana_program::{
        entrypoint::ProgramResult, program_error::ProgramError, program_pack::IsInitialized,
        pubkey::Pubkey,
    },
};
use bytemuck::{Pod, Zeroable};
use itertools::Itertools;
use serde::{Deserialize, Deserializer, Serialize, Serializer};
use serde_big_array::BigArray;

use crate::{
    state::{
        constants::*,
        enums::*,
        products::{Combo, Outright, Product, ProductMetadata},
    },
    utils::{
        numeric::{Fractional, ZERO_FRAC},
        TwoIterators,
    },
};

#[account(zero_copy(unsafe))]
#[derive(Default, Debug)]
pub struct PrintTradeProduct {
    pub product_key: Pubkey, // verify that the product at the given index is this one
    pub size: Fractional,    // quantity of base (e.g. BTCUSD contract)
}

#[account(zero_copy)]
#[derive(AnchorSerialize, AnchorDeserialize, Default, Debug)]
pub struct PrintTradeProductIndex {
    pub product_index: usize,
    pub size: Fractional, // quantity of base (e.g. BTCUSD contract)
}

// #[derive(AnchorSerialize, AnchorDeserialize, Default, Debug)] not allowed on arrays
pub type PrintTradeProducts = [PrintTradeProduct; PrintTrade::MAX_PRODUCTS_PER_TRADE];
// #[derive(AnchorSerialize, AnchorDeserialize, Default, Debug)] not allowed on arrays
pub type PrintTradeProductIndexes = [PrintTradeProductIndex; PrintTrade::MAX_PRODUCTS_PER_TRADE];

#[account(zero_copy(unsafe))]
#[derive(Debug)]
pub struct PrintTrade {
    pub is_initialized: bool,
    pub creator: Pubkey,
    pub counterparty: Pubkey,
    pub seed: Pubkey,
    pub market_product_group: Pubkey, // technically might not need to store this
    pub strange_padding: [u8; 7], // for some reason, account parsing is misaligned without this padding
    pub num_products: usize,
    pub products: PrintTradeProducts,
    pub price: Fractional, // quantity of quote (USD) per base
    pub side: Side,
    pub operator: Pubkey,
    pub operator_creator_fee_proportion: Fractional,
    pub operator_counterparty_fee_proportion: Fractional,
    pub strange_padding_2: [u8; 7], // for some reason, account parsing is misaligned without this padding
    pub is_signed: bool,
    pub is_cancelled: CancelStatus,
    pub bump: u8,
}

impl PrintTrade {
    pub const MAX_PRODUCTS_PER_TRADE: usize = 6;
    pub const SIZE: usize = std::mem::size_of::<PrintTrade>();
}

#[derive(AnchorSerialize, AnchorDeserialize, Copy, Clone, Debug, PartialEq)]
#[repr(u8)]
pub enum CancelStatus {
    Active,
    CreatorCancelled,
    CounterpartyCancelled,
}

#[account(zero_copy(unsafe))]
pub struct PrintTradeExecutionOutput {
    pub result: PrintTradeExecutionResult,
}

#[derive(Copy, Clone, Debug, PartialEq)]
#[repr(u8)]
pub enum PrintTradeExecutionResult {
    CounterpartyHasntSigned,
    CreatorCancelled,
    CounterpartyCancelled,
    CreatorNotEnoughLockedCollateral,
    CounterpartyNotEnoughLockedCollateral,
    Success,
}
