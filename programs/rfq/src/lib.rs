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
use instructions::rfq::respond_to_rfq::*;
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

    pub fn add_instrument_protocol(
        ctx: Context<AddInstrumentAccounts>,
        parameters: InstrumentParameters,
    ) -> Result<()> {
        add_instrument_instruction(ctx, parameters)
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
        active_window: u32,
        settling_window: u32,
    ) -> Result<()> {
        initialize_rfq_instruction(ctx, legs, order_type, active_window, settling_window)
    }

    pub fn respond_to_rfq(
        ctx: Context<RespondToRfqAccounts>,
        bid: Option<Quote>,
        ask: Option<Quote>,
    ) -> Result<()> {
        respond_to_rfq_instruction(ctx, bid, ask)
    }

    pub fn confirm_rfq(ctx: Context<ConfirmResponseAccounts>, side: Side) -> Result<()> {
        confirm_response_instruction(ctx, side)
    }
}
