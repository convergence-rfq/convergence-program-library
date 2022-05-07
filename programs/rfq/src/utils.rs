//! Utils
use num_traits::ToPrimitive;

// Calculate fee amount.
//
// TODO: When amount is 1, there is no fee
pub fn calc_fee(amount: u64, numerator: u64, denominator: u64) -> Option<u64> {
    (amount as u128)
        .checked_div(denominator as u128)?
        .checked_mul(numerator as u128)?
        .to_u64()
}
