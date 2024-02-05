use crate::state::Side;

#[allow(dead_code)]
#[cfg(not(debug_assertions))]
#[inline(always)]
unsafe fn invariant(check: bool) {
    if check {
        std::hint::unreachable_unchecked();
    }
}

/// Rounds a given price the nearest tick size according to the rules of the AOB
pub fn round_price(tick_size: u64, limit_price: u64, side: Side) -> u64 {
    match side {
        // Round down
        Side::Bid => tick_size * (limit_price / tick_size),
        // Round up
        Side::Ask => tick_size * ((limit_price + tick_size - 1) / tick_size),
    }
}
