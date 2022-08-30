use crate::{
    constants::{COLLATERAL_SEED, COLLATERAL_TOKEN_SEED, PROTOCOL_SEED},
    errors::ProtocolError,
    interfaces::risk_engine::calculate_required_collateral_for_confirmation,
    states::{
        CollateralInfo, ProtocolState, Quote, Response, ResponseState, Rfq, RfqState, Side,
        StoredResponseState,
    },
};
use anchor_lang::prelude::*;
use anchor_spl::token::TokenAccount;

#[derive(Accounts)]
pub struct ConfirmResponseAccounts<'info> {
    #[account(constraint = taker.key() == rfq.taker @ ProtocolError::NotATaker)]
    pub taker: Signer<'info>,

    #[account(seeds = [PROTOCOL_SEED.as_bytes()], bump = protocol.bump)]
    pub protocol: Account<'info, ProtocolState>,
    #[account(mut)]
    pub rfq: Account<'info, Rfq>,
    #[account(mut, constraint = response.rfq == rfq.key() @ ProtocolError::ResponseForAnotherRfq)]
    pub response: Account<'info, Response>,
    #[account(mut, seeds = [COLLATERAL_SEED.as_bytes(), taker.key().as_ref()],
                bump = collateral_info.bump)]
    pub collateral_info: Account<'info, CollateralInfo>,
    #[account(mut, seeds = [COLLATERAL_SEED.as_bytes(), response.maker.as_ref()],
                bump = maker_collateral_info.bump)]
    pub maker_collateral_info: Account<'info, CollateralInfo>,
    #[account(seeds = [COLLATERAL_TOKEN_SEED.as_bytes(), taker.key().as_ref()],
                bump = collateral_info.token_account_bump)]
    pub collateral_token: Account<'info, TokenAccount>,

    /// CHECK: is a valid risk engine program id
    #[account(constraint = risk_engine.key() == protocol.risk_engine
        @ ProtocolError::NotARiskEngine)]
    pub risk_engine: UncheckedAccount<'info>,
}

fn validate(
    ctx: &Context<ConfirmResponseAccounts>,
    side: Side,
    leg_multiplier_bps: Option<u64>,
) -> Result<()> {
    let ConfirmResponseAccounts { rfq, response, .. } = &ctx.accounts;

    require!(
        rfq.get_state()? == RfqState::Active,
        ProtocolError::RfqIsNotInRequiredState
    );
    response
        .get_state(rfq)?
        .assert_state_in([ResponseState::Active])?;

    match side {
        Side::Bid => require!(response.bid.is_some(), ProtocolError::ConfirmedSideMissing),
        Side::Ask => require!(response.ask.is_some(), ProtocolError::ConfirmedSideMissing),
    }

    if rfq.is_fixed_size() {
        require!(
            leg_multiplier_bps.is_none(),
            ProtocolError::NoLegMultiplierForFixedSize
        );
    }

    Ok(())
}

pub fn confirm_response_instruction(
    ctx: Context<ConfirmResponseAccounts>,
    side: Side,
    leg_multiplier_bps: Option<u64>,
) -> Result<()> {
    validate(&ctx, side, leg_multiplier_bps)?;

    let ConfirmResponseAccounts {
        rfq,
        response,
        collateral_info,
        collateral_token,
        maker_collateral_info,
        risk_engine,
        ..
    } = ctx.accounts;

    response.confirmed = Some(side);
    response.state = StoredResponseState::SettlingPreparations;
    if let Some(leg_multiplier_bps) = leg_multiplier_bps {
        // update stored leg multiplier
        let quote = response.get_mut_confirmed_quote().unwrap();
        match quote {
            Quote::Standart {
                price_quote: _,
                legs_multiplier_bps: stored,
            } => {
                require!(
                    leg_multiplier_bps <= *stored,
                    ProtocolError::LegMultiplierHigherThanInQuote
                );
                *stored = leg_multiplier_bps
            }
            _ => unreachable!(),
        }
    }
    response.exit(ctx.program_id)?;

    let (taker_collateral, maker_collateral) = calculate_required_collateral_for_confirmation(
        &rfq.to_account_info(),
        &response.to_account_info(),
        risk_engine,
    )?;
    let collateral_taken_from_already_deposited =
        u64::min(taker_collateral, rfq.non_response_taker_collateral_locked);
    let locked_collateral = taker_collateral - collateral_taken_from_already_deposited;
    rfq.non_response_taker_collateral_locked -= collateral_taken_from_already_deposited;
    response.taker_collateral_locked = taker_collateral;
    if locked_collateral > 0 {
        collateral_info.lock_collateral(collateral_token, taker_collateral)?;
    }

    require!(
        maker_collateral <= response.maker_collateral_locked,
        ProtocolError::CanNotLockAdditionalMakerCollateral
    );
    let maker_collateral_to_unlock = response.maker_collateral_locked - maker_collateral;
    if maker_collateral_to_unlock > 0 {
        maker_collateral_info.unlock_collateral(maker_collateral_to_unlock);
        response.maker_collateral_locked -= maker_collateral_to_unlock;
    }

    Ok(())
}
