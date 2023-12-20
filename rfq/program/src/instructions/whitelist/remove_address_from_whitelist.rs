use crate::{errors::ProtocolError, state::whitelist::Whitelist};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct RemoveAddressToWhitelistAccounts<'info> {
    #[account(mut, constraint = whitelist_account.creator == creator.key() @ProtocolError::WhitelistCreatorMismatch)]
    pub whitelist_account: Box<Account<'info, Whitelist>>,
    pub creator: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn remove_address_from_whitelist_instruction(
    ctx: Context<RemoveAddressToWhitelistAccounts>,
    address: Pubkey,
) -> Result<()> {
    let RemoveAddressToWhitelistAccounts {
        whitelist_account, ..
    } = ctx.accounts;
    validate_remove_address_inputs(whitelist_account, &address)?;

    let index = whitelist_account
        .whitelist
        .iter()
        .position(|x| x.to_string() == address.to_string())
        .unwrap();

    whitelist_account.whitelist.remove(index);
    Ok(())
}

fn validate_remove_address_inputs(whitelist: &Whitelist, address: &Pubkey) -> Result<()> {
    require!(
        whitelist.is_whitelisted(address),
        ProtocolError::AddressDoesNotExistOnWhitelist
    );
    require!(
        !whitelist.whitelist.is_empty(),
        ProtocolError::WhitelistEmpty
    );

    Ok(())
}
