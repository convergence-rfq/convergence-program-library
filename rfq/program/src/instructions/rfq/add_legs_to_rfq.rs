use crate::{
    common::validate_legs,
    errors::ProtocolError,
    seeds::PROTOCOL_SEED,
    state::{ApiLeg, ProtocolState, Rfq, RfqState},
};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct AddLegsToRfqAccounts<'info> {
    #[account(constraint = taker.key() == rfq.taker @ ProtocolError::NotATaker)]
    pub taker: Signer<'info>,

    #[account(seeds = [PROTOCOL_SEED.as_bytes()], bump = protocol.bump)]
    pub protocol: Box<Account<'info, ProtocolState>>,
    #[account(mut)]
    pub rfq: Box<Account<'info, Rfq>>,
}

fn validate<'info>(
    ctx: &Context<'_, '_, '_, 'info, AddLegsToRfqAccounts<'info>>,
    legs: &[ApiLeg],
) -> Result<()> {
    let AddLegsToRfqAccounts { protocol, rfq, .. } = &ctx.accounts;
    let mut remaining_accounts = ctx.remaining_accounts.iter();

    validate_legs(
        legs,
        protocol,
        &mut remaining_accounts,
        rfq.is_settled_as_print_trade(),
    )?;

    require!(!legs.is_empty(), ProtocolError::EmptyLegsNotSupported);
    require!(
        legs.len() + rfq.legs.len() <= Rfq::MAX_LEGS_AMOUNT as usize,
        ProtocolError::TooManyLegs
    );

    rfq.get_state()?.assert_state_in([RfqState::Constructed])?;

    Ok(())
}

pub fn add_legs_to_rfq_instruction<'info>(
    ctx: Context<'_, '_, '_, 'info, AddLegsToRfqAccounts<'info>>,
    legs: Vec<ApiLeg>,
) -> Result<()> {
    validate(&ctx, &legs)?;

    let AddLegsToRfqAccounts { rfq, .. } = ctx.accounts;

    for leg in legs {
        rfq.legs.push(leg.into());
    }

    Ok(())
}
