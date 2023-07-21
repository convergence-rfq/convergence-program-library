//! Request for quote (RFQ) protocol.
//!
//! Provides an abstraction and implements the RFQ mechanism.
#![allow(clippy::result_large_err)]

use anchor_lang::prelude::*;
use solana_security_txt::security_txt;

pub mod common;
pub mod errors;
pub mod instructions;
pub mod interfaces;
pub mod seeds;
pub mod state;
pub mod utils;

use instructions::collateral::fund_collateral::*;
use instructions::collateral::initialize_collateral::*;
use instructions::collateral::withdraw_collateral::*;
use instructions::protocol::add_base_asset::*;
use instructions::protocol::add_instrument::*;
use instructions::protocol::add_print_trade_provider::*;
use instructions::protocol::change_base_asset_parameters::*;
use instructions::protocol::change_protocol_fees::*;
use instructions::protocol::close_protocol_state::*;
use instructions::protocol::initialize_protocol::*;
use instructions::protocol::register_mint::*;
use instructions::protocol::set_instrument_enabled_status::*;
use instructions::rfq::add_legs_to_rfq::*;
use instructions::rfq::cancel_response::*;
use instructions::rfq::cancel_rfq::*;
use instructions::rfq::clean_up_response::*;
use instructions::rfq::clean_up_response_escrow_legs::*;
use instructions::rfq::clean_up_rfq::*;
use instructions::rfq::confirm_response::*;
use instructions::rfq::create_rfq::*;
use instructions::rfq::expire_settlement::*;
use instructions::rfq::finalize_rfq_construction::*;
use instructions::rfq::partially_settle_escrow_legs::*;
use instructions::rfq::partly_revert_escrow_settlement_preparation::*;
use instructions::rfq::prepare_escrow_settlement::*;
use instructions::rfq::prepare_more_escrow_legs_settlement::*;
use instructions::rfq::prepare_print_trade_settlement::*;
use instructions::rfq::respond_to_rfq::*;
use instructions::rfq::revert_escrow_settlement_preparation::*;
use instructions::rfq::settle_escrow::*;
use instructions::rfq::settle_one_party_default::*;
use instructions::rfq::settle_print_trade::*;
use instructions::rfq::settle_two_party_default::*;
use instructions::rfq::unlock_response_collateral::*;
use instructions::rfq::unlock_rfq_collateral::*;
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

    pub fn initialize_protocol(
        ctx: Context<InitializeProtocolAccounts>,
        settle_fees: FeeParameters,
        default_fees: FeeParameters,
    ) -> Result<()> {
        initialize_protocol_instruction(ctx, settle_fees, default_fees)
    }

    pub fn add_instrument(
        ctx: Context<AddInstrumentAccounts>,
        can_be_used_as_quote: bool,
        validate_data_account_amount: u8,
        prepare_to_settle_account_amount: u8,
        settle_account_amount: u8,
        revert_preparation_account_amount: u8,
        clean_up_account_amount: u8,
    ) -> Result<()> {
        add_instrument_instruction(
            ctx,
            can_be_used_as_quote,
            validate_data_account_amount,
            prepare_to_settle_account_amount,
            settle_account_amount,
            revert_preparation_account_amount,
            clean_up_account_amount,
        )
    }

    pub fn add_print_trade_provider(
        ctx: Context<AddPrintTradeProviderAccounts>,
        settlement_can_expire: bool,
        validate_data_accounts: u8,
    ) -> Result<()> {
        add_print_trade_provider_instruction(ctx, settlement_can_expire, validate_data_accounts)
    }

    #[allow(clippy::too_many_arguments)]
    pub fn add_base_asset(
        ctx: Context<AddBaseAssetAccounts>,
        index: BaseAssetIndex,
        ticker: String,
        risk_category: RiskCategory,
        oracle_source: OracleSource,
        switchboard_oracle: Option<Pubkey>,
        pyth_oracle: Option<Pubkey>,
        in_place_price: Option<f64>,
    ) -> Result<()> {
        add_base_asset_instruction(
            ctx,
            index,
            ticker,
            risk_category,
            oracle_source,
            switchboard_oracle,
            pyth_oracle,
            in_place_price,
        )
    }

    pub fn change_protocol_fees(
        ctx: Context<ChangeProtocolFeesAccounts>,
        settle_fees: Option<FeeParameters>,
        default_fees: Option<FeeParameters>,
    ) -> Result<()> {
        change_protocol_fees_instruction(ctx, settle_fees, default_fees)
    }

    pub fn change_base_asset_parameters(
        ctx: Context<ChangeBaseAssetParametersAccounts>,
        enabled: Option<bool>,
        risk_category: Option<RiskCategory>,
        oracle_source: Option<OracleSource>,
        switchboard_oracle: CustomOptionalPubkey,
        pyth_oracle: CustomOptionalPubkey,
        in_place_price: CustomOptionalF64,
    ) -> Result<()> {
        change_base_asset_parameters_instruction(
            ctx,
            enabled,
            risk_category,
            oracle_source,
            switchboard_oracle,
            pyth_oracle,
            in_place_price,
        )
    }

    pub fn set_instrument_enabled_status(
        ctx: Context<SetInstrumentEnabledStatusAccounts>,
        instrument_key: Pubkey,
        enabled_status_to_set: bool,
    ) -> Result<()> {
        set_instrument_enabled_status_instruction(ctx, instrument_key, enabled_status_to_set)
    }

    pub fn register_mint(ctx: Context<RegisterMintAccounts>) -> Result<()> {
        register_mint_instruction(ctx)
    }

    pub fn initialize_collateral(ctx: Context<InitializeCollateralAccounts>) -> Result<()> {
        initialize_collateral_instruction(ctx)
    }

    pub fn fund_collateral(ctx: Context<FundCollateralAccounts>, amount: u64) -> Result<()> {
        fund_collateral_instruction(ctx, amount)
    }

    pub fn withdraw_collateral(
        ctx: Context<WithdrawCollateralAccounts>,
        amount: u64,
    ) -> Result<()> {
        withdraw_collateral_instruction(ctx, amount)
    }

    #[allow(clippy::too_many_arguments)]
    pub fn create_rfq<'info>(
        ctx: Context<'_, '_, '_, 'info, CreateRfqAccounts<'info>>,
        expected_legs_size: u16,
        expected_legs_hash: [u8; 32],
        legs: Vec<Leg>,
        print_trade_provider: Option<Pubkey>,
        order_type: OrderType,
        quote_asset: QuoteAsset,
        fixed_size: FixedSize,
        active_window: u32,
        settling_window: u32,
        recent_timestamp: u64, // used to allow the same rfq creation using different recent timestamps
    ) -> Result<()> {
        create_rfq_instruction(
            ctx,
            expected_legs_size,
            expected_legs_hash,
            legs,
            print_trade_provider,
            order_type,
            quote_asset,
            fixed_size,
            active_window,
            settling_window,
            recent_timestamp,
        )
    }

    pub fn add_legs_to_rfq<'info>(
        ctx: Context<'_, '_, '_, 'info, AddLegsToRfqAccounts<'info>>,
        legs: Vec<Leg>,
    ) -> Result<()> {
        add_legs_to_rfq_instruction(ctx, legs)
    }

    pub fn finalize_rfq_construction<'info>(
        ctx: Context<'_, '_, '_, 'info, FinalizeRfqConstructionAccounts<'info>>,
    ) -> Result<()> {
        finalize_rfq_construction_instruction(ctx)
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

    pub fn prepare_escrow_settlement<'info>(
        ctx: Context<'_, '_, '_, 'info, PrepareEscrowSettlementAccounts<'info>>,
        side: AuthoritySide,
        leg_amount_to_prepare: u8,
    ) -> Result<()> {
        prepare_escrow_settlement_instruction(ctx, side, leg_amount_to_prepare)
    }

    pub fn prepare_more_escrow_legs_settlement<'info>(
        ctx: Context<'_, '_, '_, 'info, PrepareMoreEscrowLegsSettlementAccounts<'info>>,
        side: AuthoritySide,
        leg_amount_to_prepare: u8,
    ) -> Result<()> {
        prepare_more_escrow_legs_settlement_instruction(ctx, side, leg_amount_to_prepare)
    }

    pub fn prepare_print_trade_settlement<'info>(
        ctx: Context<'_, '_, '_, 'info, PreparePrintTradeSettlementAccounts<'info>>,
        side: AuthoritySide,
    ) -> Result<()> {
        prepare_print_trade_settlement_instruction(ctx, side)
    }

    pub fn settle_escrow<'info>(
        ctx: Context<'_, '_, '_, 'info, SettleEscrowAccounts<'info>>,
    ) -> Result<()> {
        settle_escrow_instruction(ctx)
    }

    pub fn partially_settle_escrow_legs<'info>(
        ctx: Context<'_, '_, '_, 'info, PartiallySettleEscrowLegsAccounts<'info>>,
        leg_amount_to_settle: u8,
    ) -> Result<()> {
        partially_settle_escrow_legs_instruction(ctx, leg_amount_to_settle)
    }

    pub fn settle_print_trade<'info>(
        ctx: Context<'_, '_, '_, 'info, SettlePrintTradeAccounts<'info>>,
    ) -> Result<()> {
        settle_print_trade_instruction(ctx)
    }

    pub fn expire_settlement(ctx: Context<ExpireSettlementAccounts>) -> Result<()> {
        expire_settlement_instruction(ctx)
    }

    pub fn revert_escrow_settlement_preparation<'info>(
        ctx: Context<'_, '_, '_, 'info, RevertEscrowSettlementPreparationAccounts<'info>>,
        side: AuthoritySide,
    ) -> Result<()> {
        revert_escrow_settlement_preparation_instruction(ctx, side)
    }

    pub fn partly_revert_escrow_settlement_preparation<'info>(
        ctx: Context<'_, '_, '_, 'info, PartlyRevertEscrowSettlementPreparationAccounts<'info>>,
        side: AuthoritySide,
        leg_amount_to_revert: u8,
    ) -> Result<()> {
        partly_revert_escrow_settlement_preparation_instruction(ctx, side, leg_amount_to_revert)
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

    pub fn clean_up_response_escrow_legs<'info>(
        ctx: Context<'_, '_, '_, 'info, CleanUpResponseEscrowLegsAccounts<'info>>,
        leg_amount_to_clear: u8,
    ) -> Result<()> {
        clean_up_response_escrow_legs_instruction(ctx, leg_amount_to_clear)
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

    pub fn close_protocol_state(ctx: Context<CloseProtocolStateAccounts>) -> Result<()> {
        close_protocol_state_instruction(ctx)
    }
}
