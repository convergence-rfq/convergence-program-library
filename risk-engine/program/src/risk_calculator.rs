use anchor_lang::prelude::*;
use rfq::state::{AuthoritySide, BaseAssetIndex, BaseAssetInfo, Leg, RiskCategory, Side};
use std::collections::HashMap;

use crate::{errors::Error, fraction::Fraction, scenarios::Scenario};

const SAFETY_PRICE_SHIFT_FACTOR: Fraction = Fraction::new(1, 2);
const OVERALL_SAFETY_FACTOR: Fraction = Fraction::new(1, 1);
const COLLATERAL_DECIMALS: u8 = 8;

pub struct RiskCalculator<'a> {
    pub legs: Vec<Leg>,
    pub base_assets: Vec<BaseAssetInfo>,
    pub prices: HashMap<BaseAssetIndex, Fraction>,
    pub scenarios_selector: &'a dyn Fn(&Vec<&Leg>, RiskCategory) -> Vec<Scenario>,
}

impl<'a> RiskCalculator<'a> {
    pub fn calculate_risk(
        &self,
        leg_multiplier: Fraction,
        authority_side: AuthoritySide,
        quote_side: Side,
    ) -> Result<u64> {
        let mut risk_sum = 0;
        for base_asset in self.base_assets.iter() {
            let legs: Vec<&Leg> = self
                .legs
                .iter()
                .filter(|leg| leg.base_asset_index == base_asset.index)
                .collect();
            let scenarios = (self.scenarios_selector)(&legs, base_asset.risk_category);
            let price = self.prices.get(&base_asset.index).unwrap();

            let mut biggest_risk = i128::MAX;
            for scenario in scenarios.iter() {
                let scenario_calculator = ScenarioRiskCalculator {
                    legs: &legs,
                    scenario,
                    price: *price,
                    leg_multiplier,
                    authority_side,
                    quote_side,
                };

                let risk = scenario_calculator.calculate()?;
                biggest_risk = i128::min(biggest_risk, risk);
            }

            require!(biggest_risk <= 0.into(), Error::RiskCanNotBeNegative);
            risk_sum +=
                u64::try_from(-biggest_risk).map_err(|_| error!(Error::MathInvalidConversion))?;
        }

        Self::apply_overall_risk_factor(risk_sum)
    }

    fn apply_overall_risk_factor(risk_sum: u64) -> Result<u64> {
        let multiplier = OVERALL_SAFETY_FACTOR.checked_add(1.into()).unwrap();
        let result = Fraction::from(risk_sum)
            .checked_mul(multiplier)
            .ok_or(error!(Error::MathOverflow))?
            .to_i128_with_decimals(0)
            .ok_or(error!(Error::MathOverflow))?;

        u64::try_from(result).map_err(|_| error!(Error::MathInvalidConversion))
    }
}

struct ScenarioRiskCalculator<'a, 'b> {
    legs: &'a Vec<&'b Leg>,
    scenario: &'a Scenario,
    price: Fraction,
    leg_multiplier: Fraction,
    authority_side: AuthoritySide,
    quote_side: Side,
}

impl ScenarioRiskCalculator<'_, '_> {
    fn calculate(self) -> Result<i128> {
        let mut total_pnl = 0;

        for leg in self.legs.iter() {
            let pnl = self.calculate_leg_pnl(leg)?;
            total_pnl += pnl;
        }

        Ok(total_pnl)
    }

    fn calculate_leg_pnl(&self, leg: &Leg) -> Result<i128> {
        self.calculate_leg_unit_pnl(leg)?
            .checked_mul(Fraction::new(
                leg.instrument_amount.into(),
                leg.instrument_decimals,
            ))
            .ok_or(error!(Error::MathOverflow))?
            .checked_mul(self.leg_multiplier)
            .ok_or(error!(Error::MathOverflow))?
            .to_i128_with_decimals(COLLATERAL_DECIMALS)
            .ok_or(error!(Error::MathOverflow))
    }

    fn calculate_leg_unit_pnl(&self, leg: &Leg) -> Result<Fraction> {
        let mut unit_pnl_value = self.price;

        if let Side::Bid = self.quote_side {
            unit_pnl_value = -unit_pnl_value;
        }

        if let AuthoritySide::Taker = self.authority_side {
            unit_pnl_value = -unit_pnl_value;
        }

        if let Side::Bid = leg.side {
            unit_pnl_value = -unit_pnl_value;
        }

        let pnl_constituent = unit_pnl_value
            .checked_mul(self.scenario.base_price_change)
            .ok_or(error!(Error::MathOverflow))?;

        let safety_constituent = unit_pnl_value
            .abs()
            .checked_mul(SAFETY_PRICE_SHIFT_FACTOR)
            .ok_or(error!(Error::MathOverflow))?;

        pnl_constituent
            .checked_sub(safety_constituent)
            .ok_or(error!(Error::MathOverflow))
    }
}

#[cfg(test)]
mod tests {
    use rfq::state::PriceOracle;

    use super::*;

