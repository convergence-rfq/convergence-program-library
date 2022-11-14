use anchor_lang::prelude::*;

use crate::fraction::Fraction;

#[account]
pub struct Config {
    pub bump: u8,
    pub collateral_for_variable_size_rfq_creation: u64,
    pub collateral_for_fixed_quote_amount_rfq_creation: u64,
    pub collateral_mint_decimals: u8,
    pub safety_price_shift_factor: Fraction,
    pub overall_safety_factor: Fraction,
}
