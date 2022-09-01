//! Request for quote (RFQ) protocol.
//!
//! Provides an abstraction and implements the RFQ mechanism.

use anchor_lang::prelude::*;
use solana_security_txt::security_txt;

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
use instructions::rfq::confirm_response::*;
use instructions::rfq::intitialize_rfq::*;
use instructions::rfq::prepare_to_settle::*;
use instructions::rfq::respond_to_rfq::*;
use instructions::rfq::revert_preparation::*;
use instructions::rfq::settle::*;
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

declare_id!("3UA1aU58WxePXwtLCMb1CGPQjQQFqVPoKsEQo8vMFe3q");

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
    ) -> Result<()> {
        add_instrument_instruction(
            ctx,
            validate_data_account_amount,
            prepare_to_settle_account_amount,
            settle_account_amount,
            revert_preparation_account_amount,
        )
    }

    pub fn initialize_collateral(ctx: Context<InitializeCollateralAccounts>) -> Result<()> {
        initialize_collateral_instruction(ctx)
    }

    pub fn fund_collateral(ctx: Context<FundCollateralAccounts>, amount: u64) -> Result<()> {
        fund_collateral_instruction(ctx, amount)
    }

    pub fn intitialize_rfq<'info>(
        ctx: Context<'_, '_, '_, 'info, InitializeRfqAccounts<'info>>,
        legs: Vec<Leg>,
        order_type: OrderType,
        fixed_size: FixedSize,
        active_window: u32,
        settling_window: u32,
    ) -> Result<()> {
        initialize_rfq_instruction(
            ctx,
            legs,
            order_type,
            fixed_size,
            active_window,
            settling_window,
        )
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

    pub fn prepare_to_settle<'info>(
        ctx: Context<'_, '_, '_, 'info, PrepareToSettleAccounts<'info>>,
        side: AuthoritySide,
    ) -> Result<()> {
        prepare_to_settle_instruction(ctx, side)
    }

    pub fn settle<'info>(ctx: Context<'_, '_, '_, 'info, SettleAccounts<'info>>) -> Result<()> {
        settle_instruction(ctx)
    }

    pub fn revert_preparation<'info>(
        ctx: Context<'_, '_, '_, 'info, RevertPreparationAccounts<'info>>,
    ) -> Result<()> {
        revert_preparation_instruction(ctx)
    }
}
