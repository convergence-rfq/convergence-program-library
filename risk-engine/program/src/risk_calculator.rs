use anchor_lang::prelude::*;
use rfq::state::{AuthoritySide, BaseAssetIndex, BaseAssetInfo, Leg, RiskCategory, Side};
use std::collections::HashMap;

use crate::{errors::Error, fraction::Fraction, scenarios::Scenario};

const SAFETY_FACTOR: Fraction = Fraction::new(1, 3);

pub struct RiskCalculator<'a> {
    pub legs: Vec<Leg>,
    pub base_assets: Vec<BaseAssetInfo>,
    pub prices: HashMap<BaseAssetIndex, Fraction>,
    pub scenarios_selector: &'a dyn Fn(&Vec<&Leg>, RiskCategory) -> Vec<Scenario>,
}

impl<'a> RiskCalculator<'a> {
    pub fn calculate_risk(&self, leg_multiplier: Fraction, side: AuthoritySide) -> Result<u64> {
        let mut total_risk = 0;
        for base_asset in self.base_assets.iter() {
            let legs: Vec<&Leg> = self
                .legs
                .iter()
                .filter(|leg| leg.base_asset_index == base_asset.index)
                .collect();
            let scenarios = (self.scenarios_selector)(&legs, base_asset.risk_category);
            let price = self.prices.get(&base_asset.index).unwrap();

            let mut biggest_risk = i64::MAX;
            for scenario in scenarios.iter() {
                let scenario_calculator = ScenarioRiskCalculator {
                    legs: &legs,
                    scenario,
                    price: price.clone(),
                    leg_multiplier: leg_multiplier.clone(),
                    side,
                };

                let risk = scenario_calculator.calculate()?;
                biggest_risk = i64::min(biggest_risk, risk);
            }

            require!(biggest_risk <= 0.into(), Error::RiskCanNotBeNegative);
            total_risk += (-biggest_risk) as u64;
        }

        Ok(total_risk)
    }
}

struct ScenarioRiskCalculator<'a, 'b> {
    legs: &'a Vec<&'b Leg>,
    scenario: &'a Scenario,
    price: Fraction,
    leg_multiplier: Fraction,
    side: AuthoritySide,
}

impl ScenarioRiskCalculator<'_, '_> {
    fn calculate(self) -> Result<i64> {
        let mut total_pnl = 0;
        let mut total_abs_pnl = 0;

        for leg in self.legs.iter() {
            let pnl = self.calculate_leg_pnl(leg)?;
            total_pnl += pnl;
            total_abs_pnl += i64::abs(pnl);
        }

        let safety_margin = SAFETY_FACTOR
            .checked_mul(total_abs_pnl.into())
            .ok_or(error!(Error::MathOverflow))?
            .checked_into_i64()
            .ok_or(error!(Error::MathOverflow))?;
        Ok(total_pnl - safety_margin)
    }

    fn calculate_leg_pnl(&self, leg: &Leg) -> Result<i64> {
        let value = self
            .calculate_leg_unit_pnl(leg)?
            .checked_mul(leg.instrument_amount.into())
            .ok_or(error!(Error::MathOverflow))?
            .checked_mul(self.leg_multiplier.clone())
            .ok_or(error!(Error::MathOverflow))?;
        let rounded_value = value
            .checked_into_i64()
            .ok_or(error!(Error::MathOverflow))?;

        let result = rounded_value
            * if self.side == AuthoritySide::Taker {
                1
            } else {
                -1
            }
            * if leg.side == Side::Bid { 1 } else { -1 };

        Ok(result)
    }

    fn calculate_leg_unit_pnl(&self, _leg: &Leg) -> Result<Fraction> {
        self.scenario
            .base_price_change
            .checked_mul(self.price.clone())
            .ok_or(error!(Error::MathOverflow))
    }
}
