use anchor_lang::prelude::*;

use crate::{errors::ProtocolError, state::whitelist::Whitelist};

#[derive(Accounts)]
pub struct CleanUpWhitelistAccounts<'info> {
    #[account(mut, constraint = whitelist_account.creator == creator.key() @ProtocolError::WhitelistCreatorMismatch ,close = creator)]
    pub whitelist_account: Box<Account<'info, Whitelist>>,
    #[account(mut)]
    pub creator: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn clean_up_whitelist_instruction(_ctx: Context<CleanUpWhitelistAccounts>) -> Result<()> {
    let CleanUpWhitelistAccounts {
        whitelist_account, ..
    } = _ctx.accounts;
    require!(
        whitelist_account.associated_rfq == Pubkey::default(),
        ProtocolError::WhitelistHasAssociatedRfq
    );
    Ok(())
}
