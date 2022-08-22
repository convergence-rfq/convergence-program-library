use anchor_lang::prelude::*;
use rfq::states::{Response, Rfq};

declare_id!("E3mS5KjyhgZ5yP9ff3psQb7KsQfBJYTfiwGczE2kVN5R");

#[program]
pub mod dummy_risk_engine {
    use super::*;

    pub fn calculate_collateral_for_rfq(
        _ctx: Context<CalculateRequiredCollateralForRfq>,
    ) -> Result<u64> {
        Ok(1_000_000_000)
    }

    pub fn calculate_collateral_for_response(
        _ctx: Context<CalculateRequiredCollateralForResponse>,
    ) -> Result<u64> {
        Ok(2_000_000_000)
    }

    pub fn calculate_collateral_for_confirmation(
        _ctx: Context<CalculateRequiredCollateralForConfirmation>,
    ) -> Result<u64> {
        Ok(3_000_000_000)
    }
}

#[derive(Accounts)]
pub struct CalculateRequiredCollateralForRfq<'info> {
    pub rfq: Account<'info, Rfq>,
}

#[derive(Accounts)]
pub struct CalculateRequiredCollateralForResponse<'info> {
    pub rfq: Account<'info, Rfq>,
    pub response: Account<'info, Response>,
}

#[derive(Accounts)]
pub struct CalculateRequiredCollateralForConfirmation<'info> {
    pub rfq: Account<'info, Rfq>,
    pub response: Account<'info, Response>,
}
