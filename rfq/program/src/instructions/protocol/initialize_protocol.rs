use crate::{seeds::PROTOCOL_SEED, state::ProtocolState};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct InitializeProtocolAccounts<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(
        init,
        payer = signer,
        seeds = [PROTOCOL_SEED.as_bytes()],
        space = ProtocolState::INIT_SPACE,
        bump
    )]
    pub protocol: Account<'info, ProtocolState>,

    pub system_program: Program<'info, System>,
}

pub fn initialize_protocol_instruction(ctx: Context<InitializeProtocolAccounts>) -> Result<()> {
    let InitializeProtocolAccounts { protocol, .. } = ctx.accounts;
    protocol.set_inner(ProtocolState {
        authority: ctx.accounts.signer.key(),
        bump: *ctx.bumps.get("protocol").unwrap(),
    });

    Ok(())
}
