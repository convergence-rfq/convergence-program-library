//! Access Controls
use anchor_lang::prelude::*;

use crate::contexts::*;
use crate::errors::*;
use crate::states::*;

/// Request access control.
pub fn request_access_control<'info>(_ctx: &Context<Request<'info>>) -> Result<()> {
    Ok(())
}

/// Response access control.
///
/// Ensures:
/// - RFQ authority is not the same as maker authority
/// - RFQ is active
/// - RFQ is unconfirmed
/// - Response order type matches RFQ order side
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
    require!(
        rfq.expiry > Clock::get().unwrap().unix_timestamp,
        ProtocolError::RfqInactive
    );
    require!(!rfq.confirmed, ProtocolError::RfqConfirmed);

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
/// - Last looks is configured for RFQ
/// - Order belongs to authority approving via last look
pub fn last_look_access_control<'info>(ctx: &Context<LastLook<'info>>) -> Result<()> {
    let rfq = &ctx.accounts.rfq;
    let signer = ctx.accounts.signer.key();

    let authority = ctx.accounts.order.authority.key();

    require!(rfq.last_look, ProtocolError::LastLookNotSet);
    require!(authority == signer, ProtocolError::InvalidAuthority);

    Ok(())
}

/// Confirmation access control.
///
/// Ensures:
/// - RFQ is unconfirmed
/// - Confirmed by taker
/// - Is not already confirmed
/// - Response belonds to correct RFQ
/// - RFQ best bid/ask is same as order bid/ask
pub fn confirm_access_control<'info>(
    ctx: &Context<Confirm<'info>>,
    order_side: Side,
) -> Result<()> {
    let order = &ctx.accounts.order;
    let rfq = &ctx.accounts.rfq;

    let taker = rfq.authority.key();
    let signer = ctx.accounts.signer.key();

    require!(rfq.key() == order.rfq.key(), ProtocolError::InvalidRfq);

    require!(taker == signer, ProtocolError::InvalidTaker);
    require!(!order.confirmed, ProtocolError::OrderConfirmed);
    require!(!rfq.confirmed, ProtocolError::RfqConfirmed);

    match rfq.order_type {
        Order::Buy => {
            require!(order_side == Side::Buy, ProtocolError::InvalidConfirm);
            require!(
                rfq.best_ask_amount.unwrap() == order.ask.unwrap(),
                ProtocolError::InvalidConfirm
            );
        }
        Order::Sell => {
            require!(order_side == Side::Sell, ProtocolError::InvalidConfirm);
            require!(
                rfq.best_bid_amount.unwrap() == order.bid.unwrap(),
                ProtocolError::InvalidConfirm
            )
        }
        Order::TwoWay => match order_side {
            Side::Buy => {
                require!(
                    rfq.best_ask_amount.unwrap() == order.ask.unwrap(),
                    ProtocolError::InvalidConfirm
                );
            }
            Side::Sell => {
                require!(
                    rfq.best_bid_amount.unwrap() == order.bid.unwrap(),
                    ProtocolError::InvalidConfirm
                )
            }
        },
    }

    Ok(())
}

/// Return collateral access control.
///
/// Ensures:
/// - Order belongs to correct RFQ
/// - Order authority is signer
/// - Collateral has not been returned
/// - Order is not confirmed
/// - RFQ is confirmed or expired
pub fn return_collateral_access_control<'info>(ctx: &Context<ReturnCollateral>) -> Result<()> {
    let rfq = &ctx.accounts.rfq;
    let order = &ctx.accounts.order;

    let signer = ctx.accounts.signer.key();
    let authority = order.authority.key();

    require!(rfq.key() == order.rfq.key(), ProtocolError::InvalidRfq);
    require!(authority == signer, ProtocolError::InvalidAuthority);
    require!(
        !order.collateral_returned,
        ProtocolError::CollateralReturned
    );
    require!(!order.confirmed, ProtocolError::OrderConfirmed);
    require!(
        rfq.confirmed || Clock::get().unwrap().unix_timestamp > rfq.expiry,
        ProtocolError::RfqActiveOrUnconfirmed
    );

    Ok(())
}

/// Settlement access control.
///
/// Ensures:
/// - Order belongs to correct RFQ
/// - RFQ belongs to signer if taker
/// - RFQ has not been settled if taker
/// - Order belongs to signer if maker
/// - Order has not been settled if maker
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

    if signer == taker {
        require!(rfq.authority == signer, ProtocolError::InvalidAuthority);
        require!(!rfq.settled, ProtocolError::RfqSettled);
    }

    if signer == maker {
        require!(order.authority == signer, ProtocolError::InvalidAuthority);
        require!(!order.settled, ProtocolError::OrderSettled);
    }

    if rfq.last_look {
        require!(rfq.approved, ProtocolError::OrderNotApproved);
    }

    require!(rfq.confirmed, ProtocolError::InvalidConfirm);
    require!(order.confirmed, ProtocolError::InvalidConfirm);

    Ok(())
}
