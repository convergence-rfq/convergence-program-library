use std::mem;

use crate::{
    errors::ProtocolError,
    interfaces::{
        print_trade_provider::validate_response,
        risk_engine::calculate_required_collateral_for_response,
    },
    seeds::{COLLATERAL_SEED, COLLATERAL_TOKEN_SEED, PROTOCOL_SEED, RESPONSE_SEED},
    state::{
        whitelist::Whitelist, CollateralInfo, FixedSize, OrderType, ProtocolState, Quote, Response,
        Rfq, RfqState, StoredResponseState,
    },
};
use anchor_lang::prelude::*;
use anchor_spl::token::TokenAccount;

#[derive(Accounts)]
#[instruction(bid: Option<Quote>, ask: Option<Quote>, pda_distinguisher: u16)]
pub struct RespondToRfqAccounts<'info> {
    #[account(mut)]
    pub maker: Signer<'info>,

    #[account(seeds = [PROTOCOL_SEED.as_bytes()], bump = protocol.bump)]
    pub protocol: Box<Account<'info, ProtocolState>>,
    #[account(mut)]
    pub rfq: Box<Account<'info, Rfq>>,
    // rfq legs additional storage for first_to_prepare_legs field
    #[account(
        init,
        payer = maker,
        space = 8 + mem::size_of::<Response>() + rfq.legs.len(),
        seeds = [
            RESPONSE_SEED.as_bytes(),
            rfq.key().as_ref(),
            maker.key().as_ref(),
            &bid.try_to_vec().unwrap(),
            &ask.try_to_vec().unwrap(),
            &pda_distinguisher.to_le_bytes(),
        ],
        bump
    )]
    pub response: Box<Account<'info, Response>>,
    #[account(mut, seeds = [COLLATERAL_SEED.as_bytes(), maker.key().as_ref()],
                bump = collateral_info.bump)]
    pub collateral_info: Account<'info, CollateralInfo>,
    #[account(
        seeds = [COLLATERAL_TOKEN_SEED.as_bytes(), maker.key().as_ref()],
        bump = collateral_info.token_account_bump
    )]
    pub collateral_token: Account<'info, TokenAccount>,

    /// CHECK: is a valid risk engine program id
    #[account(constraint = risk_engine.key() == protocol.risk_engine
        @ ProtocolError::NotARiskEngine)]
    pub risk_engine: UncheckedAccount<'info>,
    pub whitelist: Option<Box<Account<'info, Whitelist>>>,

    pub system_program: Program<'info, System>,
}

fn validate(
    ctx: &Context<RespondToRfqAccounts>,
    bid: Option<Quote>,
    ask: Option<Quote>,
    expiration_timestamp: i64,
    additional_data: &[u8],
) -> Result<()> {
    let RespondToRfqAccounts {
        maker,
        rfq,
        whitelist,
        ..
    } = &ctx.accounts;
    //checks for expiration timestamp
    let current_timestamp = Clock::get()?.unix_timestamp;
    let rfq_expiration_timestamp = rfq.creation_timestamp + (rfq.active_window as i64);

    require!(
        expiration_timestamp > current_timestamp,
        ProtocolError::InvalidExpirationTimestamp
    );

    require!(
        expiration_timestamp <= rfq_expiration_timestamp,
        ProtocolError::InvalidExpirationTimestamp
    );

    Whitelist::validate(whitelist, rfq)?;

    match whitelist {
        Some(whitelist) => {
            require!(
                whitelist.is_whitelisted(maker.key),
                ProtocolError::MakerAddressNotWhitelisted
            );
        }
        None => {}
    }

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
    }

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

    // check that in case the rfq is fixed in quote asset amount, prices provided are positive
    if let FixedSize::QuoteAsset { quote_amount: _ } = rfq.fixed_size {
        if let Some(quote) = bid {
            require!(
                quote.get_price_bps() > 0,
                ProtocolError::PriceShouldBePositive
            );
        }
        if let Some(quote) = ask {
            require!(
                quote.get_price_bps() > 0,
                ProtocolError::PriceShouldBePositive
            );
        }
    }

    if !rfq.is_settled_as_print_trade() {
        require!(
            additional_data.is_empty(),
            ProtocolError::AdditionalDataIsNotSupported
        );
    }

    Ok(())
}

pub fn respond_to_rfq_instruction<'info>(
    ctx: Context<'_, '_, '_, 'info, RespondToRfqAccounts<'info>>,
    bid: Option<Quote>,
    ask: Option<Quote>,
    _pda_distinguisher: u16,
    expiration_timestamp: i64,
    additional_data: Vec<u8>,
) -> Result<()> {
    validate(&ctx, bid, ask, expiration_timestamp, &additional_data)?;

    let RespondToRfqAccounts {
        maker,
        protocol,
        rfq,
        response,
        collateral_info,
        collateral_token,
        risk_engine,
        ..
    } = ctx.accounts;

    response.set_inner(Response {
        maker: maker.key(),
        rfq: rfq.key(),
        creation_timestamp: Clock::get()?.unix_timestamp,
        maker_collateral_locked: 0,
        taker_collateral_locked: 0,
        state: StoredResponseState::Active,
        taker_prepared_counter: 0,
        maker_prepared_counter: 0,
        settled_escrow_legs: 0,
        reserved: [0; 256],
        confirmed: None,
        defaulting_party: None,
        print_trade_initialized_by: None,
        escrow_leg_preparations_initialized_by: vec![],
        bid,
        ask,
        expiration_timestamp,
        additional_data,
    });
    response.exit(ctx.program_id)?;

    let mut remaining_accounts = ctx.remaining_accounts.iter();

    if rfq.is_settled_as_print_trade() {
        validate_response(rfq, response, protocol, &mut remaining_accounts)?;
    }

    let required_collateral = calculate_required_collateral_for_response(
        rfq.to_account_info(),
        response.to_account_info(),
        risk_engine,
        &mut remaining_accounts,
    )?;
    collateral_info.lock_collateral(collateral_token, required_collateral)?;
    response.maker_collateral_locked = required_collateral;

    rfq.total_responses += 1;

    Ok(())
}
