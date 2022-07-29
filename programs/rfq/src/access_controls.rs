//! Access Controls
use anchor_lang::prelude::*;

use crate::contexts::*;
use crate::errors::*;
use crate::states::*;

/// Initialzie access control.
///
/// Ensures:
/// - Fee denominator is greater than 0
pub fn initialize_access_control<'info>(
    _ctx: &Context<Initialize<'info>>,
    fee_denominator: u64,
) -> Result<()> {
    require!(fee_denominator > 0, ProtocolError::InvalidFee);

    Ok(())
}

/// Set fee access control.
///
/// Ensures:
/// - Signer is DAO
/// - Fee denominator is greater than 0
pub fn set_fee_access_control<'info>(
    ctx: &Context<SetFee<'info>>,
    fee_denominator: u64,
) -> Result<()> {
    let signer = ctx.accounts.signer.key();
    let authority = ctx.accounts.protocol.authority.key();

    require!(signer == authority, ProtocolError::InvalidAuthority);
    require!(fee_denominator > 0, ProtocolError::InvalidFee);

    Ok(())
}

/// Request access control.
///
/// Ensures:
/// - Order amount is greater than 0
/// - Expiry is greater than now
/// - Legs are valid
pub fn request_access_control<'info>(
    _ctx: &Context<Request<'info>>,
    expiry: i64,
    legs: &Vec<Leg>,
    order_amount: u64,
) -> Result<()> {
    require!(order_amount > 0, ProtocolError::InvalidRequest);
    require!(
        Clock::get().unwrap().unix_timestamp < expiry,
        ProtocolError::InvalidRequest
    );

    // Check instrument type
    for leg in legs.iter() {
        match leg.instrument {
            Instrument::Option => continue,
            Instrument::Spot => continue,
            _ => return Err(error!(ProtocolError::NotImplemented)),
        }
    }

    Ok(())
}

/// Cancel access control.
///
/// Ensures:
/// - RFQ belongs to signer
/// - RFQ not canceled
/// - RFQ not expired
/// - RFQ has no responses
pub fn cancel_access_control<'info>(ctx: &Context<Cancel<'info>>) -> Result<()> {
    let signer = ctx.accounts.signer.key();
    let rfq = &ctx.accounts.rfq;

    let authority = rfq.authority.key();

    require!(authority == signer, ProtocolError::InvalidAuthority);
    require!(!rfq.canceled, ProtocolError::InvalidCancel);
    require!(
        Clock::get().unwrap().unix_timestamp < rfq.expiry,
        ProtocolError::RfqInactive
    );

    Ok(())
}

/// Response access control.
///
/// Ensures:
/// - Signer is not RFQ authority
/// - RFQ is not iactive
/// - RFQ is not confirmed
/// - RFQ is not canceled
/// - Response quote matches RFQ order type
/// - Response bid/ask amount is greater than 0
pub fn respond_access_control<'info>(
    ctx: &Context<Respond<'info>>,
    bid: Option<u64>,
    ask: Option<u64>,
) -> Result<()> {
    let rfq = &ctx.accounts.rfq;

    let signer = &ctx.accounts.signer.key();
    let authority = &rfq.authority.key();

    require!(authority != signer, ProtocolError::InvalidAuthority);
    if rfq.expiry < Clock::get().unwrap().unix_timestamp {
        return Err(error!(ProtocolError::RfqInactive));
    }

    require!(rfq.confirmed_order.is_none(), ProtocolError::RfqConfirmed);

    if rfq.canceled {
        return Err(error!(ProtocolError::RfqCanceled));
    }

    match rfq.order_type {
        Order::Buy => {
            require!(ask.is_some() && bid.is_none(), ProtocolError::InvalidQuote);
            require!(ask.unwrap() > 0, ProtocolError::InvalidQuote);
        }
        Order::Sell => {
            require!(bid.is_some() && ask.is_none(), ProtocolError::InvalidQuote);
            require!(bid.unwrap() > 0, ProtocolError::InvalidQuote);
        }
        Order::TwoWay => {
            require!(bid.is_some() && ask.is_some(), ProtocolError::InvalidQuote);
            require!(
                ask.unwrap() > 0 && bid.unwrap() > 0,
                ProtocolError::InvalidQuote
            );
        }
    }

    Ok(())
}

/// Last look access control.
///
/// Ensures:
/// - Order belongs to RFQ
/// - Signer is authority
/// - Last looks is set for RFQ
pub fn last_look_access_control<'info>(ctx: &Context<LastLook<'info>>) -> Result<()> {
    let rfq = &ctx.accounts.rfq;
    let order = &ctx.accounts.order;

    let signer = ctx.accounts.signer.key();
    let authority = ctx.accounts.order.authority.key();

    require!(rfq.key() == order.rfq.key(), ProtocolError::InvalidRfq);
    require!(authority == signer, ProtocolError::InvalidAuthority);
    require!(
        rfq.last_look_approved.is_some(),
        ProtocolError::LastLookNotSet
    );
    require!(
        rfq.last_look_approved.unwrap() == false,
        ProtocolError::LastLookAlreadyDone
    );
    require!(
        rfq.confirmed_order
            .map_or(false, |x| x.order == order.key()),
        ProtocolError::OrderNotConfirmed
    );

    Ok(())
}

