use std::ops::{Deref, DerefMut};

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
        bitset::Bitset,
        numeric::{Fractional, ZERO_FRAC},
        TwoIterators,
    },
};

/// The highest level organizational unit of the Dex.
/// Market product groups exist independently of each other.
/// i.e. each trader, product etc, corresponds to exactly one market product group.
#[account(zero_copy(unsafe))]
#[derive(Deserialize, Serialize)] // serde
pub struct MarketProductGroup {
    // TODO: add aaob program id
    pub tag: AccountTag,
    pub name: [u8; NAME_LEN],
    pub authority: Pubkey,
    // The future authority of the MarketProductGroup
    pub successor: Pubkey,
    pub vault_mint: Pubkey,
    pub collected_fees: Fractional,
    pub fee_collector: Pubkey,
    pub decimals: u64,
    pub risk_engine_program_id: Pubkey,
    pub fee_model_program_id: Pubkey,
    pub fee_model_configuration_acct: Pubkey,
    pub risk_model_configuration_acct: Pubkey,
    pub active_flags_products: Bitset,
    pub ewma_windows: [u64; 4],
    pub market_products: ProductArray,
    pub vault_bump: u16,
    pub risk_and_fee_bump: u16,
    pub find_fees_discriminant_len: u16,
    pub validate_account_discriminant_len: u16,
    pub find_fees_discriminant: [u8; 8],
    pub validate_account_health_discriminant: [u8; 8],
    pub validate_account_liquidation_discriminant: [u8; 8],
    pub create_risk_state_account_discriminant: [u8; 8],
    pub max_maker_fee_bps: i16,
    pub min_maker_fee_bps: i16,
    pub max_taker_fee_bps: i16,
    pub min_taker_fee_bps: i16,
    pub fee_output_register: Pubkey,
    pub risk_output_register: Pubkey,
    pub sequence_number: u128,
    pub staking_fee_collector: Pubkey,
    pub is_killed: bool,
    pub create_fee_state_account_discriminant: [u8; 8],
}

impl Default for MarketProductGroup {
    fn default() -> Self {
        unsafe { std::mem::zeroed() }
    }
}

impl IsInitialized for MarketProductGroup {
    fn is_initialized(&self) -> bool {
        match self.tag {
            AccountTag::MarketProductGroup | AccountTag::MarketProductGroupWithCombos => true,
            _ => false,
        }
    }
}

#[zero_copy]
#[derive(
    Default, Debug, Eq, PartialEq, AnchorSerialize, AnchorDeserialize, Serialize, Deserialize,
)]
pub struct PriceEwma {
    pub ewma_bid: [Fractional; 4],
    pub ewma_ask: [Fractional; 4],
    pub bid: Fractional,
    pub ask: Fractional,
    pub slot: u64,
    pub prev_bid: Fractional,
    pub prev_ask: Fractional,
}

impl PriceEwma {
    pub fn initialize(&mut self, slot: u64) {
        self.slot = slot;
        for ewma in self.ewma_bid.iter_mut() {
            *ewma = NO_BID_PRICE;
        }
        for ewma in self.ewma_ask.iter_mut() {
            *ewma = NO_ASK_PRICE;
        }
        self.bid = NO_BID_PRICE;
        self.ask = NO_ASK_PRICE;
        self.prev_bid = NO_BID_PRICE;
        self.prev_ask = NO_ASK_PRICE;
    }
}

#[account(zero_copy)]
#[derive(Serialize, Deserialize)]
#[repr(transparent)]
pub struct ProductArray {
    #[serde(with = "BigArray")]
    pub array: [Product; 256],
}

impl Deref for ProductArray {
    type Target = [Product; 256];

    fn deref(&self) -> &Self::Target {
        &self.array
    }
}

impl DerefMut for ProductArray {
    fn deref_mut(&mut self) -> &mut Self::Target {
        &mut self.array
    }
}
