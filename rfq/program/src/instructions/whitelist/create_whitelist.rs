
use crate::{errors::ProtocolError, state::whitelist::Whitelist,constants::MAX_WHITELIST_SIZE};
use anchor_lang::prelude::*;
use std::mem;

#[derive(Accounts)]
#[instruction(
    length: u8
)]
pub struct CreateWhitelistAccounts<'info> {
    #[account(
        init_if_needed,
        payer = creator,
        space = get_whitelist_size_from_length(length),
    )]
    pub whitelist_account: Box<Account<'info, Whitelist>>,
    #[account(mut)]
    pub creator: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn create_whitelist_instruction(
    ctx: Context<CreateWhitelistAccounts>,
    length:u8,
    whitelist_to_add: Vec<Pubkey>,
) -> Result<()> {
    validate_whitelist_inputs(length)?;
    let CreateWhitelistAccounts {
        creator,
        whitelist_account,
        ..
    } = ctx.accounts;

    whitelist_account.set_inner(Whitelist {
        creator: creator.key(),
        whitelist: whitelist_to_add,
    });

    Ok(())
}

fn validate_whitelist_inputs(
    length:u8,
) -> Result<()> {
    require!(
        length <= MAX_WHITELIST_SIZE ,
        ProtocolError::WhitelistMaximumCapacityReached
    );

    Ok(())
}


fn get_whitelist_size_from_length(length:u8) -> usize {
    8 + mem::size_of::<Whitelist>() + (length as u64 * 32 as u64) as usize
}