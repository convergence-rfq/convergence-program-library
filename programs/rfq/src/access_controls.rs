//! Access Controls
use anchor_lang::prelude::*;

use crate::contexts::*;
use crate::errors::*;
use crate::states::*;

/// Initialzie access control.
///
/// Ensures:
/// - Signer is Convergence DAO
/// - Fee denominator is greater than 0
pub fn initialize_access_control<'info>(
    _ctx: &Context<Initialize<'info>>,
    fee_denominator: u64,
) -> Result<()> {
    #[cfg(feature = "mainnet")]
    let signer = _ctx.accounts.signer.key();
    #[cfg(feature = "mainnet")]
    let dao: Pubkey = "9sZmY1J1L31d6Pw2yUF3p99sob7dbSJDNpYCxUGx3AsU"
        .parse()
        .unwrap();
    #[cfg(feature = "devnet")]
    require!(signer == dao, ProtocolError::InvalidAuthority);

    require!(fee_denominator > 0, ProtocolError::InvalidFee);

    Ok(())
}

/// Set fee access control.
///
/// Ensures:
/// - Signer is Convergence DAO
/// - Fee denominator is greater than 0
pub fn set_fee_access_control<'info>(
    _ctx: &Context<SetFee<'info>>,
    fee_denominator: u64,
) -> Result<()> {
    #[cfg(feature = "mainnet")]
    let signer = _ctx.accounts.signer.key();
    #[cfg(feature = "mainnet")]
    let dao: Pubkey = "9sZmY1J1L31d6Pw2yUF3p99sob7dbSJDNpYCxUGx3AsU"
        .parse()
        .unwrap();
    #[cfg(feature = "devnet")]
    require!(signer == dao, ProtocolError::InvalidAuthority);

    require!(fee_denominator > 0, ProtocolError::InvalidFee);

    Ok(())
}

/// Request access control.
///
/// Ensures:
/// - Order amount is greater than 0
/// - Expiry is greater than now
pub fn request_access_control<'info>(
    _ctx: &Context<Request<'info>>,
    expiry: i64,
    order_amount: u64,
) -> Result<()> {
    require!(order_amount > 0, ProtocolError::InvalidRequest);
    require!(
        Clock::get().unwrap().unix_timestamp < expiry,
        ProtocolError::InvalidRequest
    );

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

    if rfq.confirmed {
        return Err(error!(ProtocolError::RfqConfirmed));
    }

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

    require!(rfq.key() == order.rfq.key(), ProtocolError::LastLookNotSet);
    require!(authority == signer, ProtocolError::InvalidAuthority);
    require!(rfq.last_look, ProtocolError::LastLookNotSet);

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
    require!(!rfq.confirmed, ProtocolError::RfqConfirmed);
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
            require!(!order.ask_confirmed, ProtocolError::OrderConfirmed);
            require!(
                rfq.best_ask_amount.unwrap() == order.ask.unwrap(),
                ProtocolError::InvalidConfirm
            );
        }
        Quote::Bid => {
            require!(!order.bid_confirmed, ProtocolError::OrderConfirmed);
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

    if !(rfq.confirmed || Clock::get().unwrap().unix_timestamp > rfq.expiry) {
        if !rfq.confirmed {
            return Err(error!(ProtocolError::RfqUnconfirmed));
        }
        if Clock::get().unwrap().unix_timestamp < rfq.expiry {
            return Err(error!(ProtocolError::RfqActive));
        }
    }

    require!(
        !order.collateral_returned,
        ProtocolError::CollateralReturned
    );

    match rfq.order_type {
        Order::Buy => require!(!order.ask_confirmed, ProtocolError::OrderConfirmed),
        Order::Sell => require!(!order.bid_confirmed, ProtocolError::OrderConfirmed),
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

    if rfq.last_look {
        match rfq.approved {
            Some(approved) => require!(approved, ProtocolError::OrderNotApproved),
            None => require!(false, ProtocolError::OrderNotApproved),
        }
    }

    require!(rfq.confirmed, ProtocolError::RfqUnconfirmed);
    require!(!rfq.canceled, ProtocolError::RfqCanceled);
    if rfq.id == 4 as u64 {
        msg!("{}", rfq.confirmed);
        msg!("{}", rfq.canceled);
        assert!(false);
    }

    match order.confirmed_quote {
        Some(Quote::Ask) => require!(order.ask_confirmed, ProtocolError::OrderConfirmed),
        Some(Quote::Bid) => require!(order.bid_confirmed, ProtocolError::OrderConfirmed),
        None => return Err(error!(ProtocolError::InvalidConfirm)),
    }

    Ok(())
}
