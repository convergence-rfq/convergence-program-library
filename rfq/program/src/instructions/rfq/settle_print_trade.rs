use crate::{
    errors::ProtocolError,
    interfaces::print_trade_provider::{settle_print_trade, SettlementResult},
    seeds::PROTOCOL_SEED,
    state::{DefaultingParty, ProtocolState, Response, ResponseState, Rfq, StoredResponseState},
};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct SettlePrintTradeAccounts<'info> {
    #[account(seeds = [PROTOCOL_SEED.as_bytes()], bump = protocol.bump)]
    pub protocol: Box<Account<'info, ProtocolState>>,
    pub rfq: Box<Account<'info, Rfq>>,
    #[account(mut, constraint = response.rfq == rfq.key() @ ProtocolError::ResponseForAnotherRfq)]
    pub response: Account<'info, Response>,
}

fn validate(ctx: &Context<SettlePrintTradeAccounts>) -> Result<()> {
    let SettlePrintTradeAccounts { rfq, response, .. } = &ctx.accounts;

    require!(
        rfq.is_settled_as_print_trade(),
        ProtocolError::InvalidSettlingFlow
    );

    response
        .get_state(rfq)?
        .assert_state_in([ResponseState::ReadyForSettling])?;

    Ok(())
}

pub fn settle_print_trade_instruction<'info>(
    ctx: Context<'_, '_, '_, 'info, SettlePrintTradeAccounts<'info>>,
) -> Result<()> {
    validate(&ctx)?;

    let SettlePrintTradeAccounts {
        protocol,
        rfq,
        response,
        ..
    } = ctx.accounts;

    let mut remaining_accounts = ctx.remaining_accounts.iter();
    let settlement_result = settle_print_trade(protocol, rfq, response, &mut remaining_accounts)?;

    match settlement_result {
        SettlementResult::Success => response.state = StoredResponseState::Settled,
        SettlementResult::TakerDefaults => {
            response.state = StoredResponseState::Defaulted;
            response.defaulting_party = Some(DefaultingParty::Taker);
        }
        SettlementResult::MakerDefaults => {
            response.state = StoredResponseState::Defaulted;
            response.defaulting_party = Some(DefaultingParty::Maker);
        }
        SettlementResult::BothPartiesDefault => {
            response.state = StoredResponseState::Defaulted;
            response.defaulting_party = Some(DefaultingParty::Both);
        }
    }

    Ok(())
}
