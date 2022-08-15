use crate::errors::SpotError;
use anchor_lang::prelude::*;
use anchor_spl::token::Mint;

mod errors;

declare_id!("A5mS5KjyhgZ5yP9ff3psQb7KsQfBJYTfiwGczE2kVNMM");

#[program]
pub mod spot_instrument {
    use super::*;

    pub fn validate_data(ctx: Context<ValidateData>, mint_address: Pubkey) -> Result<()> {
        require!(
            mint_address == ctx.accounts.mint.key(),
            SpotError::PassedMintDoesNotMatch
        );
        Ok(())
    }
}

#[derive(Accounts)]
pub struct ValidateData<'info> {
    pub mint: Account<'info, Mint>,
}