/// Confirmation access control.
///
/// Ensures:
/// - Order belongs to RFQ
/// - Signer is taker
/// - RFQ is not confirmed
/// - Order type matches quote
/// - RFQ best bid/ask is unconfirmed
/// - RFQ best bid/ask is same as quote
pub fn confirm_access_control<'info>(ctx: &Context<Confirm<'info>>, quote: Quote) -> Result<()> {
    let order = &ctx.accounts.order;
    let rfq = &ctx.accounts.rfq;

    let taker = rfq.authority.key();
    let signer = ctx.accounts.signer.key();

    require!(rfq.key() == order.rfq.key(), ProtocolError::InvalidRfq);
    require!(taker == signer, ProtocolError::InvalidTaker);
    require!(rfq.confirmed_order.is_none(), ProtocolError::RfqConfirmed);
    require!(
        rfq.expiry > Clock::get().unwrap().unix_timestamp,
        ProtocolError::RfqInactive
    );

    match rfq.order_type {
        Order::Buy => require!(quote == Quote::Ask, ProtocolError::InvalidConfirm),
        Order::Sell => require!(quote == Quote::Bid, ProtocolError::InvalidConfirm),
        _ => (),
    }

    match quote {
        Quote::Ask => {
            require!(
                rfq.best_ask_amount.unwrap() == order.ask.unwrap(),
                ProtocolError::InvalidConfirm
            );
        }
        Quote::Bid => {
            require!(
                rfq.best_bid_amount.unwrap() == order.bid.unwrap(),
                ProtocolError::InvalidConfirm
            )
        }
    }

    Ok(())
}

/// Return collateral access control.
///
/// Ensures:
/// - Order belongs to correct RFQ
/// - Order authority is signer
/// - RFQ is confirmed or expired
/// - Collateral has not been returned
/// - Order ask/bid is not confirmed
pub fn return_collateral_access_control<'info>(ctx: &Context<ReturnCollateral>) -> Result<()> {
    let rfq = &ctx.accounts.rfq;
    let order = &ctx.accounts.order;

    let signer = ctx.accounts.signer.key();
    let authority = order.authority.key();

    require!(rfq.key() == order.rfq.key(), ProtocolError::InvalidRfq);
    require!(authority == signer, ProtocolError::InvalidAuthority);

    let is_rfq_expired = Clock::get().unwrap().unix_timestamp > rfq.expiry;
    require!(
        rfq.confirmed_order.is_some() || rfq.canceled || is_rfq_expired,
        ProtocolError::RfqActive
    );

    require!(
        !order.collateral_returned,
        ProtocolError::CollateralReturned
    );

    let is_this_order_confirmed = rfq
        .confirmed_order
        .map_or(false, |x| x.order == order.key());
    match rfq.order_type {
        Order::Buy | Order::Sell => {
            require!(
                !is_this_order_confirmed,
                ProtocolError::NoCollateralToReturn
            )
        }
        _ => (),
    }

    Ok(())
}

/// Settlement access control.
///
/// Ensures:
/// - Order belongs to correct RFQ
/// - If signer is taker RFQ is not settled
/// - If signer is maker order is not settled
/// - Signer is taker or maker
/// - RFQ is approvied if last look is set
/// - RFQ has been confirmed
/// - Order has been confirmed
pub fn settle_access_control<'info>(ctx: &Context<Settle<'info>>) -> Result<()> {
    let rfq = &ctx.accounts.rfq;
    let order = &ctx.accounts.order;

    let signer = ctx.accounts.signer.key();
    let taker = rfq.authority.key();
    let maker = order.authority.key();

    require!(rfq.key() == order.rfq.key(), ProtocolError::InvalidRfq);

    if signer == maker {
        require!(!order.settled, ProtocolError::OrderSettled);
    }

    if signer == taker {
        require!(!rfq.settled, ProtocolError::RfqSettled);
    }

    require!(
        signer == taker || signer == maker,
        ProtocolError::InvalidAuthority
    );

    require!(
        rfq.last_look_approved.unwrap_or(true) == true,
        ProtocolError::OrderNotApproved
    );

    require!(
        rfq.confirmed_order
            .map_or(false, |x| x.order == order.key()),
        ProtocolError::RfqUnconfirmed
    );
    require!(!rfq.canceled, ProtocolError::RfqCanceled);

    Ok(())
}
