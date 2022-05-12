//! Request for quote (RFQ) protocol.
//!
//! Provides an abstraction and implements the RFQ mechanism.

use anchor_lang::prelude::*;

pub mod access_controls;
pub mod constants;
pub mod contexts;
pub mod errors;
pub mod instructions;
pub mod states;

use contexts::*;
use states::*;

declare_id!("9XDtzeAwdc8sinFAR887UijxxnjB3rXztTeQjcFUtU5y");

/// Request for quote (RFQ) protocol module.
#[program]
pub mod rfq {
    use super::*;

    /// Initializes.
    pub fn initialize(
        ctx: Context<Initialize>,
        fee_denominator: u64,
        fee_numerator: u64,
    ) -> Result<()> {
        instructions::initialize(ctx, fee_denominator, fee_numerator)
    }

    /// Sets fee.
    pub fn set_fee(ctx: Context<SetFee>, fee_denominator: u64, fee_numerator: u64) -> Result<()> {
        instructions::set_fee(ctx, fee_denominator, fee_numerator)
    }

    /// Requests quote (RFQ).
    pub fn request(
        ctx: Context<Request>,
        access_manager: Option<Pubkey>,
        expiry: i64,
        last_look: bool,
        legs: Vec<Leg>,
        order_amount: u64,
        order_type: Order,
    ) -> Result<()> {
        instructions::request(
            ctx,
            access_manager,
            expiry,
            last_look,
            legs,
            order_amount,
            order_type,
        )
    }

    /// Responds to RFQ.
    pub fn respond(ctx: Context<Respond>, bid: Option<u64>, ask: Option<u64>) -> Result<()> {
        instructions::respond(ctx, bid, ask)
    }

    /// Cancels RFQ.
    pub fn cancel(ctx: Context<Cancel>) -> Result<()> {
        instructions::cancel(ctx)
    }

    /// Quote last look.
    pub fn last_look(ctx: Context<LastLook>) -> Result<()> {
        instructions::last_look(ctx)
    }

    /// Confirms quote.
    pub fn confirm(ctx: Context<Confirm>, quote: Quote) -> Result<()> {
        instructions::confirm(ctx, quote)
    }

    /// Returns quote collateral.
    pub fn return_collateral(ctx: Context<ReturnCollateral>) -> Result<()> {
        instructions::return_collateral(ctx)
    }

    /// Settles RFQ.
    pub fn settle(ctx: Context<Settle>) -> Result<()> {
        instructions::settle(ctx)
    }
}
