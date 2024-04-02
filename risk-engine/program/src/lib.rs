#![allow(clippy::result_large_err)]

use anchor_lang::prelude::*;
use rfq::state::{Response, Rfq};

pub mod errors;
pub mod state;
pub mod utils;

declare_id!("CtfTi4TstqJaxEh8giQ7kK8CKXsJyF9CuwdcVoqGrEi1");

pub const CONFIG_SEED: &str = "config";

#[program]
pub mod risk_engine {
    use super::*;

    pub fn calculate_collateral_for_rfq(
        _ctx: Context<CalculateRequiredCollateralForRfq>,
    ) -> Result<u64> {
        Ok(0)
    }

    pub fn calculate_collateral_for_response(
        _ctx: Context<CalculateRequiredCollateralForResponse>,
    ) -> Result<u64> {
        Ok(0)
    }

    pub fn calculate_collateral_for_confirmation(
        _ctx: Context<CalculateRequiredCollateralForConfirmation>,
    ) -> Result<(u64, u64)> {
        Ok((0, 0))
    }
}

#[derive(Accounts)]
pub struct CalculateRequiredCollateralForRfq<'info> {
    pub rfq: Box<Account<'info, Rfq>>,
}

#[derive(Accounts)]
pub struct CalculateRequiredCollateralForResponse<'info> {
    pub rfq: Box<Account<'info, Rfq>>,
    pub response: Account<'info, Response>,
}

#[derive(Accounts)]
pub struct CalculateRequiredCollateralForConfirmation<'info> {
    pub rfq: Box<Account<'info, Rfq>>,
    pub response: Account<'info, Response>,
}
