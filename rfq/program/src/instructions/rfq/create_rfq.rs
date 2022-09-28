use std::mem;

use crate::{
    constants::{MAX_LEGS_AMOUNT, MAX_LEGS_SIZE, PROTOCOL_SEED},
    errors::ProtocolError,
    interfaces::instrument::validate_instrument_data,
    states::{FixedSize, Leg, OrderType, ProtocolState, Rfq, StoredRfqState},
};
use anchor_lang::prelude::*;
use anchor_spl::token::Mint;

#[derive(Accounts)]
#[instruction(expected_leg_size: u16)]
pub struct CreateRfqAccounts<'info> {
    #[account(mut)]
    pub taker: Signer<'info>,

    #[account(seeds = [PROTOCOL_SEED.as_bytes()], bump = protocol.bump)]
    pub protocol: Account<'info, ProtocolState>,
    #[account(init, payer = taker, space = 8 + mem::size_of::<Rfq>() + expected_leg_size as usize)]
    pub rfq: Box<Account<'info, Rfq>>,

    pub quote_mint: Account<'info, Mint>,

    pub system_program: Program<'info, System>,
}

fn validate_legs<'info>(
    ctx: &Context<'_, '_, '_, 'info, CreateRfqAccounts<'info>>,
    expected_leg_size: u16,
    legs: &[Leg],
) -> Result<()> {
    let CreateRfqAccounts { protocol, .. } = &ctx.accounts;
    let mut remaining_accounts = ctx.remaining_accounts.iter();

    require!(
        legs.len() <= MAX_LEGS_AMOUNT as usize,
        ProtocolError::TooManyLegs
    );
    require!(
        expected_leg_size <= MAX_LEGS_SIZE,
        ProtocolError::LegsDataTooBig
    );

    for leg in legs.iter() {
        validate_instrument_data(leg, protocol, &mut remaining_accounts)?;
    }

    Ok(())
}

pub fn create_rfq_instruction<'info>(
    ctx: Context<'_, '_, '_, 'info, CreateRfqAccounts<'info>>,
    expected_leg_size: u16,
    legs: Vec<Leg>,
    order_type: OrderType,
    fixed_size: FixedSize,
    active_window: u32,
    settling_window: u32,
) -> Result<()> {
    validate_legs(&ctx, expected_leg_size, &legs)?;

    let CreateRfqAccounts {
        taker,
        rfq,
        quote_mint,
        ..
    } = ctx.accounts;

    rfq.set_inner(Rfq {
        taker: taker.key(),
        order_type,
        last_look_enabled: false, // TODO add logic later
        fixed_size,               // TODO add logic later
        quote_mint: quote_mint.key(),
        access_manager: None, // TODO add logic later
        creation_timestamp: 0,
        active_window,
        settling_window,
        expected_leg_size,
        state: StoredRfqState::Constructed,
        non_response_taker_collateral_locked: 0,
        total_taker_collateral_locked: 0,
        total_responses: 0,
        cleared_responses: 0,
        confirmed_responses: 0,
        legs,
    });

    Ok(())
}
