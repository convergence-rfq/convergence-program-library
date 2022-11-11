use rfq::state::{Leg, RiskCategory};

use crate::fraction::Fraction;

pub struct Scenario {
    pub base_price_change: Fraction,
    pub volatility_change: Fraction,
}

impl Scenario {
    pub fn new(base_price_change: Fraction, volatility_change: Fraction) -> Self {
        Scenario {
            base_price_change,
            volatility_change,
        }
    }
}

pub fn select_scenarious(_legs: &Vec<&Leg>, _risk_category: RiskCategory) -> Vec<Scenario> {
    vec![
        Scenario {
            base_price_change: Fraction::new(2, 2),
            volatility_change: Fraction::new(2, 1),
        },
        Scenario {
            base_price_change: Fraction::new(2, 2),
            volatility_change: Fraction::new(-2, 1),
        },
        Scenario {
            base_price_change: Fraction::new(-2, 2),
            volatility_change: Fraction::new(2, 1),
        },
        Scenario {
            base_price_change: Fraction::new(-2, 2),
            volatility_change: Fraction::new(-2, 1),
        },
    ]
}
