use anchor_lang::prelude::*;
use rfq::state::{AuthoritySide, BaseAssetIndex, BaseAssetInfo, RiskCategory, Side};
use std::collections::HashMap;

use crate::{
    black_scholes::calculate_option_value,
    errors::Error,
    fraction::Fraction,
    state::{
        Config, FutureCommonData, InstrumentType, OptionCommonData, RiskCategoryInfo, Scenario,
    },
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

pub struct CalculationCase {
    pub leg_multiplier: Fraction,
    pub authority_side: AuthoritySide,
    pub quote_side: Side,
}

pub struct PortfolioStatistics {
    max_loss: u64,
    max_profit: u64,
}

impl<'a> RiskCalculator<'a> {
    pub fn calculate_risk_for_several_cases<const N: usize>(
        &self,
        cases: [CalculationCase; N],
    ) -> Result<[u64; N]> {
        let statistics = self.calculate_portfolio_statistics()?;

        let mut result = [0; N];
        for (i, case) in cases.into_iter().enumerate() {
            result[i] = self.calculate_risk_inner(&statistics, case)?;
        }

        Ok(result)
    }

    pub fn calculate_risk(&self, case: CalculationCase) -> Result<u64> {
        let statistics = self.calculate_portfolio_statistics()?;

        self.calculate_risk_inner(&statistics, case)
    }

    fn calculate_risk_inner(
        &self,
        statistics: &PortfolioStatistics,
        case: CalculationCase,
    ) -> Result<u64> {
        let mut portfolio_inverted = false;

        if let Side::Bid = case.quote_side {
            portfolio_inverted = !portfolio_inverted;
        }

        if let AuthoritySide::Taker = case.authority_side {
            portfolio_inverted = !portfolio_inverted;
        }

        let portfolio_risk = if portfolio_inverted {
            statistics.max_profit
        } else {
            statistics.max_loss
        };

        self.multiply_by_leg_multiplier(portfolio_risk, case.leg_multiplier)
    }

    fn multiply_by_leg_multiplier(&self, unit_risk: u64, leg_multiplier: Fraction) -> Result<u64> {
        let max_risk = Fraction::new(unit_risk.into(), self.config.collateral_mint_decimals);
        let result = max_risk
            .checked_mul(leg_multiplier)
            .ok_or_else(|| error!(Error::MathOverflow))?;

        result
            .to_i128_with_decimals(self.config.collateral_mint_decimals)
            .ok_or_else(|| error!(Error::MathOverflow))?
            .try_into()
            .map_err(|_| error!(Error::MathInvalidConversion))
    }

    fn calculate_portfolio_statistics(&self) -> Result<PortfolioStatistics> {
        let mut all_profits: u64 = 0;
        let mut all_losses: u64 = 0;
        let mut total_leg_values: Fraction = 0.into();

        for base_asset in self.base_assets.iter() {
            let legs: Vec<_> = self
                .legs_with_meta
                .iter()
                .filter(|x| x.leg.base_asset_index == base_asset.index)
                .cloned()
                .collect();
            let price = self.prices.get(&base_asset.index).unwrap();
            let risk_category_info = self.config.get_risk_info(base_asset.risk_category);

            let leg_values = legs
                .iter()
                .map(|leg| self.calculate_current_value(leg, *price, risk_category_info))
                .collect::<Result<Vec<_>>>()?;
            let scenarios = (self.scenarios_selector)(&legs, base_asset.risk_category);

            let mut biggest_profit = i128::MIN;
            let mut biggest_loss = i128::MAX;
            for scenario in scenarios.iter() {
                let scenario_calculator = ScenarioRiskCalculator {
                    legs_with_meta: &legs,
                    unit_values: &leg_values,
                    risk_category_info,
                    scenario,
                    price: *price,
                    current_timestamp: self.current_timestamp,
                };

                let pnl = scenario_calculator
                    .calculate()?
                    .to_i128_with_decimals(self.config.collateral_mint_decimals)
                    .ok_or_else(|| error!(Error::MathOverflow))?;
                biggest_profit = biggest_profit.max(pnl);
                biggest_loss = biggest_loss.min(pnl);
            }

            let group_values = leg_values
                .into_iter()
                .map(|value| value.abs())
                .try_fold(Fraction::new(0, 0), |a, b| {
                    a.checked_add(b).ok_or_else(|| error!(Error::MathOverflow))
                })?;

            require!(biggest_profit >= 0, Error::RiskOutOfBounds);
            require!(biggest_loss <= 0, Error::RiskOutOfBounds);

            all_profits +=
                u64::try_from(biggest_profit).map_err(|_| error!(Error::MathInvalidConversion))?;
            all_losses +=
                u64::try_from(-biggest_loss).map_err(|_| error!(Error::MathInvalidConversion))?;
            total_leg_values = total_leg_values
                .checked_add(group_values)
                .ok_or_else(|| error!(Error::MathOverflow))?;
        }

        let total_leg_values = total_leg_values
            .to_i128_with_decimals(self.config.collateral_mint_decimals)
            .ok_or_else(|| error!(Error::MathOverflow))?
            .try_into()
            .map_err(|_| error!(Error::MathInvalidConversion))?;
        let price_shift = self.apply_safety_price_shift_factor(total_leg_values)?;

        all_profits += price_shift;
        all_losses += price_shift;
        all_profits = self.apply_overall_risk_factor(all_profits)?;
        all_losses = self.apply_overall_risk_factor(all_losses)?;

        Ok(PortfolioStatistics {
            max_loss: all_losses,
            max_profit: all_profits,
        })
    }

    fn apply_overall_risk_factor(&self, value: u64) -> Result<u64> {
        let multiplier = self
            .config
            .overall_safety_factor
            .checked_add(1.into())
            .unwrap();
        let result = Fraction::from(value as i128)
            .checked_mul(multiplier)
            .ok_or_else(|| error!(Error::MathOverflow))?
            .to_i128_with_decimals(0)
            .ok_or_else(|| error!(Error::MathOverflow))?;

        u64::try_from(result).map_err(|_| error!(Error::MathInvalidConversion))
    }

    fn apply_safety_price_shift_factor(&self, value: u64) -> Result<u64> {
        let multiplier = self.config.safety_price_shift_factor;
        let result = Fraction::from(value as i128)
            .checked_mul(multiplier)
            .ok_or_else(|| error!(Error::MathOverflow))?
            .to_i128_with_decimals(0)
            .ok_or_else(|| error!(Error::MathOverflow))?;

        u64::try_from(result).map_err(|_| error!(Error::MathInvalidConversion))
    }

    fn calculate_current_value(
        &self,
        leg_with_meta: &LegWithMetadata,
        price: Fraction,
        risk_category_info: RiskCategoryInfo,
    ) -> Result<Fraction> {
        calculate_asset_value(
            leg_with_meta,
            price,
            risk_category_info.yearly_volatility,
            risk_category_info.interest_rate,
            self.current_timestamp,
        )
    }
}

struct ScenarioRiskCalculator<'a> {
    legs_with_meta: &'a Vec<LegWithMetadata<'a>>,
    unit_values: &'a Vec<Fraction>,
    risk_category_info: RiskCategoryInfo,
    scenario: &'a Scenario,
    price: Fraction,
    current_timestamp: i64,
}

