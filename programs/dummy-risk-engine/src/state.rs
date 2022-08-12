use anchor_lang::prelude::*;

#[account]
pub struct Register {
    pub required_collateral: u64,
}
