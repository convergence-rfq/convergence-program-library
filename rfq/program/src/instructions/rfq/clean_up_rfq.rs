use crate::{
    errors::ProtocolError,
    seeds::PROTOCOL_SEED,
    state::{ProtocolState, Rfq, RfqState},
    whitelist::Whitelist,
};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct CleanUpRfqAccounts<'info> {
    /// CHECK: is a taker address in this rfq
    #[account(mut, constraint = taker.key() == rfq.taker @ ProtocolError::NotATaker)]
    pub taker: UncheckedAccount<'info>,

    #[account(seeds = [PROTOCOL_SEED.as_bytes()], bump = protocol.bump)]
    pub protocol: Box<Account<'info, ProtocolState>>,
    #[account(mut, close = taker)]
    pub rfq: Box<Account<'info, Rfq>>,
    #[account(mut)]
    pub whitelist: Option<Box<Account<'info, Whitelist>>>,
}

fn validate_rfq(ctx: &Context<CleanUpRfqAccounts>) -> Result<()> {
    let CleanUpRfqAccounts { rfq, .. } = &ctx.accounts;

    rfq.get_state()?.assert_state_in([
        RfqState::Canceled,
        RfqState::Expired,
        RfqState::Settling,
        RfqState::SettlingEnded,
        RfqState::Constructed,
        RfqState::ValidatedByPrintTradeProvider,
    ])?;

    require!(
        rfq.total_taker_collateral_locked == 0,
        ProtocolError::HaveCollateralLocked
    );

    require!(
        rfq.total_responses == rfq.cleared_responses,
        ProtocolError::HaveExistingResponses
    );

    Ok(())
}

pub fn clean_up_rfq_instruction(ctx: Context<CleanUpRfqAccounts>) -> Result<()> {
    validate_rfq(&ctx)?;
    validate_whitelist_and_cleanup(&ctx)?;
    Ok(())
}

fn validate_whitelist_and_cleanup(ctx: &Context<CleanUpRfqAccounts>) -> Result<()> {
    let CleanUpRfqAccounts {
        rfq,
        whitelist,
        taker,
        ..
    } = &ctx.accounts;

    Whitelist::validate(whitelist, rfq)?;
    match whitelist {
        Some(whitelist) => {
            return whitelist.close(taker.to_account_info());
        }
        None => {}
    }

    Ok(())
}
