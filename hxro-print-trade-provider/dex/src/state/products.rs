use std::{
    mem::size_of,
    ops::{Deref, DerefMut},
};

use anchor_lang::prelude::*;
use bytemuck::{Pod, Zeroable};
use serde::{Deserialize, Serialize};

use crate::{
    state::{constants::MAX_LEGS, enums::ProductStatus, market_product_group::PriceEwma},
    utils::{numeric::ZERO_FRAC, TwoIterators},
    Fractional, NAME_LEN,
};

#[derive(Eq, Debug, PartialEq, Clone, Copy, AnchorDeserialize, Deserialize, Serialize)]
#[repr(C, u64)]
/// Unify Outright and Combo
pub enum Product {
    Outright { outright: Outright },
    Combo { combo: Combo },
}

unsafe impl Pod for Product {}

#[zero_copy]
#[derive(Debug, Eq, PartialEq, AnchorDeserialize, Deserialize, Serialize)] // serde
/// A market product corresponding to one underlying asset
pub struct Outright {
    pub metadata: ProductMetadata,
    pub num_queue_events: usize,
    pub product_status: ProductStatus,
    pub dust: Fractional,
    pub cum_funding_per_share: Fractional,
    pub cum_social_loss_per_share: Fractional,
    pub open_long_interest: Fractional,
    pub open_short_interest: Fractional,
    pub padding: [u64; 14],
}

#[zero_copy]
#[derive(Debug, Eq, PartialEq, AnchorSerialize, AnchorDeserialize, Deserialize, Serialize)] // serde
/// Shared fields between Outright and Combo products
pub struct ProductMetadata {
    pub bump: u64,
    pub product_key: Pubkey,
    pub name: [u8; NAME_LEN],
    pub orderbook: Pubkey,
    // Negative+Fractional Price
    pub tick_size: Fractional,
    pub base_decimals: u64,
    pub price_offset: Fractional,
    pub contract_volume: Fractional,
    // Prices
    pub prices: PriceEwma,
}

#[zero_copy]
#[derive(Debug, Eq, PartialEq, AnchorSerialize, AnchorDeserialize, Deserialize, Serialize)] // serde
/// A market product with multiple legs that are each outrights
pub struct Combo {
    pub metadata: ProductMetadata,
    pub num_legs: usize,
    pub legs: [Leg; MAX_LEGS],
}

impl Default for Combo {
    fn default() -> Self {
        unsafe { std::mem::zeroed() }
    }
}

impl Combo {
    pub fn legs(&self) -> &[Leg] {
        &self.legs[..self.num_legs]
    }

    pub fn has_leg(&self, product_key: Pubkey) -> bool {
        self.legs
            .iter()
            .take(self.num_legs)
            .any(|l| l.product_key == product_key)
    }

    pub fn get_product_key_seeds(&self) -> Vec<u8> {
        let mut seeds = Vec::<u8>::with_capacity((size_of::<Pubkey>() + 1) * self.num_legs);
        for leg in self.legs.iter().take(self.num_legs) {
            seeds.extend(leg.product_key.to_bytes().iter());
        }
        for leg in self.legs.iter().take(self.num_legs) {
            seeds.extend((leg.ratio as i8).to_le_bytes().iter());
        }
        seeds
    }
}

#[zero_copy]
#[derive(
    Debug, Default, Eq, AnchorSerialize, AnchorDeserialize, PartialEq, Deserialize, Serialize,
)] // serde
/// One part of a combo. Each leg corresponds to an outright with the ratio determining
/// relative weighting
pub struct Leg {
    pub product_index: usize,
    pub product_key: Pubkey,
    pub ratio: i64,
}

impl Deref for Outright {
    type Target = ProductMetadata;

    fn deref(&self) -> &Self::Target {
        &self.metadata
    }
}

impl DerefMut for Outright {
    fn deref_mut(&mut self) -> &mut Self::Target {
        &mut self.metadata
    }
}

impl Deref for Combo {
    type Target = ProductMetadata;

    fn deref(&self) -> &Self::Target {
        &self.metadata
    }
}

impl DerefMut for Combo {
    fn deref_mut(&mut self) -> &mut Self::Target {
        &mut self.metadata
    }
}

impl Default for Outright {
    fn default() -> Self {
        unsafe { std::mem::zeroed() }
    }
}

unsafe impl Zeroable for Product {}

impl DerefMut for Product {
    fn deref_mut(&mut self) -> &mut Self::Target {
        match self {
            Product::Outright { outright: x } => &mut x.metadata,
            Product::Combo { combo: x } => &mut x.metadata,
        }
    }
}

impl Deref for Product {
    type Target = ProductMetadata;

    fn deref(&self) -> &Self::Target {
        match self {
            Product::Outright { outright: x } => &x.metadata,
            Product::Combo { combo: x } => &x.metadata,
        }
    }
}

impl Default for Product {
    fn default() -> Self {
        unsafe { std::mem::zeroed() }
    }
}
