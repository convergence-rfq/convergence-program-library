use crate::{errors::ProtocolError, state::whitelist::Whitelist};
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
    whitelist_to_add: Vec<Pubkey>,
) -> Result<()> {
    validate_whitelist_inputs(whitelist_to_add.len())?;
    let CreateWhitelistAccounts {
        creator,
        whitelist_account,
        ..
    } = ctx.accounts;

    whitelist_account.set_inner(Whitelist {
        creator: creator.key(),
        associated_rfq: Pubkey::default(),
        whitelist: whitelist_to_add,
    });

    Ok(())
}

fn validate_whitelist_inputs(length: usize) -> Result<()> {
    require!(
        length <= Whitelist::MAX_WHITELIST_SIZE as usize,
        ProtocolError::WhitelistMaximumCapacityReached
    );
    Ok(())
}

fn get_whitelist_size_from_length(length: u8) -> usize {
    8 + mem::size_of::<Whitelist>() + length as usize * 32
}
