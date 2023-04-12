use std::mem;

use crate::{
    common::validate_legs as common_validate_legs,
    errors::ProtocolError,
    interfaces::instrument::validate_quote_instrument_data,
    seeds::{PROTOCOL_SEED, RFQ_SEED},
    state::{rfq::QuoteAsset, FixedSize, Leg, OrderType, ProtocolState, Rfq, StoredRfqState},
};
use anchor_lang::prelude::*;
use solana_program::hash::hash;

const RECENT_TIMESTAMP_VALIDITY: u64 = 90; // slightly higher then the recent blockhash validity

#[derive(Accounts)]
#[instruction(
    expected_legs_size: u16,
    expected_legs_hash: [u8; 32],
    _legs: Vec<Leg>,
    order_type: OrderType,
    quote_asset: QuoteAsset,
    fixed_size: FixedSize,
    active_window: u32,
    settling_window: u32,
    recent_timestamp: u64,
)]
pub struct CreateRfqAccounts<'info> {
    #[account(mut)]
    pub taker: Signer<'info>,

    #[account(seeds = [PROTOCOL_SEED.as_bytes()], bump = protocol.bump)]
    pub protocol: Account<'info, ProtocolState>,
    #[account(init, payer = taker, space = 8 + mem::size_of::<Rfq>() + expected_legs_size as usize, seeds = [
        RFQ_SEED.as_bytes(),
        taker.key().as_ref(),
        &expected_legs_hash,
        &[order_type as u8],
        &hash(&quote_asset.try_to_vec().unwrap()).to_bytes(),
        &fixed_size.try_to_vec().unwrap(),
        &active_window.to_le_bytes(),
        &settling_window.to_le_bytes(),
        &recent_timestamp.to_le_bytes(),
    ], bump)]
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

    common_validate_legs(legs, protocol, remaining_accounts)?;

    Ok(())
}

fn validate_recent_timestamp(recent_timestamp: u64) -> Result<()> {
    let current_timestamp = Clock::get()?.unix_timestamp as u64;

    require!(
        recent_timestamp <= current_timestamp
            && (current_timestamp - recent_timestamp) < RECENT_TIMESTAMP_VALIDITY,
        // TODO: Could rename
        ProtocolError::InvalidRecentBlockhash
    );

    Ok(())
}

pub fn create_rfq_instruction<'info>(
    ctx: Context<'_, '_, '_, 'info, CreateRfqAccounts<'info>>,
    expected_legs_size: u16,
    expected_legs_hash: [u8; 32],
    legs: Vec<Leg>,
    order_type: OrderType,
    quote_asset: QuoteAsset,
    fixed_size: FixedSize,
    active_window: u32,
    settling_window: u32,
    recent_timestamp: u64,
) -> Result<()> {
    let protocol = &ctx.accounts.protocol;
    let mut remaining_accounts = ctx.remaining_accounts.iter();
    validate_quote(protocol, &mut remaining_accounts, &quote_asset)?;
    validate_legs(protocol, &mut remaining_accounts, expected_legs_size, &legs)?;
    validate_recent_timestamp(recent_timestamp)?;

    let CreateRfqAccounts { taker, rfq, .. } = ctx.accounts;

    rfq.set_inner(Rfq {
        taker: taker.key(),
        order_type,
        fixed_size,
        quote_asset,
        creation_timestamp: 0,
        active_window,
        settling_window,
        expected_legs_size,
        expected_legs_hash,
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
