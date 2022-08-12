use std::mem;

use crate::{
    constants::PROTOCOL_SEED,
    errors::ProtocolError,
    interfaces::risk_engine::RiskEngineRegister,
    states::{FeeParameters, ProtocolState},
};
use anchor_lang::prelude::*;
use anchor_spl::token::Mint;

#[derive(Accounts)]
pub struct InitializeProtocolAccounts<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(
        init,
        payer = signer,
        seeds = [PROTOCOL_SEED.as_bytes()],
        space = 8 + mem::size_of::<ProtocolState>()
            + ProtocolState::INSTRUMENT_SIZE * ProtocolState::MAX_INSTRUMENTS,
        bump
    )]
    pub protocol: Account<'info, ProtocolState>,
    #[account(executable)]
    pub risk_engine: AccountInfo<'info>,
    pub risk_engine_register: AccountInfo<'info>,
    pub collateral_mint: Account<'info, Mint>,
    pub system_program: Program<'info, System>,
}

fn validate(ctx: &Context<InitializeProtocolAccounts>) -> Result<()> {
    let InitializeProtocolAccounts {
        risk_engine,
        risk_engine_register,
        ..
    } = &ctx.accounts;

    require!(
        risk_engine_register.owner == &risk_engine.key()
            && RiskEngineRegister::fetch(risk_engine_register).is_ok(),
        ProtocolError::InvalidRiskEngineRegister
    );

    Ok(())
}

pub fn initialize_protocol_instruction(
    ctx: Context<InitializeProtocolAccounts>,
    settle_fees: FeeParameters,
    default_fees: FeeParameters,
) -> Result<()> {
    validate(&ctx)?;
    let InitializeProtocolAccounts {
        protocol,
        risk_engine,
        risk_engine_register,
        collateral_mint,
        ..
    } = ctx.accounts;
    protocol.set_inner(ProtocolState {
        authority: ctx.accounts.signer.key(),
        bump: *ctx.bumps.get("protocol").unwrap(),
        active: true,
        settle_fees,
        default_fees,
        risk_engine: risk_engine.key(),
        risk_engine_register: risk_engine_register.key(),
        collateral_mint: collateral_mint.key(),
        instruments: Default::default(),
    });

    Ok(())
}