impl ScenarioRiskCalculator<'_> {
    fn calculate(self) -> Result<Fraction> {
        let mut total_pnl: Fraction = 0.into();

        for (leg_with_meta, unit_value) in self.legs_with_meta.iter().zip(self.unit_values.iter()) {
            let pnl = self.calculate_leg_pnl(leg_with_meta, *unit_value)?;
            total_pnl = total_pnl
                .checked_add(pnl)
                .ok_or_else(|| error!(Error::MathOverflow))?;
        }

        Ok(total_pnl)
    }

    fn calculate_leg_pnl(
        &self,
        leg_with_meta: &LegWithMetadata,
        unit_value: Fraction,
    ) -> Result<Fraction> {
        let shocked_value = self.calculate_shocked_value(leg_with_meta)?;
        shocked_value
            .checked_sub(unit_value)
            .ok_or_else(|| error!(Error::MathOverflow))
    }

    fn calculate_shocked_value(&self, leg_with_meta: &LegWithMetadata) -> Result<Fraction> {
        let shocked_price = self
            .price
            .checked_mul(
                self.scenario
                    .base_asset_price_change
                    .checked_add(1.into())
                    .unwrap(),
            )
            .ok_or_else(|| error!(Error::MathOverflow))?;
        let mut shocked_volatility = self.risk_category_info.yearly_volatility;

        if !self.scenario.volatility_change.is_zero() {
            shocked_volatility = shocked_volatility
                .checked_mul(
                    Fraction::from(1)
                        .checked_add(self.scenario.volatility_change)
                        .ok_or_else(|| error!(Error::MathOverflow))?,
                )
                .ok_or_else(|| error!(Error::MathOverflow))?;
        }

        calculate_asset_value(
            leg_with_meta,
            shocked_price,
            shocked_volatility,
            self.risk_category_info.interest_rate,
            self.current_timestamp,
        )
    }
}

