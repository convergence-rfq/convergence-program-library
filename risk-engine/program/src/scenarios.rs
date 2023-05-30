use rfq::state::RiskCategory;

use crate::{
    state::{Config, InstrumentType, Scenario},
    LegWithMetadata,
};

pub struct ScenarioSelector<'a> {
    pub config: &'a Config,
    pub settlement_period: u32,
}

impl ScenarioSelector<'_> {
    pub fn select_scenarious(
        &self,
        legs_with_meta: &[LegWithMetadata],
        risk_category: RiskCategory,
    ) -> Vec<Scenario> {
        let have_option_legs = legs_with_meta
            .iter()
            .any(|x| matches!(x.instrument_type, InstrumentType::Option));

        let base_scenario = self
            .config
            .get_risk_info(risk_category)
            .get_base_scenario(self.settlement_period);

        if have_option_legs {
            vec![
                base_scenario,
                Scenario::new(
                    base_scenario.base_asset_price_change,
                    -base_scenario.volatility_change,
                ),
                Scenario::new(
                    -base_scenario.base_asset_price_change,
                    base_scenario.volatility_change,
                ),
                Scenario::new(
                    -base_scenario.base_asset_price_change,
                    -base_scenario.volatility_change,
                ),
            ]
        } else {
            vec![
                Scenario::new(base_scenario.base_asset_price_change, 0.0),
                Scenario::new(-base_scenario.base_asset_price_change, 0.0),
            ]
        }
    }
}
