use anchor_lang::prelude::*;
use rfq::states::{Response, Rfq};

declare_id!("CZgrS2mXL6XKNq6uwboBZKWrUTezCVdrKEuiXSSN69GS");

#[program]
pub mod risk_engine {
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
    ) -> Result<(u64, u64)> {
        let taker_collateral = 3_000_000_000;
        let maker_collateral = 1_000_000_000;
        Ok((taker_collateral, maker_collateral))
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
