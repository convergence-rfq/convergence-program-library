use crate::{
    errors::ProtocolError,
    seeds::PROTOCOL_SEED,
    state::{AuthoritySide, ProtocolState, Response, ResponseState, Rfq},
};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct PreparePrintTradeSettlementAccounts<'info> {
    #[account(mut)]
    pub caller: Signer<'info>,

    #[account(seeds = [PROTOCOL_SEED.as_bytes()], bump = protocol.bump)]
    pub protocol: Account<'info, ProtocolState>,
    pub rfq: Box<Account<'info, Rfq>>,
    #[account(mut, constraint = response.rfq == rfq.key() @ ProtocolError::ResponseForAnotherRfq)]
    pub response: Account<'info, Response>,
}

fn validate(ctx: &Context<PreparePrintTradeSettlementAccounts>, side: AuthoritySide) -> Result<()> {
    let PreparePrintTradeSettlementAccounts {
        caller,
        rfq,
        response,
        ..
    } = &ctx.accounts;

    require!(
        rfq.is_settled_as_print_trade(),
        ProtocolError::InvalidSettlingMethod
    );

    let actual_side = response.get_authority_side(rfq, &caller.key());
    require!(
        matches!(actual_side, Some(inner_side) if inner_side == side),
        ProtocolError::NotAPassedAuthority
    );

    response
        .get_state(rfq)?
        .assert_state_in([ResponseState::SettlingPreparations])?;

    Ok(())
}

pub fn prepare_print_trade_settlement_instruction<'info>(
    ctx: Context<'_, '_, '_, 'info, PreparePrintTradeSettlementAccounts<'info>>,
    side: AuthoritySide,
) -> Result<()> {
    validate(&ctx, side)?;

    let PreparePrintTradeSettlementAccounts {
        protocol,
        rfq,
        response,
        ..
    } = ctx.accounts;

    // TODO implement print trade creation by the print trade provider
    unimplemented!();

    response.print_trade_prepared_by = Some(side);

    Ok(())
}
