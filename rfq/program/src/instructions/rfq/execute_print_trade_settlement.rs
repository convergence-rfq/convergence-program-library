use crate::{
    errors::ProtocolError,
    seeds::PROTOCOL_SEED,
    state::{
        AuthoritySide, DefaultingParty, ProtocolState, Response, ResponseState, Rfq,
        StoredResponseState,
    },
    interfaces::print_trade_provider::settle_print_trade,
};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct ExecutePrintTradeSettlementAccounts<'info> {
    #[account(mut)]
    pub caller: Signer<'info>,

    #[account(seeds = [PROTOCOL_SEED.as_bytes()], bump = protocol.bump)]
    pub protocol: Account<'info, ProtocolState>,
    pub rfq: Box<Account<'info, Rfq>>,
    #[account(mut, constraint = response.rfq == rfq.key() @ ProtocolError::ResponseForAnotherRfq)]
    pub response: Account<'info, Response>,
}

fn validate(ctx: &Context<ExecutePrintTradeSettlementAccounts>, side: AuthoritySide) -> Result<()> {
    let ExecutePrintTradeSettlementAccounts {
        caller,
        rfq,
        response,
        ..
    } = &ctx.accounts;

    require!(
        rfq.is_settled_as_print_trade(),
        ProtocolError::InvalidSettlingFlow
    );

    let actual_side = response.get_authority_side(rfq, &caller.key());
    require!(
        matches!(actual_side, Some(inner_side) if inner_side == side),
        ProtocolError::NotAPassedAuthority
    );

    let response_state = response.get_state(rfq)?;
    match side {
        AuthoritySide::Taker => {
            response_state.assert_state_in([ResponseState::OnlyMakerPrepared])?
        }
        AuthoritySide::Maker => {
            response_state.assert_state_in([ResponseState::OnlyTakerPrepared])?
        }
    };

    Ok(())
}

pub fn execute_print_trade_settlement_instruction<'info>(
    ctx: Context<'_, '_, '_, 'info, ExecutePrintTradeSettlementAccounts<'info>>,
    side: AuthoritySide,
) -> Result<()> {
    validate(&ctx, side)?;

    let ExecutePrintTradeSettlementAccounts {
        protocol,
        rfq,
        response,
        ..
    } = ctx.accounts;

    // TODO implement receiving the defaulting party
    let defaulting_party: Option<DefaultingParty> = None;

    let mut remaining_accounts = ctx.remaining_accounts.iter();

    settle_print_trade(protocol, rfq, response, &mut remaining_accounts)?;

    if let Some(defaulting_party) = defaulting_party {
        response.defaulting_party = Some(defaulting_party);
        response.state = StoredResponseState::Defaulted;
    } else {
        response.state = StoredResponseState::Settled;
    }

    Ok(())
}