    #[test]
    fn one_spot_bitcoin_leg() {
        let btc_index = BaseAssetIndex::new(0);

        let legs = vec![Leg {
            instrument_amount: 2 * 10_u64.pow(6),
            instrument_decimals: 6,
            side: Side::Bid,
            base_asset_index: btc_index,
            instrument: Default::default(),
            instrument_data: Default::default(),
        }];

        let base_assets = vec![BaseAssetInfo {
            index: btc_index,
            bump: Default::default(),
            risk_category: RiskCategory::VeryLow,
            price_oracle: PriceOracle::Switchboard(Default::default()),
            ticker: Default::default(),
        }];

        let prices = HashMap::from([(btc_index, Fraction::new(20_000_000, 3))]);

        fn scenarios_selector(_legs: &Vec<&Leg>, _risk_category: RiskCategory) -> Vec<Scenario> {
            vec![
                Scenario::new(Fraction::new(1, 1), 0.into()),
                Scenario::new(Fraction::new(-1, 1), 0.into()),
            ]
        }

        let risk_calculator = RiskCalculator {
            legs,
            base_assets,
            prices,
            scenarios_selector: &scenarios_selector,
        };

        let required_collateral = risk_calculator
            .calculate_risk(Fraction::new(3, 0), AuthoritySide::Taker, Side::Ask)
            .unwrap();
        assert_eq!(
            required_collateral,
            14520 * 10_u64.pow(COLLATERAL_DECIMALS as u32)
        );
    }

    #[test]
    fn basis_bitcoin_rfq() {
        let btc_index = BaseAssetIndex::new(0);

        let legs = vec![
            Leg {
                instrument_amount: 2 * 10_u64.pow(6),
                instrument_decimals: 6,
                side: Side::Bid,
                base_asset_index: btc_index,
                instrument: Default::default(),
                instrument_data: Default::default(),
            },
            Leg {
                instrument_amount: 2 * 10_u64.pow(6),
                instrument_decimals: 6,
                side: Side::Ask,
                base_asset_index: btc_index,
                instrument: Default::default(),
                instrument_data: Default::default(),
            },
        ];

        let base_assets = vec![BaseAssetInfo {
            index: btc_index,
            bump: Default::default(),
            risk_category: RiskCategory::VeryLow,
            price_oracle: PriceOracle::Switchboard(Default::default()),
            ticker: Default::default(),
        }];

        let prices = HashMap::from([(btc_index, Fraction::new(20_000_000, 3))]);

        fn scenarios_selector(_legs: &Vec<&Leg>, _risk_category: RiskCategory) -> Vec<Scenario> {
            vec![
                Scenario::new(Fraction::new(1, 1), 0.into()),
                Scenario::new(Fraction::new(-1, 1), 0.into()),
            ]
        }

        let risk_calculator = RiskCalculator {
            legs,
            base_assets,
            prices,
            scenarios_selector: &scenarios_selector,
        };

        let required_collateral = risk_calculator
            .calculate_risk(Fraction::new(3, 0), AuthoritySide::Taker, Side::Ask)
            .unwrap();
        assert_eq!(
            required_collateral,
            2640 * 10_u64.pow(COLLATERAL_DECIMALS as u32)
        );
    }

    #[test]
    fn buy_bitcoin_sell_solana_rfq() {
        let btc_index = BaseAssetIndex::new(0);
        let sol_index = BaseAssetIndex::new(1);

        let legs = vec![
            Leg {
                instrument_amount: 1 * 10_u64.pow(6),
                instrument_decimals: 6,
                side: Side::Bid,
                base_asset_index: btc_index,
                instrument: Default::default(),
                instrument_data: Default::default(),
            },
            Leg {
                instrument_amount: 100 * 10_u64.pow(9),
                instrument_decimals: 9,
                side: Side::Ask,
                base_asset_index: sol_index,
                instrument: Default::default(),
                instrument_data: Default::default(),
            },
        ];

        let base_assets = vec![
            BaseAssetInfo {
                index: btc_index,
                bump: Default::default(),
                risk_category: RiskCategory::VeryLow,
                price_oracle: PriceOracle::Switchboard(Default::default()),
                ticker: Default::default(),
            },
            BaseAssetInfo {
                index: sol_index,
                bump: Default::default(),
                risk_category: RiskCategory::Medium,
                price_oracle: PriceOracle::Switchboard(Default::default()),
                ticker: Default::default(),
            },
        ];

        let prices = HashMap::from([
            (btc_index, Fraction::new(20_000_000, 3)),
            (sol_index, Fraction::new(30_000_000, 6)),
        ]);

        fn scenarios_selector(_legs: &Vec<&Leg>, risk_category: RiskCategory) -> Vec<Scenario> {
            if risk_category == RiskCategory::VeryLow {
                vec![
                    Scenario::new(Fraction::new(1, 1), 0.into()),
                    Scenario::new(Fraction::new(-1, 1), 0.into()),
                ]
            } else {
                vec![
                    Scenario::new(Fraction::new(2, 1), 0.into()),
                    Scenario::new(Fraction::new(-2, 1), 0.into()),
                ]
            }
        }

        let risk_calculator = RiskCalculator {
            legs,
            base_assets,
            prices,
            scenarios_selector: &scenarios_selector,
        };

        let required_collateral = risk_calculator
            .calculate_risk(Fraction::new(3, 0), AuthoritySide::Taker, Side::Ask)
            .unwrap();
        assert_eq!(
            required_collateral,
            9339 * 10_u64.pow(COLLATERAL_DECIMALS as u32)
        );
    }
}
