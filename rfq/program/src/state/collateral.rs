use anchor_lang::prelude::*;
use anchor_spl::token::TokenAccount;

use crate::errors::ProtocolError;

#[account]
pub struct CollateralInfo {
    pub bump: u8,
    pub user: Pubkey,
    pub token_account_bump: u8,
    pub locked_tokens_amount: u64,

    pub reserved: [u8; 256],
}

impl CollateralInfo {
    pub fn lock_collateral(&mut self, token_account: &TokenAccount, amount: u64) -> Result<()> {
        require!(
            amount <= token_account.amount - self.locked_tokens_amount,
            ProtocolError::NotEnoughCollateral
        );
        self.locked_tokens_amount += amount;
        Ok(())
    }

    pub fn unlock_collateral(&mut self, amount: u64) {
        self.locked_tokens_amount -= amount;
    }
}
