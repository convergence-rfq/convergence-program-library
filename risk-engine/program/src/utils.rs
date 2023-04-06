use rfq::state::{Leg, Side};

pub fn get_leg_amount_f64(leg: &Leg) -> f64 {
    let mut result = convert_fixed_point_to_f64(leg.instrument_amount, leg.instrument_decimals);
    if let Side::Bid = leg.side {
        result = -result;
    }

    result
}

pub fn convert_fixed_point_to_f64(value: u64, decimals: u8) -> f64 {
    value as f64 / 10_u64.pow(decimals as u32) as f64
}

pub fn strict_f64_to_u64(x: f64) -> Option<u64> {
    // Check if fractional component is 0 and that it can map to an integer in the f64
    // Using fract() is equivalent to using `as u64 as f64` and checking it matches
    if x >= u64::MIN as f64 && x <= u64::MAX as f64 {
        return Some(x as u64);
    }

    None
}
