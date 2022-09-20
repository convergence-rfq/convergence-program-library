use crate::{
    constants::{COLLATERAL_SEED, COLLATERAL_TOKEN_SEED, PROTOCOL_SEED},
    errors::ProtocolError,
    interfaces::risk_engine::calculate_required_collateral_for_rfq,
    states::{CollateralInfo, ProtocolState, Rfq, RfqState, StoredRfqState},
};
use anchor_lang::prelude::*;
use anchor_spl::token::TokenAccount;

#[derive(Accounts)]
pub struct FinalizeRfqConstructionAccounts<'info> {
    #[account(constraint = taker.key() == rfq.taker @ ProtocolError::NotATaker)]
    pub taker: Signer<'info>,

    #[account(seeds = [PROTOCOL_SEED.as_bytes()], bump = protocol.bump)]
    pub protocol: Account<'info, ProtocolState>,
    #[account(mut)]
    pub rfq: Account<'info, Rfq>,
    #[account(mut, seeds = [COLLATERAL_SEED.as_bytes(), taker.key().as_ref()],
                bump = collateral_info.bump)]
    pub collateral_info: Account<'info, CollateralInfo>,
    #[account(seeds = [COLLATERAL_TOKEN_SEED.as_bytes(), taker.key().as_ref()],
                bump = collateral_info.token_account_bump)]
    pub collateral_token: Account<'info, TokenAccount>,

    /// CHECK: is a valid risk engine program id
    #[account(constraint = risk_engine.key() == protocol.risk_engine
        @ ProtocolError::NotARiskEngine)]
    pub risk_engine: UncheckedAccount<'info>,
}

fn validate(ctx: &Context<FinalizeRfqConstructionAccounts>) -> Result<()> {
    let FinalizeRfqConstructionAccounts { rfq, .. } = &ctx.accounts;

    rfq.get_state()?.assert_state_in([RfqState::Constructed])?;

    require!(rfq.legs.len() > 0, ProtocolError::EmptyLegsNotSupported);

    let serialized_legs = rfq.legs.try_to_vec()?;
    require!(
        serialized_legs.len() == rfq.expected_leg_size as usize,
        ProtocolError::LegSizeDoesNotMatchExpectedSize
    );

    Ok(())
}

pub fn finalize_rfq_construction_instruction(
    ctx: Context<FinalizeRfqConstructionAccounts>,
) -> Result<()> {
    validate(&ctx)?;

    let FinalizeRfqConstructionAccounts {
        rfq,
        collateral_info,
        collateral_token,
        risk_engine,
        ..
    } = ctx.accounts;

    let required_collateral =
        calculate_required_collateral_for_rfq(&rfq.to_account_info(), risk_engine)?;

    collateral_info.lock_collateral(collateral_token, required_collateral)?;
    rfq.non_response_taker_collateral_locked = required_collateral;
    rfq.total_taker_collateral_locked = required_collateral;

    rfq.creation_timestamp = Clock::get()?.unix_timestamp;
    rfq.state = StoredRfqState::Active;

    Ok(())
}