use std::mem;

use crate::{
    constants::{COLLATERAL_SEED, COLLATERAL_TOKEN_SEED, PROTOCOL_SEED},
    errors::ProtocolError,
    interfaces::{
        instrument::validate_instrument_data, risk_engine::calculate_required_collateral_for_rfq,
    },
    states::{CollateralInfo, FixedSize, Leg, OrderType, ProtocolState, Rfq, StoredRfqState},
};
use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, TokenAccount};

#[derive(Accounts)]
#[instruction(legs: Vec<Leg>)]
pub struct InitializeRfqAccounts<'info> {
    #[account(mut)]
    pub taker: Signer<'info>,

    #[account(seeds = [PROTOCOL_SEED.as_bytes()], bump = protocol.bump)]
    pub protocol: Account<'info, ProtocolState>,
    #[account(init, payer = taker, space = 8 + mem::size_of::<Rfq>() + calculate_legs_size(legs))]
    pub rfq: Account<'info, Rfq>,
    #[account(mut, seeds = [COLLATERAL_SEED.as_bytes(), taker.key().as_ref()],
                bump = collateral_info.bump)]
    pub collateral_info: Account<'info, CollateralInfo>,
    #[account(seeds = [COLLATERAL_TOKEN_SEED.as_bytes(), taker.key().as_ref()],
                bump = collateral_info.token_account_bump)]
    pub collateral_token: Account<'info, TokenAccount>,

    pub quote_mint: Account<'info, Mint>,
    /// CHECK: is a valid risk engine program id
    #[account(constraint = risk_engine.key() == protocol.risk_engine
        @ ProtocolError::NotARiskEngine)]
    pub risk_engine: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

fn validate_legs<'info>(
    ctx: &Context<'_, '_, '_, 'info, InitializeRfqAccounts<'info>>,
    legs: &[Leg],
) -> Result<()> {
    let InitializeRfqAccounts { protocol, .. } = &ctx.accounts;
    let mut remaining_accounts = ctx.remaining_accounts.iter();

    require!(legs.len() > 0, ProtocolError::EmptyLegsNotSupported);

    for leg in legs.iter() {
        validate_instrument_data(leg, protocol, &mut remaining_accounts)?;
    }

    Ok(())
}

pub fn initialize_rfq_instruction<'info>(
    ctx: Context<'_, '_, '_, 'info, InitializeRfqAccounts<'info>>,
    legs: Vec<Leg>,
    order_type: OrderType,
    active_window: u32,
    settling_window: u32,
) -> Result<()> {
    validate_legs(&ctx, &legs)?;

    let InitializeRfqAccounts {
        taker,
        rfq,
        collateral_info,
        collateral_token,
        quote_mint,
        risk_engine,
        ..
    } = ctx.accounts;

    let fixed_size = FixedSize::None { padding: 0 };
    rfq.set_inner(Rfq {
        taker: taker.key(),
        order_type,
        last_look_enabled: false, // TODO add logic later
        fixed_size,               // TODO add logic later
        quote_mint: quote_mint.key(),
        access_manager: None, // TODO add logic later
        creation_timestamp: Clock::get()?.unix_timestamp,
        active_window,
        settling_window,
        state: StoredRfqState::Active,
        non_response_taker_collateral_locked: 0,
        total_taker_collateral_locked: 0,
        total_responses: 0,
        cleared_responses: 0,
        confirmed_responses: 0,
        legs,
    });
    rfq.exit(ctx.program_id)?;

    let required_collateral =
        calculate_required_collateral_for_rfq(&rfq.to_account_info(), risk_engine)?;

    collateral_info.lock_collateral(collateral_token, required_collateral)?;
    rfq.non_response_taker_collateral_locked = required_collateral;
    rfq.total_taker_collateral_locked = required_collateral;

    Ok(())
}

fn calculate_legs_size(legs: Vec<Leg>) -> usize {
    let mut size = 0;
    for leg in legs.iter() {
        size += Leg::EMPTY_SIZE;
        size += leg.instrument_data.len();
    }
    size
}
