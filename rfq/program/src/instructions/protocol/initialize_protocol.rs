use crate::{
    seeds::PROTOCOL_SEED,
    state::{FeeParameters, ProtocolState},
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
        space = ProtocolState::get_allocated_size(),
        bump
    )]
    pub protocol: Box<Account<'info, ProtocolState>>,
    /// CHECK: is a valid risk engine program id
    #[account(executable)]
    pub risk_engine: AccountInfo<'info>,
    pub collateral_mint: Account<'info, Mint>,
    pub system_program: Program<'info, System>,
}

fn validate(settle_fees: FeeParameters, default_fees: FeeParameters) -> Result<()> {
    settle_fees.validate()?;
    default_fees.validate()?;

    Ok(())
}

pub fn initialize_protocol_instruction(
    ctx: Context<InitializeProtocolAccounts>,
    settle_fees: FeeParameters,
    default_fees: FeeParameters,
    asset_add_fee: u64,
) -> Result<()> {
    validate(settle_fees, default_fees)?;

    let InitializeProtocolAccounts {
        protocol,
        risk_engine,
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
        collateral_mint: collateral_mint.key(),
        print_trade_providers: Default::default(),
        instruments: Default::default(),
        asset_add_fee,
        reserved: [0; 1016],
    });

    Ok(())
}
