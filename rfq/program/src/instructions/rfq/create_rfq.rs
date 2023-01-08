use std::mem;

use crate::{
    errors::ProtocolError,
    interfaces::instrument::{validate_leg_instrument_data, validate_quote_instrument_data},
    seeds::PROTOCOL_SEED,
    state::{rfq::QuoteAsset, FixedSize, Leg, OrderType, ProtocolState, Rfq, StoredRfqState},
};
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(expected_leg_size: u16)]
pub struct CreateRfqAccounts<'info> {
    #[account(mut)]
    pub taker: Signer<'info>,

    #[account(seeds = [PROTOCOL_SEED.as_bytes()], bump = protocol.bump)]
    pub protocol: Account<'info, ProtocolState>,
    #[account(init, payer = taker, space = 8 + mem::size_of::<Rfq>() + expected_leg_size as usize)]
    pub rfq: Box<Account<'info, Rfq>>,

    pub system_program: Program<'info, System>,
}

fn validate_quote<'a, 'info: 'a>(
    protocol: &Account<'info, ProtocolState>,
    remaining_accounts: &mut impl Iterator<Item = &'a AccountInfo<'info>>,
    quote_asset: &QuoteAsset,
) -> Result<()> {
    let instrument_parameters =
        protocol.get_instrument_parameters(quote_asset.instrument_program)?;

    require!(
        instrument_parameters.can_be_used_as_quote,
        ProtocolError::InvalidQuoteInstrument
    );

    validate_quote_instrument_data(quote_asset, protocol, remaining_accounts)?;

    Ok(())
}

fn validate_legs<'a, 'info: 'a>(
    protocol: &Account<'info, ProtocolState>,
    remaining_accounts: &mut impl Iterator<Item = &'a AccountInfo<'info>>,
    expected_leg_size: u16,
    legs: &[Leg],
) -> Result<()> {
    require!(
        legs.len() <= Rfq::MAX_LEGS_AMOUNT as usize,
        ProtocolError::TooManyLegs
    );
    require!(
        expected_leg_size <= Rfq::MAX_LEGS_SIZE,
        ProtocolError::LegsDataTooBig
    );

    for leg in legs.iter() {
        validate_leg_instrument_data(leg, protocol, remaining_accounts)?;
    }

    Ok(())
}

pub fn create_rfq_instruction<'info>(
    ctx: Context<'_, '_, '_, 'info, CreateRfqAccounts<'info>>,
    expected_leg_size: u16,
    legs: Vec<Leg>,
    order_type: OrderType,
    quote_asset: QuoteAsset,
    fixed_size: FixedSize,
    active_window: u32,
    settling_window: u32,
) -> Result<()> {
    let protocol = &ctx.accounts.protocol;
    let mut remaining_accounts = ctx.remaining_accounts.iter();
    validate_quote(protocol, &mut remaining_accounts, &quote_asset)?;


    validate_legs(protocol, &mut remaining_accounts, expected_leg_size, &legs)?;

    let CreateRfqAccounts { taker, rfq, .. } = ctx.accounts;

    rfq.set_inner(Rfq {
        taker: taker.key(),
        order_type,
        last_look_enabled: false, // TODO add logic later
        fixed_size,
        quote_asset,
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
