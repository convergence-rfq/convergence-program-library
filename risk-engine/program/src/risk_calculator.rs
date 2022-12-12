use anchor_lang::prelude::*;
use rfq::state::{AuthoritySide, BaseAssetIndex, BaseAssetInfo, RiskCategory, Side};
use std::collections::HashMap;

use crate::{
    black_scholes::calculate_option_value,
    errors::Error,
    fraction::Fraction,
    state::{Config, InstrumentType, OptionCommonData, Scenario},
    LegWithMetadata,
};

pub struct RiskCalculator<'a> {
    pub legs_with_meta: Vec<LegWithMetadata<'a>>,
    pub config: &'a Config,
    pub base_assets: Vec<BaseAssetInfo>,
    pub prices: HashMap<BaseAssetIndex, Fraction>,
    pub scenarios_selector:
        Box<dyn Fn(&Vec<LegWithMetadata<'a>>, RiskCategory) -> Vec<Scenario> + 'a>,
    pub current_timestamp: i64,
}

impl<'a> RiskCalculator<'a> {
    pub fn calculate_risk(
        &self,
        leg_multiplier: Fraction,
        authority_side: AuthoritySide,
        quote_side: Side,
    ) -> Result<u64> {
        let mut portfolio_inverted = false;

        if let Side::Bid = quote_side {
            portfolio_inverted = !portfolio_inverted;
        }

        if let AuthoritySide::Taker = authority_side {
            portfolio_inverted = !portfolio_inverted;
        }

        self.calculate_concrete_portfolio_risk(leg_multiplier, portfolio_inverted)
    }

    pub fn calculate_concrete_portfolio_risk(
        &self,
        leg_multiplier: Fraction,
        portfolio_inverted: bool,
    ) -> Result<u64> {
        let mut risk_sum = 0;
        for base_asset in self.base_assets.iter() {
            let legs: Vec<LegWithMetadata> = self
                .legs_with_meta
                .iter()
                .filter(|x| x.leg.base_asset_index == base_asset.index)
                .cloned()
                .collect();
            let scenarios = (self.scenarios_selector)(&legs, base_asset.risk_category);
            let price = self.prices.get(&base_asset.index).unwrap();

            let mut biggest_risk = i128::MAX;
            for scenario in scenarios.iter() {
                let scenario_calculator = ScenarioRiskCalculator {
                    legs_with_meta: &legs,
                    config: self.config,
                    risk_category: base_asset.risk_category,
                    scenario,
                    price: *price,
                    leg_multiplier,
                    portfolio_inverted,
                    current_timestamp: self.current_timestamp,
                };

                let risk = scenario_calculator.calculate()?;
                biggest_risk = i128::min(biggest_risk, risk);
            }

            require!(biggest_risk <= 0.into(), Error::RiskCanNotBeNegative);
            risk_sum +=
                u64::try_from(-biggest_risk).map_err(|_| error!(Error::MathInvalidConversion))?;
        }

        self.apply_overall_risk_factor(risk_sum)
    }

    fn apply_overall_risk_factor(&self, risk_sum: u64) -> Result<u64> {
        let multiplier = self
            .config
            .overall_safety_factor
            .checked_add(1.into())
            .unwrap();
        let result = Fraction::from(risk_sum as i128)
            .checked_mul(multiplier)
            .ok_or_else(|| error!(Error::MathOverflow))?
            .to_i128_with_decimals(0)
            .ok_or_else(|| error!(Error::MathOverflow))?;

        u64::try_from(result).map_err(|_| error!(Error::MathInvalidConversion))
    }
}

struct ScenarioRiskCalculator<'a> {
    legs_with_meta: &'a Vec<LegWithMetadata<'a>>,
    config: &'a Config,
    risk_category: RiskCategory,
    scenario: &'a Scenario,
    price: Fraction,
    leg_multiplier: Fraction,
    portfolio_inverted: bool,
    current_timestamp: i64,
}

