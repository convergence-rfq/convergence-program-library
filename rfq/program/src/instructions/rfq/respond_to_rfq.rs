use std::mem;

use crate::{
    errors::ProtocolError,
    seeds::RESPONSE_SEED,
    state::{OrderType, Quote, Response, Rfq, RfqState, StoredResponseState},
};
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(bid: Option<Quote>, ask: Option<Quote>, pda_distinguisher: u16)]
pub struct RespondToRfqAccounts<'info> {
    #[account(mut)]
    pub maker: Signer<'info>,

    #[account(mut)]
    pub rfq: Box<Account<'info, Rfq>>,
    // rfq legs additional storage for first_to_prepare_legs field
    #[account(init, payer = maker, space = 8 + mem::size_of::<Response>(), seeds = [
        RESPONSE_SEED.as_bytes(),
        rfq.key().as_ref(),
        maker.key().as_ref(),
        &bid.try_to_vec().unwrap(),
        &ask.try_to_vec().unwrap(),
        &pda_distinguisher.to_le_bytes(),
    ], bump)]
    pub response: Account<'info, Response>,

    pub system_program: Program<'info, System>,
}

fn validate(
    ctx: &Context<RespondToRfqAccounts>,
    bid: Option<Quote>,
    ask: Option<Quote>,
) -> Result<()> {
    let RespondToRfqAccounts { maker, rfq, .. } = &ctx.accounts;

    require!(maker.key() != rfq.taker, ProtocolError::TakerCanNotRespond);

    rfq.get_state()?.assert_state_in([RfqState::Active])?;

    match rfq.order_type {
        OrderType::Buy => require!(
            bid.is_none() && ask.is_some(),
            ProtocolError::ResponseDoesNotMatchOrderType
        ),
        OrderType::Sell => require!(
            bid.is_some() && ask.is_none(),
            ProtocolError::ResponseDoesNotMatchOrderType
        ),
        OrderType::TwoWay => require!(
            bid.is_some() || ask.is_some(),
            ProtocolError::ResponseDoesNotMatchOrderType
        ),
    };

    if let Some(quote) = bid {
        let is_quote_fixed_size = matches!(quote, Quote::FixedSize { price_quote: _ });
        require!(
            rfq.is_fixed_size() == is_quote_fixed_size,
            ProtocolError::InvalidQuoteType
        );
    }
    if let Some(quote) = ask {
        let is_quote_fixed_size = matches!(quote, Quote::FixedSize { price_quote: _ });
        require!(
            rfq.is_fixed_size() == is_quote_fixed_size,
            ProtocolError::InvalidQuoteType
        );
    }

    Ok(())
}

pub fn respond_to_rfq_instruction<'info>(
    ctx: Context<'_, '_, '_, 'info, RespondToRfqAccounts<'info>>,
    bid: Option<Quote>,
    ask: Option<Quote>,
    _pda_distinguisher: u16,
) -> Result<()> {
    validate(&ctx, bid, ask)?;

    let RespondToRfqAccounts {
        maker,
        rfq,
        response,
        ..
    } = ctx.accounts;

    response.set_inner(Response {
        maker: maker.key(),
        rfq: rfq.key(),
        creation_timestamp: Clock::get()?.unix_timestamp,
        state: StoredResponseState::Active,
        confirmed: None,
        bid,
        ask,
    });

    rfq.total_responses += 1;

    Ok(())
}