fn calculate_asset_value(
    leg_with_meta: &LegWithMetadata,
    price: Fraction,
    yearly_volatility: Fraction,
    interest_rate: Fraction,
    current_timestamp: i64,
) -> Result<Fraction> {
    let unit_value = calculate_asset_unit_value(
        leg_with_meta,
        price,
        yearly_volatility,
        interest_rate,
        current_timestamp,
    )?;

    let mut leg_size_multiplier = Fraction::new(
        leg_with_meta.leg.instrument_amount.into(),
        leg_with_meta.leg.instrument_decimals,
    );
    if let Side::Bid = leg_with_meta.leg.side {
        leg_size_multiplier = -leg_size_multiplier;
    }
    unit_value
        .checked_mul(leg_size_multiplier)
        .ok_or_else(|| error!(Error::MathOverflow))
}

fn calculate_asset_unit_value(
    leg_with_meta: &LegWithMetadata,
    price: Fraction,
    yearly_volatility: Fraction,
    interest_rate: Fraction,
    current_timestamp: i64,
) -> Result<Fraction> {
    match leg_with_meta.instrument_type {
        InstrumentType::Spot => Ok(price),
        InstrumentType::Option => {
            let option_data: OptionCommonData = AnchorDeserialize::try_from_slice(
                &leg_with_meta.leg.instrument_data[..OptionCommonData::SERIALIZED_SIZE],
            )?;

            let seconds_till_expiration =
                i64::max(0, option_data.expiration_timestamp - current_timestamp);

            calculate_option_value(
                option_data.option_type,
                price,
                option_data.get_underlying_amount_per_contract(),
                option_data.get_strike_price(),
                interest_rate,
                yearly_volatility,
                seconds_till_expiration,
            )
            .ok_or_else(|| error!(Error::MathOverflow))
        }
        InstrumentType::TermFuture | InstrumentType::PerpFuture => {
            let future_data: FutureCommonData = AnchorDeserialize::try_from_slice(
                &leg_with_meta.leg.instrument_data[..FutureCommonData::SERIALIZED_SIZE],
            )?;

            price
                .checked_mul(future_data.get_underlying_amount_per_contract())
                .ok_or_else(|| error!(Error::MathOverflow))
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
            .calculate_risk(CalculationCase {
                leg_multiplier: Fraction::new(3, 0),
                authority_side: AuthoritySide::Taker,
                quote_side: Side::Ask,
            })
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
            .calculate_risk(CalculationCase {
                leg_multiplier: Fraction::new(3, 0),
                authority_side: AuthoritySide::Taker,
                quote_side: Side::Ask,
            })
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
            .calculate_risk(CalculationCase {
                leg_multiplier: Fraction::new(3, 0),
                authority_side: AuthoritySide::Taker,
                quote_side: Side::Ask,
            })
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
            .calculate_risk(CalculationCase {
                leg_multiplier: Fraction::new(3, 0),
                authority_side: AuthoritySide::Taker,
                quote_side: Side::Bid,
            })
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