impl ScenarioRiskCalculator<'_> {
    fn calculate(self) -> Result<i128> {
        let mut total_pnl = 0;

        for leg_with_meta in self.legs_with_meta.iter() {
            let pnl = self.calculate_leg_pnl(leg_with_meta)?;
            total_pnl += pnl;
        }

        Ok(total_pnl)
    }

    fn calculate_leg_pnl(&self, leg_with_meta: &LegWithMetadata) -> Result<i128> {
        self.calculate_leg_unit_pnl(leg_with_meta)?
            .checked_mul(Fraction::new(
                leg_with_meta.leg.instrument_amount.into(),
                leg_with_meta.leg.instrument_decimals,
            ))
            .ok_or_else(|| error!(Error::MathOverflow))?
            .checked_mul(self.leg_multiplier)
            .ok_or_else(|| error!(Error::MathOverflow))?
            .to_i128_with_decimals(self.config.collateral_mint_decimals)
            .ok_or_else(|| error!(Error::MathOverflow))
    }

    fn calculate_leg_unit_pnl(&self, leg_with_meta: &LegWithMetadata) -> Result<Fraction> {
        let unit_value = self.calculate_current_unit_value(leg_with_meta)?;
        let shocked_value = self.calculate_shocked_unit_value(leg_with_meta)?;
        let mut unit_pnl = shocked_value
            .checked_sub(unit_value)
            .ok_or_else(|| error!(Error::MathOverflow))?;

        if self.portfolio_inverted {
            unit_pnl = -unit_pnl;
        }

        if let Side::Bid = leg_with_meta.leg.side {
            unit_pnl = -unit_pnl;
        }

        let safety_constituent = unit_value
            .abs()
            .checked_mul(self.config.safety_price_shift_factor)
            .ok_or_else(|| error!(Error::MathOverflow))?;

        unit_pnl
            .checked_sub(safety_constituent)
            .ok_or_else(|| error!(Error::MathOverflow))
    }

    fn calculate_current_unit_value(&self, leg_with_meta: &LegWithMetadata) -> Result<Fraction> {
        match leg_with_meta.instrument_type {
            InstrumentType::Spot | InstrumentType::TermFuture | InstrumentType::PerpFuture => {
                Ok(self.price)
            }
            InstrumentType::Option => {
                let option_data: OptionCommonData = AnchorDeserialize::try_from_slice(
                    &leg_with_meta.leg.instrument_data[..OptionCommonData::SERIALIZED_SIZE],
                )?;
                let risk_category_info = self.config.get_risk_info(self.risk_category);
                let seconds_till_expiration =
                    i64::max(0, option_data.expiration_timestamp - self.current_timestamp);

                calculate_option_value(
                    option_data.option_type,
                    self.price,
                    option_data.get_underlying_amount_per_contract(),
                    option_data.get_strike_price(),
                    risk_category_info.interest_rate,
                    risk_category_info.yearly_volatility,
                    seconds_till_expiration,
                )
                .ok_or_else(|| error!(Error::MathOverflow))
            }
        }
    }

    fn calculate_shocked_unit_value(&self, leg_with_meta: &LegWithMetadata) -> Result<Fraction> {
        match leg_with_meta.instrument_type {
            InstrumentType::Spot | InstrumentType::TermFuture | InstrumentType::PerpFuture => self
                .price
                .checked_mul(
                    self.scenario
                        .base_asset_price_change
                        .checked_add(1.into())
                        .unwrap(),
                )
                .ok_or_else(|| error!(Error::MathOverflow)),
            InstrumentType::Option => {
                let option_data: OptionCommonData = AnchorDeserialize::try_from_slice(
                    &leg_with_meta.leg.instrument_data[..OptionCommonData::SERIALIZED_SIZE],
                )?;

                let risk_category_info = self.config.get_risk_info(self.risk_category);
                let seconds_till_expiration =
                    i64::max(0, option_data.expiration_timestamp - self.current_timestamp);

                let shocked_price = self
                    .price
                    .checked_mul(
                        Fraction::from(1)
                            .checked_add(self.scenario.base_asset_price_change)
                            .ok_or_else(|| error!(Error::MathOverflow))?,
                    )
                    .ok_or_else(|| error!(Error::MathOverflow))?;
                let shocked_volatility = risk_category_info
                    .yearly_volatility
                    .checked_mul(
                        Fraction::from(1)
                            .checked_add(self.scenario.volatility_change)
                            .ok_or_else(|| error!(Error::MathOverflow))?,
                    )
                    .ok_or_else(|| error!(Error::MathOverflow))?;
                calculate_option_value(
                    option_data.option_type,
                    shocked_price,
                    option_data.get_underlying_amount_per_contract(),
                    option_data.get_strike_price(),
                    risk_category_info.interest_rate,
                    shocked_volatility,
                    seconds_till_expiration,
                )
                .ok_or_else(|| error!(Error::MathOverflow))
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use float_cmp::assert_approx_eq;
    use rfq::state::{Leg, PriceOracle, ProtocolState};

    use crate::state::{OptionType, RiskCategoryInfo};

    use super::*;

    const BTC_INDEX: BaseAssetIndex = BaseAssetIndex::new(0);
    const SOL_INDEX: BaseAssetIndex = BaseAssetIndex::new(1);

    fn get_config() -> Config {
        Config {
            collateral_for_variable_size_rfq_creation: 0,
            collateral_for_fixed_quote_amount_rfq_creation: 0,
            collateral_mint_decimals: 9,
            safety_price_shift_factor: Fraction::new(1, 2),
            overall_safety_factor: Fraction::new(1, 1),
            risk_categories_info: [RiskCategoryInfo {
                interest_rate: Fraction::new(5, 2),
                yearly_volatility: Fraction::new(5, 1),
                scenario_per_settlement_period: Default::default(),
            }; 5],
            instrument_types: [Default::default(); ProtocolState::MAX_INSTRUMENTS],
        }
    }

    #[test]
    fn one_spot_bitcoin_leg() {
        let config = get_config();

        let leg = Leg {
            instrument_amount: 2 * 10_u64.pow(6),
            instrument_decimals: 6,
            side: Side::Bid,
            base_asset_index: BTC_INDEX,
            instrument_program: Default::default(),
            instrument_data: Default::default(),
        };
        let legs_with_meta = vec![LegWithMetadata {
            leg: &leg,
            instrument_type: InstrumentType::Spot,
        }];

        let base_assets = vec![BaseAssetInfo {
            index: BTC_INDEX,
            bump: Default::default(),
            risk_category: RiskCategory::VeryLow,
            price_oracle: PriceOracle::Switchboard {
                address: Default::default(),
            },
            ticker: Default::default(),
        }];

        let prices = HashMap::from([(BTC_INDEX, Fraction::new(20_000_000, 3))]);

        fn scenarios_selector(
            _legs: &Vec<LegWithMetadata>,
            _risk_category: RiskCategory,
        ) -> Vec<Scenario> {
            vec![
                Scenario::new(Fraction::new(1, 1), 0.into()),
                Scenario::new(Fraction::new(-1, 1), 0.into()),
            ]
        }

        let risk_calculator = RiskCalculator {
            legs_with_meta,
            config: &config,
            base_assets,
            prices,
            scenarios_selector: Box::new(scenarios_selector),
            current_timestamp: 0,
        };

        let required_collateral = risk_calculator
            .calculate_risk(Fraction::new(3, 0), AuthoritySide::Taker, Side::Ask)
            .unwrap();
        assert_eq!(
            required_collateral,
            14520 * 10_u64.pow(config.collateral_mint_decimals as u32)
        );
    }

    #[test]
    fn basis_bitcoin_rfq() {
        let config = get_config();

        let legs = vec![
            Leg {
                instrument_amount: 2 * 10_u64.pow(6),
                instrument_decimals: 6,
                side: Side::Bid,
                base_asset_index: BTC_INDEX,
                instrument_program: Default::default(),
                instrument_data: Default::default(),
            },
            Leg {
                instrument_amount: 2 * 10_u64.pow(6),
                instrument_decimals: 6,
                side: Side::Ask,
                base_asset_index: BTC_INDEX,
                instrument_program: Default::default(),
                instrument_data: Default::default(),
            },
        ];
        let legs_with_meta = vec![
            LegWithMetadata {
                leg: &legs[0],
                instrument_type: InstrumentType::Spot,
            },
            LegWithMetadata {
                leg: &legs[1],
                instrument_type: InstrumentType::Spot,
            },
        ];

        let base_assets = vec![BaseAssetInfo {
            index: BTC_INDEX,
            bump: Default::default(),
            risk_category: RiskCategory::VeryLow,
            price_oracle: PriceOracle::Switchboard {
                address: Default::default(),
            },
            ticker: Default::default(),
        }];

        let prices = HashMap::from([(BTC_INDEX, Fraction::new(20_000_000, 3))]);

        fn scenarios_selector(
            _legs: &Vec<LegWithMetadata>,
            _risk_category: RiskCategory,
        ) -> Vec<Scenario> {
            vec![
                Scenario::new(Fraction::new(1, 1), 0.into()),
                Scenario::new(Fraction::new(-1, 1), 0.into()),
            ]
        }

        let risk_calculator = RiskCalculator {
            legs_with_meta,
            config: &config,
            base_assets,
            prices,
            scenarios_selector: Box::new(scenarios_selector),
            current_timestamp: 0,
        };

        let required_collateral = risk_calculator
            .calculate_risk(Fraction::new(3, 0), AuthoritySide::Taker, Side::Ask)
            .unwrap();
        assert_eq!(
            required_collateral,
            2640 * 10_u64.pow(config.collateral_mint_decimals as u32)
        );
    }

    #[test]
    fn buy_bitcoin_sell_solana_rfq() {
        let config = get_config();

        let legs = vec![
            Leg {
                instrument_amount: 1 * 10_u64.pow(6),
                instrument_decimals: 6,
                side: Side::Bid,
                base_asset_index: BTC_INDEX,
                instrument_program: Default::default(),
                instrument_data: Default::default(),
            },
            Leg {
                instrument_amount: 100 * 10_u64.pow(9),
                instrument_decimals: 9,
                side: Side::Ask,
                base_asset_index: SOL_INDEX,
                instrument_program: Default::default(),
                instrument_data: Default::default(),
            },
        ];
        let legs_with_meta = vec![
            LegWithMetadata {
                leg: &legs[0],
                instrument_type: InstrumentType::Spot,
            },
            LegWithMetadata {
                leg: &legs[1],
                instrument_type: InstrumentType::Spot,
            },
        ];

        let base_assets = vec![
            BaseAssetInfo {
                index: BTC_INDEX,
                bump: Default::default(),
                risk_category: RiskCategory::VeryLow,
                price_oracle: PriceOracle::Switchboard {
                    address: Default::default(),
                },
                ticker: Default::default(),
            },
            BaseAssetInfo {
                index: SOL_INDEX,
                bump: Default::default(),
                risk_category: RiskCategory::Medium,
                price_oracle: PriceOracle::Switchboard {
                    address: Default::default(),
                },
                ticker: Default::default(),
            },
        ];

        let prices = HashMap::from([
            (BTC_INDEX, Fraction::new(20_000_000, 3)),
            (SOL_INDEX, Fraction::new(30_000_000, 6)),
        ]);

        fn scenarios_selector(
            _legs: &Vec<LegWithMetadata>,
            risk_category: RiskCategory,
        ) -> Vec<Scenario> {
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
            legs_with_meta,
            config: &config,
            base_assets,
            prices,
            scenarios_selector: Box::new(scenarios_selector),
            current_timestamp: 0,
        };

        let required_collateral = risk_calculator
            .calculate_risk(Fraction::new(3, 0), AuthoritySide::Taker, Side::Ask)
            .unwrap();
        assert_eq!(
            required_collateral,
            9339 * 10_u64.pow(config.collateral_mint_decimals as u32)
        );
    }

    #[test]
    fn one_option_call() {
        let config = get_config();

        let option_data = OptionCommonData {
            option_type: OptionType::Call,
            underlying_amount_per_contract: 1 * 10_u64
                .pow(OptionCommonData::UNDERLYING_AMOUNT_PER_CONTRACT_DECIMALS as u32 - 1),
            strike_price: 22000 * 10_u64.pow(OptionCommonData::STRIKE_PRICE_DECIMALS as u32),
            expiration_timestamp: 90 * 24 * 60 * 60,
        };

        let leg = Leg {
            instrument_amount: 1 * 10_u64.pow(6),
            instrument_decimals: 6,
            side: Side::Bid,
            base_asset_index: BTC_INDEX,
            instrument_program: Default::default(),
            instrument_data: option_data.try_to_vec().unwrap(),
        };
        let legs_with_meta = vec![LegWithMetadata {
            leg: &leg,
            instrument_type: InstrumentType::Option,
        }];

        let base_assets = vec![BaseAssetInfo {
            index: BTC_INDEX,
            bump: Default::default(),
            risk_category: RiskCategory::VeryLow,
            price_oracle: PriceOracle::Switchboard {
                address: Default::default(),
            },
            ticker: Default::default(),
        }];

        let prices = HashMap::from([(BTC_INDEX, Fraction::new(20_000_000, 3))]);

        fn scenarios_selector(
            _legs: &Vec<LegWithMetadata>,
            _risk_category: RiskCategory,
        ) -> Vec<Scenario> {
            vec![
                Scenario::new(Fraction::new(1, 1), Fraction::new(2, 1)),
                Scenario::new(Fraction::new(1, 1), Fraction::new(-2, 1)),
                Scenario::new(Fraction::new(-1, 1), Fraction::new(2, 1)),
                Scenario::new(Fraction::new(-1, 1), Fraction::new(-2, 1)),
            ]
        }

        let risk_calculator = RiskCalculator {
            legs_with_meta,
            config: &config,
            base_assets,
            prices,
            scenarios_selector: Box::new(scenarios_selector),
            current_timestamp: 0,
        };

        let required_collateral = risk_calculator
            .calculate_risk(Fraction::new(3, 0), AuthoritySide::Taker, Side::Bid)
            .unwrap();
        assert_approx_eq!(
            f64,
            f64::from(Fraction::new(
                required_collateral as i128,
                config.collateral_mint_decimals
            )),
            471.9,
            epsilon = 0.1
        );
    }
}
