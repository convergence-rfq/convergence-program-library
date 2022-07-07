//! Private module for program instructions.
use anchor_lang::prelude::*;
use num_traits::ToPrimitive;
use solana_program::sysvar::clock::Clock;

use crate::access_controls::*;
use crate::constants::*;
use crate::contexts::*;
use crate::errors::*;
use crate::states::*;

/// Initializes.
///
/// Step 1: DAO initializes protocol.
///
/// ctx Accounts context
/// fee_denominator Fee denominator
/// fee_numerator Fee numerator
#[access_control(initialize_access_control(&ctx, fee_denominator))]
pub fn initialize(
    ctx: Context<Initialize>,
    fee_denominator: u64,
    fee_numerator: u64,
) -> Result<()> {
    let protocol = &mut ctx.accounts.protocol;
    protocol.authority = ctx.accounts.signer.key();
    protocol.bump = *ctx.bumps.get(PROTOCOL_SEED).unwrap();
    protocol.fee_denominator = fee_denominator;
    protocol.fee_numerator = fee_numerator;

    Ok(())
}

/// Sets fee.
///
/// Optional: DAO sets fee.
///
/// ctx Accounts context
/// fee_denominator Fee denominator
/// fee_numerator Fee numerator
#[access_control(set_fee_access_control(&ctx, fee_denominator))]
pub fn set_fee(ctx: Context<SetFee>, fee_denominator: u64, fee_numerator: u64) -> Result<()> {
    let protocol = &mut ctx.accounts.protocol;
    protocol.fee_denominator = fee_denominator;
    protocol.fee_numerator = fee_numerator;

    Ok(())
}

/// Initialize leg.
///
/// ctx Accounts context
/// expiry Expiry
/// venue Venue
#[access_control(initialize_leg_access_control(&ctx, leg, rfq))]
pub fn initialize_leg(
    ctx: Context<InitializeLeg>,
    leg: Leg,
    rfq: Pubkey,
) -> Result<()> {
    //let leg = &mut ctx.accounts.leg;
    //leg.instrument = instrument;
    //leg.rfq = rfq;
    //leg.processed = false;

    Ok(())
}

/// Requests quote (RFQ).
///
/// Step 2: Taker request quote.
///
/// ctx Accounts context
/// expiry
/// last_look
/// legs
/// expiry
/// order_amount
/// order_type
#[access_control(request_access_control(&ctx, expiry, order_amount))]
pub fn request(
    ctx: Context<Request>,
    access_manager: Option<Pubkey>,
    expiry: i64,
    last_look: bool,
    order_amount: u64,
    order_type: Order,
) -> Result<()> {
    let rfq = &mut ctx.accounts.rfq;
    rfq.access_manager = access_manager;
    rfq.asset_escrow_bump = *ctx.bumps.get(ASSET_ESCROW_SEED).unwrap();
    rfq.authority = ctx.accounts.signer.key();
    rfq.canceled = false;
    rfq.best_ask_address = None;
    rfq.best_ask_amount = None;
    rfq.best_bid_address = None;
    rfq.best_bid_amount = None;
    rfq.bump = *ctx.bumps.get(RFQ_SEED).unwrap();
    rfq.expiry = expiry;
    rfq.last_look = last_look;
    // TODO: Finish via remaining accounts
    //rfq.legs = [];
    rfq.order_amount = order_amount;
    rfq.quote_escrow_bump = *ctx.bumps.get(QUOTE_ESCROW_SEED).unwrap();
    rfq.order_type = order_type;
    rfq.settled = false;
    rfq.unix_timestamp = Clock::get().unwrap().unix_timestamp;

    if rfq.last_look {
        rfq.approved = Some(false);
    }

    Ok(())
}

/// Cancels.
///
/// Optional: Taker cancels RFQ.
///
/// ctx Accounts context
#[access_control(cancel_access_control(&ctx))]
pub fn cancel(ctx: Context<Cancel>) -> Result<()> {
    let rfq = &mut ctx.accounts.rfq;
    rfq.canceled = true;

    Ok(())
}

/// Responds to RFQ.
///
/// Step 3: Maker responds with one or two-way quote.
///
/// ctx Accounts context
/// bid
/// ask
#[access_control(respond_access_control(&ctx, bid, ask))]
pub fn respond(ctx: Context<Respond>, bid: Option<u64>, ask: Option<u64>) -> Result<()> {
    let rfq = &mut ctx.accounts.rfq;

    let order = &mut ctx.accounts.order;
    order.ask_confirmed = false;
    order.authority = ctx.accounts.signer.key();
    order.bid_confirmed = false;
    order.bump = *ctx.bumps.get(ORDER_SEED).unwrap();
    order.rfq = rfq.key();
    order.unix_timestamp = Clock::get().unwrap().unix_timestamp;

    if ask.is_some() {
        anchor_spl::token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::Transfer {
                    from: ctx.accounts.asset_wallet.to_account_info(),
                    to: ctx.accounts.asset_escrow.to_account_info(),
                    authority: ctx.accounts.signer.to_account_info(),
                },
            ),
            // Asset
            rfq.order_amount,
        )?;

        order.ask = ask;

        if rfq.best_ask_amount.is_none() || ask.unwrap() < rfq.best_ask_amount.unwrap() {
            rfq.best_ask_amount = ask;
            rfq.best_ask_address = Some(order.authority);
        }
    }

    if bid.is_some() {
        anchor_spl::token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::Transfer {
                    from: ctx.accounts.quote_wallet.to_account_info(),
                    to: ctx.accounts.quote_escrow.to_account_info(),
                    authority: ctx.accounts.signer.to_account_info(),
                },
            ),
            // Quote
            bid.unwrap(),
        )?;

        order.bid = bid;

        if rfq.best_bid_amount.is_none() || bid.unwrap() > rfq.best_bid_amount.unwrap() {
            rfq.best_bid_amount = bid;
            rfq.best_bid_address = Some(order.authority);
        }
    }

    Ok(())
}

