use rfq::state::{Leg, RiskCategory};

use crate::fraction::Fraction;

pub struct Scenario {
    pub base_price_change: Fraction,
    pub volatility_change: Fraction,
}

pub fn select_scenarious(legs: &Vec<&Leg>, risk_category: RiskCategory) -> Vec<Scenario> {
    vec![
        Scenario {
            base_price_change: Fraction::new(2, 2),
            volatility_change: 0.into(),
        },
        Scenario {
            base_price_change: Fraction::new(1, 2),
            volatility_change: 0.into(),
        },
        Scenario {
            base_price_change: 0.into(),
            volatility_change: 0.into(),
        },
        Scenario {
            base_price_change: Fraction::new(-1, 2),
            volatility_change: 0.into(),
        },
        Scenario {
            base_price_change: Fraction::new(-2, 2),
            volatility_change: 0.into(),
        },
        Scenario {
            base_price_change: Fraction::new(2, 2),
            volatility_change: Fraction::new(2, 1),
        },
        Scenario {
            base_price_change: Fraction::new(1, 2),
            volatility_change: Fraction::new(2, 1),
        },
        Scenario {
            base_price_change: 0.into(),
            volatility_change: Fraction::new(2, 1),
        },
        Scenario {
            base_price_change: Fraction::new(-1, 2),
            volatility_change: Fraction::new(2, 1),
        },
        Scenario {
            base_price_change: Fraction::new(-2, 2),
            volatility_change: Fraction::new(2, 1),
        },
        Scenario {
            base_price_change: Fraction::new(2, 2),
            volatility_change: Fraction::new(-2, 1),
        },
        Scenario {
            base_price_change: Fraction::new(1, 2),
            volatility_change: Fraction::new(-2, 1),
        },
        Scenario {
            base_price_change: 0.into(),
            volatility_change: Fraction::new(-2, 1),
        },
        Scenario {
            base_price_change: Fraction::new(-1, 2),
            volatility_change: Fraction::new(-2, 1),
        },
        Scenario {
            base_price_change: Fraction::new(-2, 2),
            volatility_change: Fraction::new(-2, 1),
        },
    ]
}
