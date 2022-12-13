use std::mem;

use anchor_lang::prelude::*;

use crate::errors::ProtocolError;

#[account]
pub struct ProtocolState {
    // Protocol initiator
    pub authority: Pubkey,
    pub bump: u8,

    // Active protocol means all instructions are executable
    pub active: bool,

    pub settle_fees: FeeParameters,
    pub default_fees: FeeParameters,

    pub risk_engine: Pubkey,
    pub collateral_mint: Pubkey,
    pub instruments: Vec<Instrument>,
}

impl ProtocolState {
    pub const MAX_INSTRUMENTS: usize = 50;

    pub fn get_allocated_size() -> usize {
        // mem::size_of can include unwanted additional overhead padding
        // TODO: rework from pre-allocating to reallocating on new elements addition
        8 + mem::size_of::<Self>() + Self::MAX_INSTRUMENTS * mem::size_of::<Instrument>()
    }

    pub fn get_instrument_parameters(&self, instrument_key: Pubkey) -> Result<&Instrument> {
        self.instruments
            .iter()
            .find(|x| x.program_key == instrument_key)
            .ok_or_else(|| error!(ProtocolError::NotAWhitelistedInstrument))
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Copy, Clone)]
pub struct Instrument {
    pub program_key: Pubkey,
    pub validate_data_account_amount: u8,
    pub prepare_to_settle_account_amount: u8,
    pub settle_account_amount: u8,
    pub revert_preparation_account_amount: u8,
    pub clean_up_account_amount: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Copy, Clone)]
pub struct FeeParameters {
    taker_bps: u64,
    maker_bps: u64,
}

impl FeeParameters {
    pub const BPS_DECIMALS: usize = 9;
}

#[account]
pub struct BaseAssetInfo {
    pub bump: u8,
    pub index: BaseAssetIndex,
    pub risk_category: RiskCategory,
    pub price_oracle: PriceOracle,
    pub ticker: String,
}

#[derive(AnchorSerialize, AnchorDeserialize, Copy, Clone, PartialEq, Eq, Hash)]
pub struct BaseAssetIndex {
    value: u16,
}

impl BaseAssetIndex {
    pub const fn new(value: u16) -> Self {
        Self { value }
    }
}

impl From<BaseAssetIndex> for u16 {
    fn from(converted: BaseAssetIndex) -> Self {
        converted.value
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Copy, Clone, PartialEq, Eq)]
pub enum RiskCategory {
    VeryLow,
    Low,
    Medium,
    High,
    VeryHigh,
}

#[derive(AnchorSerialize, AnchorDeserialize, Copy, Clone)]
pub enum PriceOracle {
    Switchboard { address: Pubkey },
}

#[account]
pub struct MintInfo {
    pub bump: u8,
    pub mint_address: Pubkey,
    pub decimals: u8,
    pub base_asset_index: BaseAssetIndex,
}
