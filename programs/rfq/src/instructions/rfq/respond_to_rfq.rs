use std::mem;

use crate::{
    constants::{COLLATERAL_SEED, PROTOCOL_SEED},
    errors::ProtocolError,
    interfaces::risk_engine::calculate_required_collateral_for_response,
    states::{
        CollateralInfo, FixedSize, OrderType, ProtocolState, Quote, Response, Rfq, RfqState,
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
    #[account(mut, seeds = [COLLATERAL_SEED.as_bytes(), maker.key().as_ref()],
                bump = collateral_info.bump)]
    pub collateral_info: Account<'info, CollateralInfo>,
    #[account(seeds = [COLLATERAL_SEED.as_bytes(), maker.key().as_ref()],
                bump = collateral_info.token_account_bump)]
    pub collateral_token: Account<'info, TokenAccount>,

    /// CHECK: is a valid risk engine program id
    #[account(constraint = risk_engine.key() == protocol.risk_engine
        @ ProtocolError::NotARiskEngine)]
    pub risk_engine: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

fn validate(
    ctx: &Context<RespondToRfqAccounts>,
    bid: Option<Quote>,
    ask: Option<Quote>,
) -> Result<()> {
    let RespondToRfqAccounts { maker, rfq, .. } = &ctx.accounts;

    require!(maker.key() != rfq.taker, ProtocolError::TakerCanNotRespond);

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
    };

    let is_rfq_fixed_sized = !matches!(rfq.fixed_size, FixedSize::None { padding: _ });
    if let Some(quote) = bid {
        let is_quote_fixed_size = matches!(quote, Quote::FixedSize { price_quote: _ });
        require!(
            is_rfq_fixed_sized == is_quote_fixed_size,
            ProtocolError::InvalidQuoteType
        );
    }
    if let Some(quote) = ask {
        let is_quote_fixed_size = matches!(quote, Quote::FixedSize { price_quote: _ });
        require!(
            is_rfq_fixed_sized == is_quote_fixed_size,
            ProtocolError::InvalidQuoteType
        );
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
        ..
    } = ctx.accounts;

    let required_collateral = calculate_required_collateral_for_response(
        &maker.key(),
        &rfq.to_account_info(),
        risk_engine,
        bid,
        ask,
    )?;
    collateral_info.lock_collateral(collateral_token, required_collateral)?;

    response.set_inner(Response {
        maker: maker.key(),
        rfq: rfq.key(),
        creation_timestamp: Clock::get()?.unix_timestamp,
        maker_collateral_locked: required_collateral,
        taker_collateral_locked: 0,
        state: StoredResponseState::Active,
        first_to_prepare: None,
        confirmed: None,
        bid,
        ask,
    });

    rfq.total_responses += 1;

    Ok(())
}
