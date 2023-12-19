use anchor_lang::prelude::*;

use crate::{state::whitelist::Whitelist, errors::ProtocolError};

#[derive(Accounts)]
pub struct AddAddressToWhitelistAccounts<'info>{
    #[account(mut, constraint = whitelist_account.creator == creator.key() @ProtocolError::WhitelistCreatorMismatch)]
    pub whitelist_account: Box<Account<'info, Whitelist>>,
    pub creator: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn add_address_to_whitelist_instruction(ctx:Context<AddAddressToWhitelistAccounts>,address:Pubkey) -> Result<()>{
    let AddAddressToWhitelistAccounts {
        whitelist_account,
        ..
    } = ctx.accounts;

    validate_add_address_inputs(&whitelist_account, &address)?;
    
    whitelist_account.whitelist.push(address);
    Ok(())
}


fn validate_add_address_inputs(whitelist: &Whitelist, address: &Pubkey) -> Result<()>{
    require!(whitelist.whitelist.len() < whitelist.capacity as usize,
       ProtocolError::WhitelistMaximumCapacityReached
    );
    require!(!whitelist.is_whitelisted(address) ,
       ProtocolError::AddressAlreadyExistsOnWhitelist);
    Ok(())
}