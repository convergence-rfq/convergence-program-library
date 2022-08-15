use std::mem;

use crate::{
    constants::{COLLATERAL_SEED, PROTOCOL_SEED},
    errors::ProtocolError,
    interfaces::risk_engine::calculate_required_collateral_for_response,
    states::{
        CollateralInfo, OrderType, ProtocolState, Quote, Response, Rfq, RfqState,
        StoredResponseState,
    },
};
use anchor_lang::prelude::*;
use anchor_spl::token::TokenAccount;

#[derive(Accounts)]
pub struct RespondToRfqAccounts<'info> {
    #[account(mut)]
    pub maker: Signer<'info>,

    #[account(seeds = [PROTOCOL_SEED.as_bytes()], bump = protocol.bump)]
    pub protocol: Account<'info, ProtocolState>,
    #[account(mut)]
    pub rfq: Account<'info, Rfq>,
    #[account(init, payer = maker, space = 8 + mem::size_of::<Response>())]
    pub response: Account<'info, Response>,
    #[account(seeds = [COLLATERAL_SEED.as_bytes(), maker.key().as_ref()], bump = collateral_info.bump)]
    pub collateral_info: Account<'info, CollateralInfo>,
    #[account(mut, seeds = [COLLATERAL_SEED.as_bytes(), maker.key().as_ref()],
                bump = collateral_info.token_account_bump)]
    pub collateral_token: Account<'info, TokenAccount>,

    #[account(constraint = risk_engine.key() == protocol.risk_engine
        @ ProtocolError::NotARiskEngine)]
    pub risk_engine: AccountInfo<'info>,
    #[account(constraint = risk_engine_register.key() == protocol.risk_engine_register
        @ ProtocolError::NotARiskEngineRegister)]
    pub risk_engine_register: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

fn validate(
    ctx: &Context<RespondToRfqAccounts>,
    bid: Option<Quote>,
    ask: Option<Quote>,
) -> Result<()> {
    let RespondToRfqAccounts { rfq, .. } = &ctx.accounts;

    require!(
        rfq.get_state()? == RfqState::Active,
        ProtocolError::RfqIsNotActive
    );

    match rfq.order_type {
        OrderType::Buy => require!(
            bid.is_some() && ask.is_none(),
            ProtocolError::ResponseDoesNotMatchOrderType
        ),
        OrderType::Sell => require!(
            bid.is_none() && ask.is_some(),
            ProtocolError::ResponseDoesNotMatchOrderType
        ),
        OrderType::TwoWay => require!(
            bid.is_some() || ask.is_some(),
            ProtocolError::ResponseDoesNotMatchOrderType
        ),
    }

    Ok(())
}

pub fn respond_to_rfq_instruction(
    ctx: Context<RespondToRfqAccounts>,
    bid: Option<Quote>,
    ask: Option<Quote>,
) -> Result<()> {
    validate(&ctx, bid, ask)?;

    let RespondToRfqAccounts {
        maker,
        rfq,
        response,
        collateral_info,
        collateral_token,
        risk_engine,
        risk_engine_register,
        ..
    } = ctx.accounts;

    let required_collateral = calculate_required_collateral_for_response(
        &rfq.to_account_info(),
        risk_engine,
        risk_engine_register,
        bid,
        ask,
    )?;
    require!(
        required_collateral <= collateral_token.amount - collateral_info.locked_tokens_amount,
        ProtocolError::NotEnoughCollateral
    );
    collateral_info.locked_tokens_amount += required_collateral;

    response.set_inner(Response {
        maker: maker.key(),
        rfq: rfq.key(),
        creation_timestamp: Clock::get()?.unix_timestamp,
        maker_collateral_locked: required_collateral,
        taker_collateral_locked: 0,
        state: StoredResponseState::Active,
        confirmed: None,
        bid,
        ask,
    });

    rfq.total_responses += 1;

    Ok(())
}
