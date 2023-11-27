use crate::{errors::ProtocolError, seeds::PROTOCOL_SEED, state::ProtocolState};
use anchor_lang::prelude::*;

pub fn close_protocol_state_instruction(_ctx: Context<CloseProtocolStateAccounts>) -> Result<()> {
    Ok(())
}

#[derive(Accounts)]
pub struct CloseProtocolStateAccounts<'info> {
    #[account(mut, constraint = protocol.authority == authority.key() @ ProtocolError::NotAProtocolAuthority)]
    pub authority: Signer<'info>,
    #[account(
        mut,
        close = authority,
        seeds = [PROTOCOL_SEED.as_bytes()],
        bump
    )]
    pub protocol: Box<Account<'info, ProtocolState>>,
}
