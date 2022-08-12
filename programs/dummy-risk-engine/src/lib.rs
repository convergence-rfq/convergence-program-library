use std::mem;

use anchor_lang::prelude::*;
use rfq::states::Leg;
use state::Register;

pub mod state;

declare_id!("E3mS5KjyhgZ5yP9ff3psQb7KsQfBJYTfiwGczE2kVN5R");

#[program]
pub mod dummy_risk_engine {
    use super::*;

    pub fn initialize_register(_ctx: Context<InitializeRegister>) -> Result<()> {
        Ok(())
    }

    pub fn calculate_collateral_for_rfq(
        ctx: Context<CalculateRequiredCollateralForRfq>,
        _legs: Vec<Leg>,
    ) -> Result<()> {
        let register = &mut ctx.accounts.register;
        register.required_collateral = 1_000_000_000;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeRegister<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        init,
        payer = signer,
        space = 8 + mem::size_of::<Register>()
    )]
    pub register: Account<'info, Register>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CalculateRequiredCollateralForRfq<'info> {
    #[account(mut)]
    pub register: Account<'info, Register>,
}
