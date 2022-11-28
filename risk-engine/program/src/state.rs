use std::{collections::HashMap, mem};

use anchor_lang::prelude::*;
use rfq::state::{ProtocolState, RiskCategory};

use crate::fraction::Fraction;

#[account]
pub struct Config {
    pub bump: u8,
    pub collateral_for_variable_size_rfq_creation: u64,
    pub collateral_for_fixed_quote_amount_rfq_creation: u64,
    pub collateral_mint_decimals: u8,
    pub safety_price_shift_factor: Fraction,
    pub overall_safety_factor: Fraction,
    pub risk_categories_info: [RiskCategoryInfo; 5],
    pub instrument_types: Vec<InstrumentInfo>,
}

impl Config {
    pub fn get_allocated_size() -> usize {
        // mem::size_of can include unwanted additional overhead padding
        // TODO: rework from pre-allocating to reallocating on new elements addition
        8 + mem::size_of::<Self>()
            + ProtocolState::MAX_INSTRUMENTS * mem::size_of::<InstrumentInfo>()
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

#[derive(AnchorSerialize, AnchorDeserialize, Copy, Clone)]
pub struct InstrumentInfo {
    pub program: Pubkey,
    pub r#type: InstrumentType,
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
    pub interest_rate: Fraction,
    pub yearly_volatility: Fraction,
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
    pub base_asset_price_change: Fraction,
    pub volatility_change: Fraction,
}

impl Scenario {
    pub fn new(base_asset_price_change: Fraction, volatility_change: Fraction) -> Self {
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

    pub fn get_strike_price(&self) -> Fraction {
        Fraction::new(self.strike_price.into(), Self::STRIKE_PRICE_DECIMALS)
    }

    pub fn get_underlying_amount_per_contract(&self) -> Fraction {
        Fraction::new(
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
