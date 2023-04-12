use std::mem;

use anchor_lang::prelude::*;
use bytemuck::{Pod, Zeroable};
use rfq::state::RiskCategory;

use crate::errors::Error;
use crate::utils::convert_fixed_point_to_f64;

#[account(zero_copy)]
pub struct Config {
    pub collateral_for_variable_size_rfq_creation: u64,
    pub collateral_for_fixed_quote_amount_rfq_creation: u64,
    pub collateral_mint_decimals: u64, // is used as u8, but represented as u64 to avoid memory padding
    pub safety_price_shift_factor: f64,
    pub overall_safety_factor: f64,
    pub accepted_oracle_staleness: u64,
    pub accepted_oracle_confidence_interval_portion: f64,
    pub risk_categories_info: [RiskCategoryInfo; 8], // 8 - mem::variant_count::<RiskCategory>
    pub instrument_types: [StoredInstrumentType; 50], // Embed ProtocolState::MAX_INSTRUMENTS to work around anchor idl generation issue
    pub padding: [u8; 6],
}

impl Config {
    pub fn get_allocated_size() -> usize {
        8 + mem::size_of::<Self>()
    }

    pub fn get_risk_info(&self, risk_category: RiskCategory) -> RiskCategoryInfo {
        self.risk_categories_info[risk_category as usize]
    }
}

const SETTLEMENT_WINDOW_PEDIODS: usize = 6;
const SETTLEMENT_WINDOW_BREAKPOINS: [u32; SETTLEMENT_WINDOW_PEDIODS - 1] = [
    60 * 60,
    4 * 60 * 60,
    12 * 60 * 60,
    24 * 60 * 60,
    48 * 60 * 60,
];

#[zero_copy]
#[derive(AnchorSerialize, AnchorDeserialize, Default)]
pub struct RiskCategoryInfo {
    pub interest_rate: f64,
    pub annualized_30_day_volatility: f64,
    pub scenario_per_settlement_period: [Scenario; SETTLEMENT_WINDOW_PEDIODS],
}

impl RiskCategoryInfo {
    pub fn get_base_scenario(&self, settlement_duration: u32) -> Scenario {
        let mut index = SETTLEMENT_WINDOW_PEDIODS - 1;
        for (i, breakpoint) in SETTLEMENT_WINDOW_BREAKPOINS.into_iter().enumerate() {
            if settlement_duration < breakpoint {
                index = i;
                break;
            }
        }

        self.scenario_per_settlement_period[index]
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Copy, Clone, Default, Zeroable, Pod)]
#[repr(C)]
pub struct Scenario {
    pub base_asset_price_change: f64,
    pub volatility_change: f64,
}

impl Scenario {
    pub fn new(base_asset_price_change: f64, volatility_change: f64) -> Self {
        Self {
            base_asset_price_change,
            volatility_change,
        }
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Copy, Clone, Debug)]
pub enum StoredInstrumentType {
    Missing = 0,
    Spot = 1,
    Option = 2,
    TermFuture = 3,
    PerpFuture = 4,
}

impl Default for StoredInstrumentType {
    fn default() -> Self {
        Self::Missing
    }
}

unsafe impl Zeroable for StoredInstrumentType {} // Allows 0 value, so it's okay
unsafe impl Pod for StoredInstrumentType {} // Does not allow for all bit patterns, but it is okay in our case as only the program can set this byte

#[derive(AnchorSerialize, AnchorDeserialize, Copy, Clone, Debug)]
pub enum InstrumentType {
    Spot = 1,
    Option = 2,
    TermFuture = 3,
    PerpFuture = 4,
}

impl TryFrom<u8> for InstrumentType {
    type Error = Error;

    fn try_from(value: u8) -> std::result::Result<Self, Self::Error> {
        match value {
            v if v == InstrumentType::Spot as u8 => Ok(InstrumentType::Spot),
            v if v == InstrumentType::Option as u8 => Ok(InstrumentType::Option),
            v if v == InstrumentType::TermFuture as u8 => Ok(InstrumentType::TermFuture),
            v if v == InstrumentType::PerpFuture as u8 => Ok(InstrumentType::PerpFuture),
            _ => Err(Error::FailedToExtractInstrumentType),
        }
    }
}

impl TryFrom<StoredInstrumentType> for InstrumentType {
    type Error = Error;

    fn try_from(value: StoredInstrumentType) -> std::result::Result<Self, Self::Error> {
        InstrumentType::try_from(value as u8)
    }
}

impl From<InstrumentType> for StoredInstrumentType {
    fn from(value: InstrumentType) -> Self {
        match value {
            InstrumentType::Spot => StoredInstrumentType::Spot,
            InstrumentType::Option => StoredInstrumentType::Option,
            InstrumentType::TermFuture => StoredInstrumentType::TermFuture,
            InstrumentType::PerpFuture => StoredInstrumentType::PerpFuture,
        }
    }
}
#[derive(AnchorSerialize, AnchorDeserialize, Copy, Clone)]
pub struct OptionCommonData {
    pub option_type: OptionType,
    pub underlying_amount_per_contract: u64,
    pub underlying_amound_per_contract_decimals: u8,
    pub strike_price: u64,
    pub strike_price_decimals: u8,
    pub expiration_timestamp: i64,
}

impl OptionCommonData {
    pub const SERIALIZED_SIZE: usize = 1 + 8 + 1 + 8 + 1 + 8;

    pub fn get_strike_price(&self) -> f64 {
        convert_fixed_point_to_f64(self.strike_price.into(), self.strike_price_decimals)
    }

    pub fn get_underlying_amount_per_contract(&self) -> f64 {
        convert_fixed_point_to_f64(
            self.underlying_amount_per_contract.into(),
            self.underlying_amound_per_contract_decimals,
        )
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Copy, Clone)]
pub enum OptionType {
    Call,
    Put,
}

#[derive(AnchorSerialize, AnchorDeserialize, Copy, Clone)]
pub struct FutureCommonData {
    pub underlying_amount_per_contract: u64,
    pub underlying_amound_per_contract_decimals: u8,
}

impl FutureCommonData {
    pub const SERIALIZED_SIZE: usize = 8;

    pub fn get_underlying_amount_per_contract(&self) -> f64 {
        convert_fixed_point_to_f64(
            self.underlying_amount_per_contract.into(),
            self.underlying_amound_per_contract_decimals,
        )
    }
}