/// Quote last look.
///
/// Optional: Maker confirmes if last look is set.
///
/// ctx Accounts context
#[access_control(last_look_access_control(&ctx))]
pub fn last_look(ctx: Context<LastLook>) -> Result<()> {
    let rfq = &mut ctx.accounts.rfq;
    rfq.approved = Some(true);

    Ok(())
}

/// Confirms quote.
///
/// Step 4: Taker confirms maker order.
///
/// ctx Accounts context
/// quote
#[access_control(confirm_access_control(&ctx, quote))]
pub fn confirm(ctx: Context<Confirm>, quote: Quote) -> Result<()> {
    let order = &mut ctx.accounts.order;
    order.confirmed_quote = Some(quote);

    let rfq = &mut ctx.accounts.rfq;

    let order_amount;
    let from;
    let to;

    match quote {
        Quote::Ask => {
            order.ask_confirmed = true;
            from = ctx.accounts.quote_wallet.to_account_info();
            to = ctx.accounts.quote_escrow.to_account_info();
            order_amount = rfq.best_ask_amount.unwrap();
        }
        Quote::Bid => {
            order.bid_confirmed = true;
            from = ctx.accounts.asset_wallet.to_account_info();
            to = ctx.accounts.asset_escrow.to_account_info();
            order_amount = rfq.order_amount;
        }
    };

    anchor_spl::token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            anchor_spl::token::Transfer {
                from,
                to,
                authority: ctx.accounts.signer.to_account_info(),
            },
        ),
        order_amount,
    )?;

    rfq.confirmed = true;

    Ok(())
}

/// Return quote.
///
/// Step 5: If order is unconfirmed, return maker collateral.
///
/// ctx Accounts context
#[access_control(return_collateral_access_control(&ctx))]
pub fn return_collateral(ctx: Context<ReturnCollateral>) -> Result<()> {
    let rfq = &ctx.accounts.rfq;
    let order = &mut ctx.accounts.order;

    if order.ask.is_some() && !order.ask_confirmed {
        anchor_spl::token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::Transfer {
                    from: ctx.accounts.asset_escrow.to_account_info(),
                    to: ctx.accounts.asset_wallet.to_account_info(),
                    authority: rfq.to_account_info(),
                },
                &[
                    &[
                        ASSET_ESCROW_SEED.as_bytes(),
                        rfq.key().as_ref(),
                        &[rfq.asset_escrow_bump],
                    ][..],
                    &[
                        RFQ_SEED.as_bytes(),
                        &rfq.authority.key().to_bytes(),
                        &rfq.order_amount.to_le_bytes(),
                        &rfq.expiry.to_le_bytes(),
                        &[rfq.bump],
                    ][..],
                ],
            ),
            rfq.order_amount,
        )?;
    }

    if order.bid.is_some() && !order.bid_confirmed {
        anchor_spl::token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::Transfer {
                    from: ctx.accounts.quote_escrow.to_account_info(),
                    to: ctx.accounts.quote_wallet.to_account_info(),
                    authority: rfq.to_account_info(),
                },
                &[
                    &[
                        QUOTE_ESCROW_SEED.as_bytes(),
                        rfq.key().as_ref(),
                        &[rfq.quote_escrow_bump],
                    ][..],
                    &[
                        RFQ_SEED.as_bytes(),
                        &rfq.authority.key().to_bytes(),
                        &rfq.order_amount.to_le_bytes(),
                        &rfq.expiry.to_le_bytes(),
                        &[rfq.bump],
                    ][..],
                ],
            ),
            order.bid.unwrap(),
        )?;
    }

    order.collateral_returned = true;

    Ok(())
}

