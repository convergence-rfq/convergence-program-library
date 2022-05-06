///! Utils

pub fn calc_fee(amount: u64, decimals: u8, numerator: u64, denominator: u64) -> u64 {
    // NOTE: When decimals are 0 and the amount is 1, there is no fee
    let ui_amount = amount as f64 / (10u32.pow(decimals as u32) as f64);
    let ui_fee_amount = ui_amount * (numerator as f64 / denominator as f64);
    let fee_amount = ui_fee_amount * (10u32.pow(decimals as u32) as f64);
    fee_amount as u64
}
