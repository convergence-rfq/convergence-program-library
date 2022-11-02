use crate::{
    constants::PROTOCOL_SEED,
    errors::ProtocolError,
    interfaces::instrument::validate_instrument_data,
    state::{Leg, ProtocolState, Rfq, RfqState},
};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct AddLegsToRfqAccounts<'info> {
    #[account(constraint = taker.key() == rfq.taker @ ProtocolError::NotATaker)]
    pub taker: Signer<'info>,

    #[account(seeds = [PROTOCOL_SEED.as_bytes()], bump = protocol.bump)]
    pub protocol: Account<'info, ProtocolState>,
    #[account(mut)]
    pub rfq: Box<Account<'info, Rfq>>,
}

fn validate<'info>(
    ctx: &Context<'_, '_, '_, 'info, AddLegsToRfqAccounts<'info>>,
    legs: &Vec<Leg>,
) -> Result<()> {
    let AddLegsToRfqAccounts { protocol, rfq, .. } = &ctx.accounts;
    let mut remaining_accounts = ctx.remaining_accounts.iter();

    for leg in legs.iter() {
        validate_instrument_data(leg, protocol, &mut remaining_accounts)?;
    }

    require!(legs.len() > 0, ProtocolError::EmptyLegsNotSupported);
    require!(
        legs.len() + rfq.legs.len() <= Rfq::MAX_LEGS_AMOUNT as usize,
        ProtocolError::TooManyLegs
    );

    rfq.get_state()?.assert_state_in([RfqState::Constructed])?;

    Ok(())
}

pub fn add_legs_to_rfq_instruction<'info>(
    ctx: Context<'_, '_, '_, 'info, AddLegsToRfqAccounts<'info>>,
    legs: Vec<Leg>,
) -> Result<()> {
    validate(&ctx, &legs)?;

    let AddLegsToRfqAccounts { rfq, .. } = ctx.accounts;

    rfq.legs.append(&mut legs.clone());

    Ok(())
}
