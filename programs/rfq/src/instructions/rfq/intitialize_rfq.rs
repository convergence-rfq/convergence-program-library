use std::mem;

use crate::{
    constants::{COLLATERAL_SEED, PROTOCOL_SEED},
    errors::ProtocolError,
    interfaces::{
        instrument::validate_instrument_data, risk_engine::calculate_required_collateral_for_rfq,
    },
    states::{CollateralInfo, FixedSize, Leg, OrderType, ProtocolState, Rfq, StoredRfqState},
};
use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, TokenAccount};

#[derive(Accounts)]
pub struct InitializeRfqAccounts<'info> {
    #[account(mut)]
    pub taker: Signer<'info>,

    #[account(seeds = [PROTOCOL_SEED.as_bytes()], bump = protocol.bump)]
    pub protocol: Account<'info, ProtocolState>,
    #[account(init, payer = taker, space = 8 + mem::size_of::<Rfq>())]
    pub rfq: Account<'info, Rfq>,
    #[account(mut, seeds = [COLLATERAL_SEED.as_bytes(), taker.key().as_ref()],
                bump = collateral_info.bump)]
    pub collateral_info: Account<'info, CollateralInfo>,
    #[account(seeds = [COLLATERAL_SEED.as_bytes(), taker.key().as_ref()],
                bump = collateral_info.token_account_bump)]
    pub collateral_token: Account<'info, TokenAccount>,

    pub quote_mint: Account<'info, Mint>,
    #[account(constraint = risk_engine.key() == protocol.risk_engine
        @ ProtocolError::NotARiskEngine)]
    pub risk_engine: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

fn validate_legs(ctx: &Context<InitializeRfqAccounts>, legs: &[Leg]) -> Result<()> {
    let InitializeRfqAccounts { protocol, .. } = &ctx.accounts;
    let mut remaining_accounts = ctx.remaining_accounts.iter();

    for leg in legs.iter() {
        let instruction_parameters = protocol
            .instruments
            .get(&leg.instrument)
            .ok_or(ProtocolError::NotAWhitelistedInstrument)?;

        validate_instrument_data(
            leg,
            &leg.instrument.key(),
            *instruction_parameters,
            &mut remaining_accounts,
        )?;
    }

    Ok(())
}

pub fn initialize_rfq_instruction(
    ctx: Context<InitializeRfqAccounts>,
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
    let required_collateral =
        calculate_required_collateral_for_rfq(&taker.key(), risk_engine, &legs, &fixed_size)?;
    collateral_info.lock_collateral(collateral_token, required_collateral)?;

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
        non_response_taker_collateral_locked: required_collateral,
        total_taker_collateral_locked: required_collateral,
        total_responses: 0,
        cleared_responses: 0,
        confirmed_responses: 0,
        legs,
    });

    Ok(())
}
