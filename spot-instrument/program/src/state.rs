use anchor_lang::prelude::*;

use crate::errors::SpotError;

#[account]
#[derive(InitSpace)]
pub struct Config {
    pub fee_bps: u64,
}

impl Config {
    pub const BPS_DECIMALS: usize = 9;

    pub fn calculate_fees(&self, amount: u64) -> u64 {
        let result =
            (amount as u128) * (self.fee_bps as u128) / 10_u128.pow(Self::BPS_DECIMALS as u32);

        result as u64
    }

    pub fn validate(&self) -> Result<()> {
        if self.fee_bps > 10_u64.pow(Self::BPS_DECIMALS as u32) {
            return err!(SpotError::InvalidFee);
        }
        Ok(())
    }
}
