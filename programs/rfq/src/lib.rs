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
pub mod utils;

use contexts::*;
use states::*;

declare_id!("669TjP6JkroCT5czWue2TGEPfcuFN8cz99Z1QMcNCWv7");

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
        expiry: i64,
        last_look: bool,
        legs: Vec<Leg>,
        order_amount: u64,
        order_type: Order,
    ) -> Result<()> {
        instructions::request(ctx, expiry, last_look, legs, order_amount, order_type)
    }

    /// Responds to RFQ.
    pub fn respond(ctx: Context<Respond>, bid: Option<u64>, ask: Option<u64>) -> Result<()> {
        instructions::respond(ctx, bid, ask)
    }

    /// Quote last look.
    pub fn last_look(ctx: Context<LastLook>) -> Result<()> {
        instructions::last_look(ctx)
    }

    /// Confirms quote.
    pub fn confirm(ctx: Context<Confirm>, order_side: Side) -> Result<()> {
        instructions::confirm(ctx, order_side)
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
