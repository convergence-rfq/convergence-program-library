use std::{collections::HashMap, mem};

use anchor_lang::prelude::*;
use rfq::state::RiskCategory;

use crate::utils::convert_fixed_point_to_f64;

#[account(zero_copy)]
pub struct Config {
    pub collateral_for_variable_size_rfq_creation: u64,
    pub collateral_for_fixed_quote_amount_rfq_creation: u64,
    pub collateral_mint_decimals: u8,
    pub safety_price_shift_factor: f64,
    pub overall_safety_factor: f64,
    pub risk_categories_info: [RiskCategoryInfo; 5],
    pub instrument_types: [InstrumentInfo; 50], // Embed ProtocolState::MAX_INSTRUMENTS to work around anchor idl generation issue
}

impl Config {
    pub fn get_allocated_size() -> usize {
        8 + mem::size_of::<Self>()
    }

    pub fn get_risk_info(&self, risk_category: RiskCategory) -> RiskCategoryInfo {
        self.risk_categories_info[risk_category as usize]
    }

    pub fn get_instrument_types_map(&self) -> HashMap<Pubkey, InstrumentType> {
        self.instrument_types
            .iter()
            .map(|x| (x.program, x.r#type))
            .collect()
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Copy, Clone, Default)]
pub struct InstrumentInfo {
    pub program: Pubkey,
    pub r#type: InstrumentType,
}

impl InstrumentInfo {
    pub fn is_initialized(&self) -> bool {
        self.program != Pubkey::default()
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

#[derive(AnchorSerialize, AnchorDeserialize, Copy, Clone, Default)]
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

#[derive(AnchorSerialize, AnchorDeserialize, Copy, Clone, Default)]
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
pub enum InstrumentType {
    Spot,
    Option,
    TermFuture,
    PerpFuture,
}

impl Default for InstrumentType {
    fn default() -> Self {
        Self::Spot
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Copy, Clone)]
pub struct OptionCommonData {
    pub option_type: OptionType,
    pub underlying_amount_per_contract: u64,
    pub strike_price: u64,
    pub expiration_timestamp: i64,
}

impl OptionCommonData {
    pub const STRIKE_PRICE_DECIMALS: u8 = 9;
    pub const UNDERLYING_AMOUNT_PER_CONTRACT_DECIMALS: u8 = 9;
    pub const SERIALIZED_SIZE: usize = 1 + 8 + 8 + 8;

    pub fn get_strike_price(&self) -> f64 {
        convert_fixed_point_to_f64(self.strike_price.into(), Self::STRIKE_PRICE_DECIMALS)
    }

    pub fn get_underlying_amount_per_contract(&self) -> f64 {
        convert_fixed_point_to_f64(
            self.underlying_amount_per_contract.into(),
            Self::UNDERLYING_AMOUNT_PER_CONTRACT_DECIMALS,
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
}

impl FutureCommonData {
    pub const UNDERLYING_AMOUNT_PER_CONTRACT_DECIMALS: u8 = 9;
    pub const SERIALIZED_SIZE: usize = 8;

    pub fn get_underlying_amount_per_contract(&self) -> f64 {
        convert_fixed_point_to_f64(
            self.underlying_amount_per_contract.into(),
            Self::UNDERLYING_AMOUNT_PER_CONTRACT_DECIMALS,
        )
    }
}
