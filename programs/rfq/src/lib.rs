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

use access_controls::*;
use contexts::*;
use states::*;

declare_id!("669TjP6JkroCT5czWue2TGEPfcuFN8cz99Z1QMcNCWv7");

/// Request for quote module.
#[program]
pub mod rfq {
    use super::*;

    /// Initializes protocol.
    ///
    /// ctx
    /// fee_denominator Fee denominator
    /// fee_numerator Fee numerator
    pub fn initialize(
        ctx: Context<Initialize>,
        fee_denominator: u64,
        fee_numerator: u64,
    ) -> Result<()> {
        instructions::initialize(ctx, fee_denominator, fee_numerator)
    }

    /// Taker requests quote (RFQ).
    ///
    /// expiry
    /// last_look
    /// legs
    /// expiry
    /// order_amount
    /// order_type
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

    /// Maker responds with one-way or two-way quotes.
    ///
    /// ctx
    /// bid
    /// ask
    #[access_control(respond_access_control(&ctx, bid, ask))]
    pub fn respond(ctx: Context<Respond>, bid: Option<u64>, ask: Option<u64>) -> Result<()> {
        instructions::respond(ctx, bid, ask)
    }

    /// Taker confirms order.
    ///
    /// ctx
    /// order_side
    #[access_control(confirm_access_control(&ctx, order_side))]
    pub fn confirm(ctx: Context<Confirm>, order_side: Side) -> Result<()> {
        instructions::confirm(ctx, order_side)
    }

    /// Last look.
    ///
    /// ctx
    #[access_control(last_look_access_control(&ctx))]
    pub fn last_look(ctx: Context<LastLook>) -> Result<()> {
        instructions::last_look(ctx)
    }

    /// Return collateral of losting makers.
    ///
    /// ctx
    #[access_control(return_collateral_access_control(&ctx))]
    pub fn return_collateral(ctx: Context<ReturnCollateral>) -> Result<()> {
        instructions::return_collateral(ctx)
    }

    /// Settles winning maker and taker fund transfers.
    ///
    /// ctx
    #[access_control(settle_access_control(&ctx))]
    pub fn settle(ctx: Context<Settle>) -> Result<()> {
        instructions::settle(ctx)
    }
}
