//! Request for quote (RFQ) protocol.
//!
//! Provides an abstraction and implements the RFQ mechanism.

use anchor_lang::prelude::*;
use solana_security_txt::security_txt;

pub mod common;
pub mod constants;
pub mod errors;
pub mod instructions;
pub mod interfaces;
pub mod states;
pub mod utils;

use instructions::collateral::fund_collateral::*;
use instructions::collateral::initialize_collateral::*;
use instructions::protocol::add_instrument::*;
use instructions::protocol::initialize_protocol::*;
use instructions::rfq::add_legs_to_rfq::*;
use instructions::rfq::cancel_response::*;
use instructions::rfq::cancel_rfq::*;
use instructions::rfq::clean_up_response::*;
use instructions::rfq::clean_up_rfq::*;
use instructions::rfq::confirm_response::*;
use instructions::rfq::create_rfq::*;
use instructions::rfq::finalize_rfq_construction::*;
use instructions::rfq::prepare_to_settle::*;
use instructions::rfq::respond_to_rfq::*;
use instructions::rfq::revert_preparation::*;
use instructions::rfq::settle::*;
use instructions::rfq::settle_one_party_default::*;
use instructions::rfq::settle_two_party_default::*;
use instructions::rfq::unlock_response_collateral::*;
use instructions::rfq::unlock_rfq_collateral::*;
use states::*;

security_txt! {
    name: "Convergence RFQ",
    project_url: "https://www.convergence.so",
    contacts: "email:hello@convergence.so,link:https://www.convergence.so/security",
    policy: "https://github.com/convergence-rfq/convergence/blob/master/SECURITY.md",
    preferred_languages: "en",
    source_code: "https://github.com/convergence-rfq/rfq",
    auditors: "None"
}

declare_id!("3t9BM7DwaibpjNVWAWYauZyhjteoTjuJqGEqxCv7x9MA");

/// Request for quote (RFQ) protocol module.
#[program]
pub mod rfq {
    use super::*;

    pub fn initialize_protocol(
        ctx: Context<InitializeProtocolAccounts>,
        settle_fees: FeeParameters,
        default_fees: FeeParameters,
    ) -> Result<()> {
        initialize_protocol_instruction(ctx, settle_fees, default_fees)
    }

    pub fn add_instrument(
        ctx: Context<AddInstrumentAccounts>,
        validate_data_account_amount: u8,
        prepare_to_settle_account_amount: u8,
        settle_account_amount: u8,
        revert_preparation_account_amount: u8,
        clean_up_account_amount: u8,
    ) -> Result<()> {
        add_instrument_instruction(
            ctx,
            validate_data_account_amount,
            prepare_to_settle_account_amount,
            settle_account_amount,
            revert_preparation_account_amount,
            clean_up_account_amount,
        )
    }

    pub fn prepare_settlement<'info>(
        ctx: Context<'_, '_, '_, 'info, PrepareSettlementAccounts<'info>>,
        side: AuthoritySide,
    ) -> Result<()> {
        prepare_settlement_instruction(ctx, side)
    }

    pub fn initialize_collateral(ctx: Context<InitializeCollateralAccounts>) -> Result<()> {
        initialize_collateral_instruction(ctx)
    }

    pub fn fund_collateral(ctx: Context<FundCollateralAccounts>, amount: u64) -> Result<()> {
        fund_collateral_instruction(ctx, amount)
    }

    pub fn create_rfq<'info>(
        ctx: Context<'_, '_, '_, 'info, CreateRfqAccounts<'info>>,
        expected_leg_size: u16,
        legs: Vec<Leg>,
        order_type: OrderType,
        fixed_size: FixedSize,
        active_window: u32,
        settling_window: u32,
    ) -> Result<()> {
        create_rfq_instruction(
            ctx,
            expected_leg_size,
            legs,
            order_type,
            fixed_size,
            active_window,
            settling_window,
        )
    }

    pub fn finalize_rfq_construction(ctx: Context<FinalizeRfqConstructionAccounts>) -> Result<()> {
        finalize_rfq_construction_instruction(ctx)
    }

    pub fn respond_to_rfq(
        ctx: Context<RespondToRfqAccounts>,
        bid: Option<Quote>,
        ask: Option<Quote>,
    ) -> Result<()> {
        respond_to_rfq_instruction(ctx, bid, ask)
    }

    pub fn confirm_response(
        ctx: Context<ConfirmResponseAccounts>,
        side: Side,
        override_leg_multiplier_bps: Option<u64>,
    ) -> Result<()> {
        confirm_response_instruction(ctx, side, override_leg_multiplier_bps)
    }

    pub fn add_legs_to_rfq<'info>(
        ctx: Context<'_, '_, '_, 'info, AddLegsToRfqAccounts<'info>>,
        legs: Vec<Leg>,
    ) -> Result<()> {
        add_legs_to_rfq_instruction(ctx, legs)
    }

    pub fn settle<'info>(ctx: Context<'_, '_, '_, 'info, SettleAccounts<'info>>) -> Result<()> {
        settle_instruction(ctx)
    }

    pub fn revert_settlement_preparation<'info>(
        ctx: Context<'_, '_, '_, 'info, RevertSettlementPreparationAccounts<'info>>,
        side: AuthoritySide,
    ) -> Result<()> {
        revert_settlement_preparation_instruction(ctx, side)
    }

    pub fn unlock_response_collateral(
        ctx: Context<UnlockResponseCollateralAccounts>,
    ) -> Result<()> {
        unlock_response_collateral_instruction(ctx)
    }

    pub fn unlock_rfq_collateral(ctx: Context<UnlockRfqCollateralAccounts>) -> Result<()> {
        unlock_rfq_collateral_instruction(ctx)
    }

    pub fn settle_one_party_default(ctx: Context<SettleOnePartyDefaultAccounts>) -> Result<()> {
        settle_one_party_default_instruction(ctx)
    }

    pub fn settle_two_party_default(ctx: Context<SettleTwoPartyDefaultAccounts>) -> Result<()> {
        settle_both_party_default_collateral_instruction(ctx)
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
