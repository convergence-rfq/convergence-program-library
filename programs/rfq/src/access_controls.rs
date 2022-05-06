//! Access Controls
use anchor_lang::prelude::*;

use crate::contexts::*;
use crate::errors::*;
use crate::states::*;

/// Last look access control. Ensures last look:
///
/// 1. Last looks is configured for RFQ
/// 2. Order belongs to authority approving via last look
pub fn last_look_access_control<'info>(ctx: &Context<LastLook<'info>>) -> Result<()> {
    let rfq = &ctx.accounts.rfq;
    let signer = ctx.accounts.signer.key();

    let authority = ctx.accounts.order.authority.key();

    require!(rfq.last_look, ProtocolError::LastLookNotSet);
    require!(authority == signer, ProtocolError::InvalidAuthority);

    Ok(())
}

/// Confirmation access control. Ensures confirmation is:
///
/// 1. RFQ is unconfirmed
/// 2. Confirmed by taker
/// 3. Is not already confirmed
/// 4. RFQ best bid/ask is same as order bid/ask
pub fn confirm_access_control<'info>(
    ctx: &Context<Confirm<'info>>,
    order_side: Side,
) -> Result<()> {
    let order = &ctx.accounts.order;
    let rfq = &ctx.accounts.rfq;

    let taker = rfq.authority.key();
    let signer = ctx.accounts.signer.key();

    require!(taker == signer, ProtocolError::InvalidTaker);
    require!(!order.confirmed, ProtocolError::OrderConfirmed);
    require!(!rfq.confirmed, ProtocolError::RfqConfirmed);

    // TODO: Confirm order belongs to RFQ

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
        Order::TwoWay => {
            require!(
                rfq.best_ask_amount.unwrap() == order.ask.unwrap()
                    || rfq.best_bid_amount.unwrap() == order.bid.unwrap(),
                ProtocolError::InvalidConfirm
            )
        }
    }

    Ok(())
}

/// Response access control. Ensures response satisfies the following conditions:
///
/// 1. RFQ authority is not the same as maker authority
/// 2. RFQ is not expired
/// 3. Response bid/ask match request order side
/// 4. Response bid/ask amount is greater than 0
/// 5. RFQ is not confirmed
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
        ProtocolError::Expired
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

/// Return collateral access control. Ensures returning collateral for RFQ that is:
///
/// 1. Collateral has not already by returned
/// 2. Order is not confirmed
/// 3. If RFQ is not confirmed either expired or order has been confirmed
/// 4. Signer is order authority
pub fn return_collateral_access_control<'info>(ctx: &Context<ReturnCollateral>) -> Result<()> {
    let rfq = &ctx.accounts.rfq;
    let order = &ctx.accounts.order;

    let signer = ctx.accounts.signer.key();
    let authority = order.authority.key();

    require!(
        !order.collateral_returned,
        ProtocolError::CollateralReturned
    );

    require!(!order.confirmed, ProtocolError::OrderConfirmed);

    if !rfq.confirmed {
        require!(
            Clock::get().unwrap().unix_timestamp > rfq.expiry,
            ProtocolError::ActiveOrUnconfirmed
        );
    }

    require!(authority == signer, ProtocolError::InvalidAuthority);

    Ok(())
}

/// Settlement access control. Ensures RFQ is:
///
/// 1. RFQ has not yet been settled if taker
/// 2. Order has not yet been settled if maker
/// 3. If last look is required then RFQ is approved
/// 4. Order belongs to correct RFQ
pub fn settle_access_control<'info>(ctx: &Context<Settle<'info>>) -> Result<()> {
    let rfq = &ctx.accounts.rfq;
    let order = &ctx.accounts.order;

    let authority = ctx.accounts.signer.key();
    let taker = rfq.authority.key();
    let maker = order.authority.key();

    if authority == taker {
        require!(!rfq.settled, ProtocolError::RfqSettled);
    }
    if authority == maker {
        require!(!order.settled, ProtocolError::OrderSettled);
    }

    if rfq.last_look {
        require!(rfq.approved, ProtocolError::OrderNotApproved);
    }

    require!(rfq.confirmed, ProtocolError::InvalidConfirm);
    require!(rfq.key() == order.rfq.key(), ProtocolError::InvalidRfq);

    Ok(())
}
