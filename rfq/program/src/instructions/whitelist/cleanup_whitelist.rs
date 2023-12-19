use anchor_lang::prelude::*;

use crate::{state::whitelist::Whitelist, errors::ProtocolError};

#[derive(Accounts)]
pub struct CleanUpWhitelistAccounts<'info>{
    #[account(mut, constraint = whitelist_account.creator == creator.key() @ProtocolError::WhitelistCreatorMismatch ,close = creator)]
    pub whitelist_account: Box<Account<'info, Whitelist>>,
    #[account(mut)]
    pub creator: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn clean_up_whitelist_instruction(_ctx:Context<CleanUpWhitelistAccounts>) -> Result<()>{
    Ok(())
}