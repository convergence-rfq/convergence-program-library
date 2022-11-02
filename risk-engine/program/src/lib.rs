use anchor_lang::prelude::*;
use rfq::state::{AuthoritySide, FixedSize, Quote, Response, Rfq};

use base_asset_extractor::extract_base_assets;
use price_extractor::extract_prices;
use risk_calculator::RiskCalculator;
use scenarios::select_scenarious;

pub mod base_asset_extractor;
pub mod errors;
pub mod fraction;
pub mod price_extractor;
pub mod risk_calculator;
pub mod scenarios;

declare_id!("7VfhLs4yNYbpWzH1n1g8myKX4KGJnujoLMUnAqsr3wth");

pub const VARIABLE_SIZE_COLLATERAL_REQUIREMENT: u64 = 1_000_000_000;

pub mod risk_engine {
    use crate::fraction::Fraction;

    use super::*;

    pub fn calculate_collateral_for_rfq(
        mut ctx: Context<CalculateRequiredCollateralForRfq>,
    ) -> Result<u64> {
        let rfq = &ctx.accounts.rfq;

        let required_collateral = match rfq.fixed_size {
            FixedSize::None { padding: _ } => VARIABLE_SIZE_COLLATERAL_REQUIREMENT,
            FixedSize::BaseAsset {
                legs_multiplier_bps,
            } => {
                let remaining_accounts = &mut ctx.remaining_accounts;
                let base_assets = extract_base_assets(&ctx.accounts.rfq.legs, remaining_accounts)?;
                let prices = extract_prices(&base_assets, remaining_accounts)?;
                let risk_calculator = RiskCalculator {
                    legs: rfq.legs.clone(),
                    base_assets,
                    prices,
                    scenarios_selector: &select_scenarious,
                };
                risk_calculator.calculate_risk(
                    Fraction::new(
                        legs_multiplier_bps.into(),
                        Quote::LEG_MULTIPLIER_DECIMALS as u8,
                    ),
                    AuthoritySide::Taker,
                )?
            }
            FixedSize::QuoteAsset { quote_amount } => VARIABLE_SIZE_COLLATERAL_REQUIREMENT,
        };

        Ok(required_collateral)
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
