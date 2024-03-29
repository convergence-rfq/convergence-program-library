use anchor_lang::prelude::*;

use crate::errors::Error;
use crate::utils::convert_fixed_point_to_f64;

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

#[derive(AnchorSerialize, AnchorDeserialize, Copy, Clone)]
pub struct OptionCommonData {
    pub option_type: OptionType,
    pub underlying_amount_per_contract: u64,
    pub underlying_amount_per_contract_decimals: u8,
    pub strike_price: u64,
    pub strike_price_decimals: u8,
    pub expiration_timestamp: i64,
}

impl OptionCommonData {
    pub const SERIALIZED_SIZE: usize = 1 + 8 + 1 + 8 + 1 + 8;

    pub fn get_strike_price(&self) -> f64 {
        convert_fixed_point_to_f64(self.strike_price, self.strike_price_decimals)
    }

    pub fn get_underlying_amount_per_contract(&self) -> f64 {
        convert_fixed_point_to_f64(
            self.underlying_amount_per_contract,
            self.underlying_amount_per_contract_decimals,
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
    pub underlying_amount_per_contract_decimals: u8,
}

impl FutureCommonData {
    pub const SERIALIZED_SIZE: usize = 9;

    pub fn get_underlying_amount_per_contract(&self) -> f64 {
        convert_fixed_point_to_f64(
            self.underlying_amount_per_contract,
            self.underlying_amount_per_contract_decimals,
        )
    }
}
