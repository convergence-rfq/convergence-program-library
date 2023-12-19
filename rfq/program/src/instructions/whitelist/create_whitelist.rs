use anchor_lang::prelude::*;
use crate::{state::whitelist::Whitelist, errors::ProtocolError};
use std::mem;


#[derive(Accounts)]
#[instruction(
    expected_whitelist_size: u16
)]
pub struct CreateWhitelistAccounts<'info>{
    #[account(init_if_needed, payer = creator, space = 8 + mem::size_of::<Whitelist>() + expected_whitelist_size as usize)]
    pub whitelist_account: Box<Account<'info, Whitelist>>,
    #[account(mut)]
    pub creator: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn create_whitelist_instruction<>(ctx:Context<CreateWhitelistAccounts>,expected_whitelist_size: u16, whitelist_to_add:Vec<Pubkey>) -> Result<()>{
    let expected_whitelist_capacity = calculate_expected_capacity(expected_whitelist_size);
    validate_whitelist_inputs(expected_whitelist_capacity, &whitelist_to_add)?;
    let CreateWhitelistAccounts{
        creator,
        whitelist_account,
        ..
    } = ctx.accounts;

    whitelist_account.set_inner(
        Whitelist{
            creator: creator.key(),
            whitelist: whitelist_to_add,
            capacity: expected_whitelist_capacity,
        }
    );


    Ok(())
}


fn validate_whitelist_inputs(expected_whitelist_capacity: u8, whitelist_to_add: &Vec<Pubkey>) -> Result<()>{
    
    require!(whitelist_to_add.len() <= expected_whitelist_capacity as usize ,
    ProtocolError::WhitelistMaximumCapacityReached
    );

    Ok(())
}

fn calculate_expected_capacity(expected_whitelist_size:u16)->u8{
    let pubkey_size = 32;
    let capacity = (expected_whitelist_size / pubkey_size) as u8;
    return capacity;

}