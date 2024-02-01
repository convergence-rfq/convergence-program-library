use crate::{
    errors::ProtocolError,
    interfaces::print_trade_provider::validate_print_trade,
    seeds::PROTOCOL_SEED,
    state::{ProtocolState, Rfq, RfqState, StoredRfqState},
};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct ValidateRfqByPrintTradeProviderAccounts<'info> {
    #[account(constraint = taker.key() == rfq.taker @ ProtocolError::NotATaker)]
    pub taker: Signer<'info>,

    #[account(seeds = [PROTOCOL_SEED.as_bytes()], bump = protocol.bump)]
    pub protocol: Box<Account<'info, ProtocolState>>,
    #[account(mut)]
    pub rfq: Box<Account<'info, Rfq>>,
}

fn validate(ctx: &Context<ValidateRfqByPrintTradeProviderAccounts>) -> Result<()> {
    let ValidateRfqByPrintTradeProviderAccounts { rfq, .. } = &ctx.accounts;

    require!(
        rfq.is_settled_as_print_trade(),
        ProtocolError::InvalidSettlingFlow
    );

    rfq.get_state()?.assert_state_in([RfqState::Constructed])?;

    let serialized_legs = rfq.legs.try_to_vec()?;
    require!(
        serialized_legs.len() == rfq.expected_legs_size as usize,
        ProtocolError::LegsSizeDoesNotMatchExpectedSize
    );

    Ok(())
}

pub fn validate_rfq_by_print_trade_provider_instruction<'info>(
    ctx: Context<'_, '_, '_, 'info, ValidateRfqByPrintTradeProviderAccounts<'info>>,
) -> Result<()> {
    validate(&ctx)?;

    let ValidateRfqByPrintTradeProviderAccounts { protocol, rfq, .. } = ctx.accounts;

    let mut remaining_accounts = ctx.remaining_accounts.iter();
    validate_print_trade(rfq, protocol, &mut remaining_accounts)?;

    rfq.state = StoredRfqState::ValidatedByPrintTradeProvider;

    Ok(())
}
