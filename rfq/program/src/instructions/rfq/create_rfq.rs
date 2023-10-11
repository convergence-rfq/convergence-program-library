use std::mem;

use crate::{
    errors::ProtocolError,
    seeds::RFQ_SEED,
    state::{FixedSize, OrderType, Rfq, StoredRfqState},
};
use anchor_lang::prelude::*;
use anchor_spl::token::Mint;

const RECENT_TIMESTAMP_VALIDITY: u64 = 120; // slightly higher then the recent blockhash validity

#[derive(Accounts)]
#[instruction(
    order_type: OrderType,
    fixed_size: FixedSize,
    active_window: u32,
    recent_timestamp: u64,
)]
pub struct CreateRfqAccounts<'info> {
    #[account(mut)]
    pub taker: Signer<'info>,

    #[account(init, payer = taker, space = 8 + mem::size_of::<Rfq>(), seeds = [
        RFQ_SEED.as_bytes(),
        taker.key().as_ref(),
        &[order_type as u8],
        &fixed_size.try_to_vec().unwrap(),
        &leg_mint.key().as_ref(),
        &quote_mint.key().as_ref(),
        &active_window.to_le_bytes(),
        &recent_timestamp.to_le_bytes(),
    ], bump)]
    pub rfq: Box<Account<'info, Rfq>>,

    pub leg_mint: Account<'info, Mint>,
    pub quote_mint: Account<'info, Mint>,

    pub system_program: Program<'info, System>,
}

fn validate_recent_timestamp(recent_timestamp: u64) -> Result<()> {
    let current_timestamp = Clock::get()?.unix_timestamp as u64;
    let time_offset = recent_timestamp.abs_diff(current_timestamp);

    require!(
        time_offset < RECENT_TIMESTAMP_VALIDITY,
        ProtocolError::InvalidRecentTimestamp
    );

    Ok(())
}

#[allow(clippy::too_many_arguments)]
pub fn create_rfq_instruction<'info>(
    ctx: Context<'_, '_, '_, 'info, CreateRfqAccounts<'info>>,
    order_type: OrderType,
    fixed_size: FixedSize,
    active_window: u32,
    recent_timestamp: u64,
) -> Result<()> {
    validate_recent_timestamp(recent_timestamp)?;

    let CreateRfqAccounts {
        taker,
        rfq,
        leg_mint,
        quote_mint,
        ..
    } = ctx.accounts;

    rfq.set_inner(Rfq {
        taker: taker.key(),
        order_type,
        fixed_size,
        leg_asset: leg_mint.key(),
        leg_asset_decimals: leg_mint.decimals,
        quote_asset: quote_mint.key(),
        quote_asset_decimals: quote_mint.decimals,
        creation_timestamp: Clock::get()?.unix_timestamp,
        active_window,
        state: StoredRfqState::Active,
        total_responses: 0,
        cleared_responses: 0,
        settled_responses: 0,
    });

    Ok(())
}
