use crate::{
    common::unlock_response_collateral,
    constants::{COLLATERAL_SEED, PROTOCOL_SEED},
    errors::ProtocolError,
    states::{CollateralInfo, ProtocolState, Response, ResponseState, Rfq},
};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct UnlockResponseCollateralAccounts<'info> {
    #[account(seeds = [PROTOCOL_SEED.as_bytes()], bump = protocol.bump)]
    pub protocol: Account<'info, ProtocolState>,
    #[account(mut)]
    pub rfq: Box<Account<'info, Rfq>>,
    #[account(mut, constraint = response.rfq == rfq.key() @ ProtocolError::ResponseForAnotherRfq)]
    pub response: Account<'info, Response>,

    #[account(mut, seeds = [COLLATERAL_SEED.as_bytes(), rfq.taker.key().as_ref()],
                bump = taker_collateral_info.bump)]
    pub taker_collateral_info: Account<'info, CollateralInfo>,
    #[account(mut, seeds = [COLLATERAL_SEED.as_bytes(), response.maker.as_ref()],
                bump = maker_collateral_info.bump)]
    pub maker_collateral_info: Account<'info, CollateralInfo>,
}

fn validate(ctx: &Context<UnlockResponseCollateralAccounts>) -> Result<()> {
    let UnlockResponseCollateralAccounts { rfq, response, .. } = &ctx.accounts;

    response.get_state(rfq)?.assert_state_in([
        ResponseState::Canceled,
        ResponseState::Expired,
        ResponseState::Settled,
    ])?;

    require!(
        response.have_locked_collateral(),
        ProtocolError::NoCollateralLocked
    );

    Ok(())
}

pub fn unlock_response_collateral_instruction(
    ctx: Context<UnlockResponseCollateralAccounts>,
) -> Result<()> {
    validate(&ctx)?;

    let UnlockResponseCollateralAccounts {
        rfq,
        response,
        taker_collateral_info,
        maker_collateral_info,
        ..
    } = ctx.accounts;

    unlock_response_collateral(rfq, response, taker_collateral_info, maker_collateral_info);

    Ok(())
}
