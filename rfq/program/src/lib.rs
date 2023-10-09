//! Request for quote (RFQ) protocol.
//!
//! Provides an abstraction and implements the RFQ mechanism.
#![allow(clippy::result_large_err)]

use anchor_lang::prelude::*;
use solana_security_txt::security_txt;

pub mod common;
pub mod errors;
pub mod instructions;
pub mod seeds;
pub mod state;
pub mod utils;

use instructions::protocol::close_protocol_state::*;
use instructions::protocol::initialize_protocol::*;
use instructions::rfq::cancel_response::*;
use instructions::rfq::cancel_rfq::*;
use instructions::rfq::clean_up_response::*;
use instructions::rfq::clean_up_rfq::*;
use instructions::rfq::confirm_response::*;
use instructions::rfq::create_rfq::*;
use instructions::rfq::respond_to_rfq::*;
use instructions::rfq::settle::*;
use instructions::rfq::unlock_response_collateral::*;
use state::*;

security_txt! {
    name: "Convergence RFQ",
    project_url: "https://www.convergence.so",
    contacts: "email:hello@convergence.so,link:https://www.convergence.so/security",
    policy: "https://github.com/convergence-rfq/convergence/blob/master/SECURITY.md",
    preferred_languages: "en",
    source_code: "https://github.com/convergence-rfq/rfq",
    auditors: "None"
}

declare_id!("CeYwCe6YwBvRE9CpRU2Zgc5oQP7r2ThNqicyKN37Unn4");

/// Request for quote (RFQ) protocol module.
#[program]
pub mod rfq {
    use super::*;

    pub fn initialize_protocol(ctx: Context<InitializeProtocolAccounts>) -> Result<()> {
        initialize_protocol_instruction(ctx)
    }

    pub fn close_protocol_state(ctx: Context<CloseProtocolStateAccounts>) -> Result<()> {
        close_protocol_state_instruction(ctx)
    }

    #[allow(clippy::too_many_arguments)]
    pub fn create_rfq<'info>(
        ctx: Context<'_, '_, '_, 'info, CreateRfqAccounts<'info>>,
        order_type: OrderType,
        fixed_size: FixedSize,
        active_window: u32,
        recent_timestamp: u64, // used to allow the same rfq creation using different recent timestamps
    ) -> Result<()> {
        create_rfq_instruction(ctx, order_type, fixed_size, active_window, recent_timestamp)
    }

    pub fn respond_to_rfq<'info>(
        ctx: Context<'_, '_, '_, 'info, RespondToRfqAccounts<'info>>,
        bid: Option<Quote>,
        ask: Option<Quote>,
        pda_distinguisher: u16, // allows creation of the same response multiple times specifying a different distinguisher
    ) -> Result<()> {
        respond_to_rfq_instruction(ctx, bid, ask, pda_distinguisher)
    }

    pub fn confirm_response<'info>(
        ctx: Context<'_, '_, '_, 'info, ConfirmResponseAccounts<'info>>,
        side: QuoteSide,
        override_leg_multiplier_bps: Option<u64>,
    ) -> Result<()> {
        confirm_response_instruction(ctx, side, override_leg_multiplier_bps)
    }

    pub fn settle<'info>(ctx: Context<'_, '_, '_, 'info, SettleAccounts<'info>>) -> Result<()> {
        settle_instruction(ctx)
    }

    pub fn unlock_response_collateral<'info>(
        ctx: Context<'_, '_, '_, 'info, UnlockResponseCollateralAccounts<'info>>,
    ) -> Result<()> {
        unlock_response_collateral_instruction(ctx)
    }

    pub fn clean_up_response<'info>(
        ctx: Context<'_, '_, '_, 'info, CleanUpResponseAccounts<'info>>,
    ) -> Result<()> {
        clean_up_response_instruction(ctx)
    }

    pub fn clean_up_rfq<'info>(
        ctx: Context<'_, '_, '_, 'info, CleanUpRfqAccounts<'info>>,
    ) -> Result<()> {
        clean_up_rfq_instruction(ctx)
    }

    pub fn cancel_response(ctx: Context<CancelResponseAccounts>) -> Result<()> {
        cancel_response_instruction(ctx)
    }

    pub fn cancel_rfq(ctx: Context<CancelRfqAccounts>) -> Result<()> {
        cancel_rfq_instruction(ctx)
    }
}
