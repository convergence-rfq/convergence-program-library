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
    error::{DexError, DomainOrProgramError, DomainOrProgramResult, UtilError},
    state::{
        constants::*,
        enums::*,
        products::{Combo, Outright, Product, ProductMetadata},
    },
    utils::{
        bitset::Bitset,
        loadable::Loadable,
        numeric::{Fractional, ZERO_FRAC},
        validation::assert,
        TwoIterators,
    },
};

#[account(zero_copy)]
#[derive(AnchorSerialize, AnchorDeserialize, Default, Debug)]
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
#[derive(AnchorDeserialize)]
pub struct PrintTrade {
    pub is_initialized: bool,
    pub creator: Pubkey,
    pub counterparty: Pubkey,
    pub market_product_group: Pubkey, // technically might not need to store this
    pub num_products: usize,
    pub products: PrintTradeProducts,
    pub price: Fractional, // quantity of quote (USD) per base
    pub side: Side,
    pub operator: Pubkey,
    pub operator_creator_fee_proportion: Fractional,
    pub operator_counterparty_fee_proportion: Fractional,
    pub is_operator_signer: bool, // if false, only counterparty has to sign; if true, both operator and counterparty must sign
    pub is_collateral_locked: bool,
    pub bump: u8,
}

impl PrintTrade {
    pub const MAX_PRODUCTS_PER_TRADE: usize = 6;
    pub const SIZE: usize = std::mem::size_of::<PrintTrade>();
}
