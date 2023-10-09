use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct ProtocolState {
    // Protocol initiator
    pub authority: Pubkey,
    pub bump: u8,
}