// Settles RFQ.
//
// Step 6: Taker and maker receive asset or quote.
///
/// ctx Accounts context
#[access_control(settle_access_control(&ctx))]
pub fn settle(ctx: Context<Settle>) -> Result<()> {
    let protocol = &mut ctx.accounts.protocol;
    let order = &mut ctx.accounts.order;
    let rfq = &mut ctx.accounts.rfq;

    let signer = ctx.accounts.signer.key();
    let taker = rfq.authority.key();
    let maker = order.authority.key();

    let mut quote_amount = 0;
    let mut asset_amount = 0;
    let mut fee_amount = 0;

    match order.confirmed_quote.unwrap() {
        Quote::Ask => {
            if signer == taker {
                fee_amount = (rfq.order_amount as u128)
                    .checked_div(protocol.fee_denominator as u128)
                    .ok_or(ProtocolError::Math)?
                    .checked_mul(protocol.fee_numerator as u128)
                    .ok_or(ProtocolError::Math)?
                    .to_u64()
                    .ok_or(ProtocolError::Math)?;
                asset_amount = rfq
                    .order_amount
                    .checked_sub(fee_amount)
                    .ok_or(ProtocolError::Math)?;
            } else if signer == maker {
                quote_amount = rfq.best_ask_amount.unwrap();
            } else {
                return Err(error!(ProtocolError::InvalidAuthority));
            }
        }
        Quote::Bid => {
            if signer == taker {
                fee_amount = (rfq.best_bid_amount.unwrap() as u128)
                    .checked_div(protocol.fee_denominator as u128)
                    .ok_or(ProtocolError::Math)?
                    .checked_mul(protocol.fee_numerator as u128)
                    .ok_or(ProtocolError::Math)?
                    .to_u64()
                    .ok_or(ProtocolError::Math)?;
                quote_amount = rfq
                    .best_bid_amount
                    .unwrap()
                    .checked_sub(fee_amount)
                    .ok_or(ProtocolError::Math)?;
            } else if signer == maker {
                asset_amount = rfq.order_amount;
            } else {
                return Err(error!(ProtocolError::InvalidAuthority));
            }
        }
    }

    if asset_amount > 0 {
        anchor_spl::token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::Transfer {
                    from: ctx.accounts.asset_escrow.to_account_info(),
                    to: ctx.accounts.asset_wallet.to_account_info(),
                    authority: rfq.to_account_info(),
                },
                &[
                    &[
                        ASSET_ESCROW_SEED.as_bytes(),
                        rfq.key().as_ref(),
                        &[rfq.asset_escrow_bump],
                    ][..],
                    &[
                        RFQ_SEED.as_bytes(),
                        &rfq.authority.key().to_bytes(),
                        &rfq.order_amount.to_le_bytes(),
                        &rfq.expiry.to_le_bytes(),
                        &[rfq.bump],
                    ][..],
                ],
            ),
            asset_amount,
        )?;

        if fee_amount > 0 {
            anchor_spl::token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    anchor_spl::token::Transfer {
                        from: ctx.accounts.asset_escrow.to_account_info(),
                        to: ctx.accounts.treasury_wallet.to_account_info(),
                        authority: rfq.to_account_info(),
                    },
                    &[
                        &[
                            ASSET_ESCROW_SEED.as_bytes(),
                            rfq.key().as_ref(),
                            &[rfq.asset_escrow_bump],
                        ][..],
                        &[
                            RFQ_SEED.as_bytes(),
                            &rfq.authority.key().to_bytes(),
                            &rfq.order_amount.to_le_bytes(),
                            &rfq.expiry.to_le_bytes(),
                            &[rfq.bump],
                        ][..],
                    ],
                ),
                fee_amount,
            )?;
        }
    }

    if quote_amount > 0 {
        anchor_spl::token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::Transfer {
                    from: ctx.accounts.quote_escrow.to_account_info(),
                    to: ctx.accounts.quote_wallet.to_account_info(),
                    authority: rfq.to_account_info(),
                },
                &[
                    &[
                        QUOTE_ESCROW_SEED.as_bytes(),
                        rfq.key().as_ref(),
                        &[rfq.quote_escrow_bump],
                    ][..],
                    &[
                        RFQ_SEED.as_bytes(),
                        &rfq.authority.key().to_bytes(),
                        &rfq.order_amount.to_le_bytes(),
                        &rfq.expiry.to_le_bytes(),
                        &[rfq.bump],
                    ][..],
                ],
            ),
            quote_amount,
        )?;

        if fee_amount > 0 {
            anchor_spl::token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    anchor_spl::token::Transfer {
                        from: ctx.accounts.quote_escrow.to_account_info(),
                        to: ctx.accounts.treasury_wallet.to_account_info(),
                        authority: rfq.to_account_info(),
                    },
                    &[
                        &[
                            QUOTE_ESCROW_SEED.as_bytes(),
                            rfq.key().as_ref(),
                            &[rfq.quote_escrow_bump],
                        ][..],
                        &[
                            RFQ_SEED.as_bytes(),
                            &rfq.authority.key().to_bytes(),
                            &rfq.order_amount.to_le_bytes(),
                            &rfq.expiry.to_le_bytes(),
                            &[rfq.bump],
                        ][..],
                    ],
                ),
                fee_amount,
            )?;
        }
    }

    if signer == taker {
        rfq.settled = true;
    }

    if signer == maker {
        order.settled = true;
    }

    Ok(())
}
