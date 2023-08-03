use dex::utils::numeric::Fractional;

pub const CONFIG_SEED: &str = "config";
pub const OPERATOR_SEED: &str = "operator";

pub const MAX_PRODUCTS_PER_TRADE: usize = 1;

pub const OPERATOR_CREATOR_FEE_PROPORTION: Fractional = Fractional { m: 0, exp: 0 };
pub const OPERATOR_COUNTERPARTY_FEE_PROPORTION: Fractional = Fractional { m: 0, exp: 0 };
