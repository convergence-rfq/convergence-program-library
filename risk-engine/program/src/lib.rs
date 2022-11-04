use anchor_lang::prelude::*;
use rfq::state::{AuthoritySide, FixedSize, Leg, OrderType, Quote, Response, Rfq, Side};

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
pub const FIXED_QUOTE_ASSET_SIZE_COLLATERAL_REQUIREMENT: u64 = 2_000_000_000;

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
                let risk_calculator = construct_risk_calculator(
                    ctx.accounts.rfq.legs.clone(),
                    &mut ctx.remaining_accounts,
                )?;
                let leg_multiplier = Fraction::new(
                    legs_multiplier_bps.into(),
                    Quote::LEG_MULTIPLIER_DECIMALS as u8,
                );

                let calculate_collateral = |side| {
                    risk_calculator.calculate_risk(leg_multiplier, AuthoritySide::Taker, side)
                };

                match rfq.order_type {
                    OrderType::Buy => calculate_collateral(Side::Ask)?,
                    OrderType::Sell => calculate_collateral(Side::Bid)?,
                    OrderType::TwoWay => u64::max(
                        calculate_collateral(Side::Bid)?,
                        calculate_collateral(Side::Ask)?,
                    ),
                }
            }
            FixedSize::QuoteAsset { quote_amount: _ } => {
                FIXED_QUOTE_ASSET_SIZE_COLLATERAL_REQUIREMENT
            }
        };

        Ok(required_collateral)
    }

    pub fn calculate_collateral_for_response(
        mut ctx: Context<CalculateRequiredCollateralForResponse>,
    ) -> Result<u64> {
        let CalculateRequiredCollateralForResponse { rfq, response } = ctx.accounts;

        let risk_calculator =
            construct_risk_calculator(rfq.legs.clone(), &mut ctx.remaining_accounts)?;

        let get_collateral_for_quote = |quote, side| {
            let legs_multiplier_bps = response.calculate_legs_multiplier_bps_for_quote(rfq, quote);
            risk_calculator.calculate_risk(
                Fraction::new(
                    legs_multiplier_bps.into(),
                    Quote::LEG_MULTIPLIER_DECIMALS as u8,
                ),
                AuthoritySide::Maker,
                side,
            )
        };

        let mut collateral = if let Some(quote) = response.bid {
            get_collateral_for_quote(quote, Side::Bid)?
        } else {
            0
        };

        if let Some(quote) = response.ask {
            collateral = u64::max(collateral, get_collateral_for_quote(quote, Side::Ask)?);
        }

        Ok(collateral)
    }

    pub fn calculate_collateral_for_confirmation(
        mut ctx: Context<CalculateRequiredCollateralForConfirmation>,
    ) -> Result<(u64, u64)> {
        let CalculateRequiredCollateralForConfirmation { rfq, response } = ctx.accounts;

        let risk_calculator =
            construct_risk_calculator(rfq.legs.clone(), &mut ctx.remaining_accounts)?;

        let legs_multiplier_bps = response.calculate_confirmed_legs_multiplier_bps(rfq);
        let legs_multiplier = Fraction::new(
            legs_multiplier_bps.into(),
            Quote::LEG_MULTIPLIER_DECIMALS as u8,
        );
        let confirmed_side = response.confirmed.unwrap().side;

        let taker_collateral = risk_calculator.calculate_risk(
            legs_multiplier.clone(),
            AuthoritySide::Taker,
            confirmed_side,
        )?;
        let maker_collateral = risk_calculator.calculate_risk(
            legs_multiplier,
            AuthoritySide::Maker,
            confirmed_side,
        )?;
        Ok((taker_collateral, maker_collateral))
    }
}

fn construct_risk_calculator<'a>(
    legs: Vec<Leg>,
    remaining_accounts: &mut &[AccountInfo],
) -> Result<RiskCalculator<'a>> {
    let base_assets = extract_base_assets(&legs, remaining_accounts)?;
    let prices = extract_prices(&base_assets, remaining_accounts)?;
    Ok(RiskCalculator {
        legs,
        base_assets,
        prices,
        scenarios_selector: &select_scenarious,
    })
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
