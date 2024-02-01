#![allow(unused_imports)]
#![allow(clippy::result_large_err)]
#![allow(clippy::needless_lifetimes)]
#![allow(clippy::derivable_impls)]
#![allow(clippy::match_like_matches_macro)]
#![allow(clippy::large_enum_variant)]
#![allow(clippy::should_implement_trait)]
#![allow(clippy::comparison_chain)]
#![allow(clippy::redundant_pattern_matching)]
#![allow(clippy::single_char_pattern)]
#![allow(clippy::cast_abs_to_unsigned)]
#![allow(clippy::neg_multiply)]

use agnostic_orderbook::state::{SelfTradeBehavior, Side};
use anchor_lang::{
    prelude::*,
    solana_program::{
        account_info::AccountInfo,
        entrypoint::ProgramResult,
        instruction::{AccountMeta, Instruction},
        pubkey::Pubkey,
        sysvar::{rent::Rent, Sysvar},
    },
};
use anchor_spl::token::{Mint, Token, TokenAccount};
use borsh::{BorshDeserialize, BorshSerialize};
use state::{
    print_trade::{PrintTrade, PrintTradeProductIndexes},
    trader_risk_group::LockedCollateralProductIndexes,
};

use crate::{
    state::{
        constants::NAME_LEN,
        enums::OrderType,
        fee_model::TraderFeeParams,
        market_product_group::MarketProductGroup,
        risk_engine_register::{OperationType, OrderInfo, RiskOutputRegister},
        trader_risk_group::TraderRiskGroup,
    },
    utils::numeric::Fractional,
};

pub mod error;
/// Describes the data structures the program uses to encode state
pub mod state;
/// Helper functions
pub mod utils;

declare_id!("FUfpR31LmcP1VSbz5zDaM7nxnH55iBHkpwusgrnhaFjL");

#[program]
pub mod dex {
    use super::*;

    pub fn initialize_market_product_group(
        _ctx: Context<InitializeMarketProductGroup>,
        _params: InitializeMarketProductGroupParams,
    ) -> ProgramResult {
        Ok(())
    }

    pub fn initialize_market_product(
        _ctx: Context<InitializeMarketProduct>,
        _params: InitializeMarketProductParams,
    ) -> ProgramResult {
        Ok(())
    }

    pub fn remove_market_product(_ctx: Context<RemoveMarketProduct>) -> ProgramResult {
        Ok(())
    }

    pub fn initialize_trader_risk_group<'a, 'b, 'c, 'info>(
        _ctx: Context<'a, 'b, 'c, 'info, InitializeTraderRiskGroup<'info>>,
    ) -> ProgramResult {
        Ok(())
    }

    pub fn new_order<'info>(
        _ctx: Context<'_, '_, '_, 'info, NewOrder<'info>>,
        _params: NewOrderParams,
    ) -> ProgramResult {
        Ok(())
    }

    pub fn consume_orderbook_events<'a, 'b, 'c, 'info>(
        _ctx: Context<'a, 'b, 'c, 'info, ConsumeOrderbookEvents<'info>>,
        _params: ConsumeOrderbookEventsParams,
    ) -> ProgramResult {
        Ok(())
    }

    pub fn cancel_order<'info>(
        _ctx: Context<'_, '_, '_, 'info, CancelOrder<'info>>,
        _params: CancelOrderParams,
    ) -> ProgramResult {
        Ok(())
    }

    pub fn deposit_funds(
        _ctx: Context<DepositFunds>,
        _params: DepositFundsParams,
    ) -> ProgramResult {
        Ok(())
    }

    pub fn withdraw_funds<'info>(
        _ctx: Context<'_, '_, '_, 'info, WithdrawFunds<'info>>,
        _params: WithdrawFundsParams,
    ) -> ProgramResult {
        Ok(())
    }

    pub fn update_product_funding(
        _ctx: Context<UpdateProductFunding>,
        _params: UpdateProductFundingParams,
    ) -> ProgramResult {
        Ok(())
    }

    pub fn transfer_full_position<'info>(
        _ctx: Context<'_, '_, '_, 'info, TransferFullPosition<'info>>,
    ) -> ProgramResult {
        // msg!("Dex Instr: Transfer full position");
        Ok(())
    }

    pub fn initialize_combo(
        _ctx: Context<InitializeCombo>,
        _params: InitializeComboParams,
    ) -> ProgramResult {
        Ok(())
    }

    pub fn update_trader_funding(_ctx: Context<UpdateTraderFunding>) -> ProgramResult {
        Ok(())
    }

    pub fn clear_expired_orderbook(
        _ctx: Context<ClearExpiredOrderbook>,
        _params: ClearExpiredOrderbookParams,
    ) -> ProgramResult {
        Ok(())
    }

    pub fn sweep_fees(_ctx: Context<SweepFees>) -> ProgramResult {
        Ok(())
    }

    pub fn choose_successor(_ctx: Context<ChooseSuccessor>) -> ProgramResult {
        Ok(())
    }

    pub fn claim_authority(_ctx: Context<ClaimAuthority>) -> ProgramResult {
        Ok(())
    }

    pub fn lock_collateral<'info>(
        _ctx: Context<'_, '_, '_, 'info, LockCollateral<'info>>,
        _params: LockCollateralParams,
    ) -> ProgramResult {
        Ok(())
    }

    pub fn initialize_print_trade(
        _ctx: Context<InitializePrintTrade>,
        _params: InitializePrintTradeParams,
    ) -> ProgramResult {
        Ok(())
    }

    pub fn sign_print_trade<'info>(
        _ctx: Context<'_, '_, '_, 'info, SignPrintTrade<'info>>,
        _params: SignPrintTradeParams,
    ) -> ProgramResult {
        Ok(())
    }

    pub fn execute_print_trade<'info>(
        _ctx: Context<'_, '_, '_, 'info, ExecutePrintTrade<'info>>,
    ) -> Result<()> {
        Ok(())
    }

    pub fn close_print_trade<'info>(
        _ctx: Context<'_, '_, '_, 'info, ClosePrintTrade<'info>>,
    ) -> Result<()> {
        Ok(())
    }
}

#[repr(C)]
#[derive(AnchorSerialize, AnchorDeserialize, PartialEq, Debug, Clone)]
pub struct InitializeMarketProductGroupParams {
    pub name: [u8; NAME_LEN],
    pub validate_account_discriminant_len: u64,
    pub find_fees_discriminant_len: u64,
    pub validate_account_health_discriminant: [u8; 8],
    pub validate_account_liquidation_discriminant: [u8; 8],
    pub create_risk_state_account_discriminant: [u8; 8],
    pub create_fee_state_account_discriminant: [u8; 8],
    pub find_fees_discriminant: [u8; 8],
    pub max_maker_fee_bps: i16,
    pub min_maker_fee_bps: i16,
    pub max_taker_fee_bps: i16,
    pub min_taker_fee_bps: i16,
}

#[derive(Accounts)]
pub struct InitializeMarketProductGroup<'info> {
    authority: Signer<'info>,
    #[account(zero)]
    market_product_group: AccountLoader<'info, MarketProductGroup>,
    #[account(mut)]
    market_product_group_vault: AccountInfo<'info>,
    vault_mint: Account<'info, Mint>,
    fee_collector: AccountInfo<'info>,
    #[account(executable)]
    fee_model_program: AccountInfo<'info>,
    fee_model_configuration_acct: AccountInfo<'info>,
    risk_model_configuration_acct: AccountInfo<'info>,
    #[account(executable)]
    risk_engine_program: AccountInfo<'info>,
    sysvar_rent: AccountInfo<'info>,
    system_program: Program<'info, System>,
    token_program: Program<'info, Token>,
    fee_output_register: AccountInfo<'info>,
    risk_output_register: AccountInfo<'info>,
    staking_fee_collector: AccountInfo<'info>,
}

#[repr(C)]
#[derive(AnchorSerialize, AnchorDeserialize, PartialEq, Debug, Clone)]
pub struct InitializeMarketProductParams {
    pub name: [u8; NAME_LEN],
    pub tick_size: Fractional,
    pub base_decimals: u64,
    pub price_offset: Fractional, // Allows for negative prices in ticks up to -price_offset
}

#[derive(Accounts)]
pub struct InitializeMarketProduct<'info> {
    authority: Signer<'info>,
    #[account(mut)]
    market_product_group: AccountLoader<'info, MarketProductGroup>,
    product: AccountInfo<'info>,
    orderbook: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct RemoveMarketProduct<'info> {
    authority: Signer<'info>,
    #[account(mut)]
    market_product_group: AccountLoader<'info, MarketProductGroup>,
    product: AccountInfo<'info>,
    #[account(executable)]
    aaob_program: AccountInfo<'info>,
    #[account(mut)]
    orderbook: AccountInfo<'info>,
    market_signer: AccountInfo<'info>,
    #[account(mut)]
    event_queue: AccountInfo<'info>,
    #[account(mut)]
    bids: AccountInfo<'info>,
    #[account(mut)]
    asks: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct InitializeTraderRiskGroup<'info> {
    #[account(mut)]
    owner: Signer<'info>,
    #[account(zero)]
    trader_risk_group: AccountLoader<'info, TraderRiskGroup>,
    market_product_group: AccountLoader<'info, MarketProductGroup>,
    risk_signer: AccountInfo<'info>,
    #[account(mut)]
    trader_risk_state_acct: Signer<'info>,
    #[account(mut)]
    trader_fee_state_acct: AccountInfo<'info>,
    risk_engine_program: AccountInfo<'info>,
    fee_model_config_acct: AccountInfo<'info>,
    fee_model_program: AccountInfo<'info>,
    system_program: Program<'info, System>,
}

#[repr(C)]
#[derive(AnchorSerialize, AnchorDeserialize, PartialEq, Clone)]
pub struct NewOrderParams {
    /// The order's side (Bid or Ask)
    pub side: Side,
    /// The max quantity of base token to match and post
    pub max_base_qty: Fractional,
    /// The order type (supported types include Limit, FOK, IOC and PostOnly)
    pub order_type: OrderType,
    /// Configures what happens when this order is at least partially matched against an order belonging to the same user account
    pub self_trade_behavior: SelfTradeBehavior,
    /// The maximum number of orders to be matched against.
    /// Setting this number too high can sometimes lead to excessive resource consumption which can cause a failure.
    pub match_limit: u64,
    /// The order's limit price in ticks
    pub limit_price: Fractional,
}

#[derive(Accounts)]
pub struct NewOrder<'info> {
    #[account(mut, signer)]
    user: AccountInfo<'info>,
    #[account(mut)]
    trader_risk_group: AccountLoader<'info, TraderRiskGroup>,
    #[account(mut)]
    market_product_group: AccountLoader<'info, MarketProductGroup>,
    product: AccountInfo<'info>,
    #[account(executable)]
    aaob_program: AccountInfo<'info>,
    #[account(mut)]
    orderbook: AccountInfo<'info>,
    market_signer: AccountInfo<'info>,
    #[account(mut)]
    event_queue: AccountInfo<'info>,
    #[account(mut)]
    bids: AccountInfo<'info>,
    #[account(mut)]
    asks: AccountInfo<'info>,
    system_program: Program<'info, System>,
    #[account(executable)]
    fee_model_program: AccountInfo<'info>,
    fee_model_configuration_acct: AccountInfo<'info>,
    #[account(mut)]
    trader_fee_state_acct: AccountInfo<'info>,
    #[account(mut)]
    fee_output_register: AccountInfo<'info>,
    #[account(executable)]
    risk_engine_program: AccountInfo<'info>,
    risk_model_configuration_acct: AccountInfo<'info>,
    #[account(mut)]
    risk_output_register: AccountInfo<'info>,
    #[account(mut)]
    trader_risk_state_acct: AccountInfo<'info>,
    risk_and_fee_signer: AccountInfo<'info>,
}

#[repr(C)]
#[derive(AnchorSerialize, AnchorDeserialize, PartialEq, Clone)]
pub struct ConsumeOrderbookEventsParams {
    /// The maximum number of events to consume
    pub max_iterations: u64,
}

#[derive(Accounts)]
pub struct ConsumeOrderbookEvents<'info> {
    #[account(executable)]
    aaob_program: AccountInfo<'info>,
    #[account(mut)]
    market_product_group: AccountLoader<'info, MarketProductGroup>,
    product: AccountInfo<'info>,
    market_signer: AccountInfo<'info>,
    #[account(mut)]
    orderbook: AccountInfo<'info>,
    #[account(mut)]
    event_queue: AccountInfo<'info>,
    #[account(mut, signer)]
    reward_target: AccountInfo<'info>,
    #[account(executable)]
    fee_model_program: AccountInfo<'info>,
    fee_model_configuration_acct: AccountInfo<'info>,
    #[account(mut)]
    fee_output_register: AccountInfo<'info>,
    risk_and_fee_signer: AccountInfo<'info>,
    // Remaining accounts are for risk engine
}
#[repr(C)]
#[derive(AnchorSerialize, AnchorDeserialize, PartialEq, Clone)]
pub struct CancelOrderParams {
    /// The order_id of the order to cancel. Redundancy is used here to avoid having to iterate over all
    /// open orders on chain.
    pub order_id: u128,
}

#[derive(Accounts)]
pub struct CancelOrder<'info> {
    user: Signer<'info>,
    #[account(mut)]
    trader_risk_group: AccountLoader<'info, TraderRiskGroup>,
    #[account(mut)]
    market_product_group: AccountLoader<'info, MarketProductGroup>,
    product: AccountInfo<'info>,
    #[account(executable)]
    aaob_program: AccountInfo<'info>,
    #[account(mut)]
    orderbook: AccountInfo<'info>,
    market_signer: AccountInfo<'info>,
    #[account(mut)]
    event_queue: AccountInfo<'info>,
    #[account(mut)]
    bids: AccountInfo<'info>,
    #[account(mut)]
    asks: AccountInfo<'info>,
    system_program: Program<'info, System>,
    #[account(executable)]
    risk_engine_program: AccountInfo<'info>,
    risk_model_configuration_acct: AccountInfo<'info>,
    #[account(mut)]
    risk_output_register: AccountInfo<'info>,
    #[account(mut)]
    trader_risk_state_acct: AccountInfo<'info>,
    risk_signer: AccountInfo<'info>,
    // Remaining accounts are for risk engine
}

#[repr(C)]
#[derive(AnchorSerialize, AnchorDeserialize, PartialEq, Clone)]
pub struct DepositFundsParams {
    pub quantity: Fractional,
}

#[derive(Accounts)]
pub struct DepositFunds<'info> {
    token_program: Program<'info, Token>,
    user: Signer<'info>,
    #[account(mut)]
    user_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    trader_risk_group: AccountLoader<'info, TraderRiskGroup>,
    market_product_group: AccountLoader<'info, MarketProductGroup>,
    #[account(mut)]
    market_product_group_vault: Account<'info, TokenAccount>,
}

#[repr(C)]
#[derive(AnchorSerialize, AnchorDeserialize, PartialEq, Clone)]
pub struct WithdrawFundsParams {
    pub quantity: Fractional,
}

#[derive(Accounts)]
pub struct WithdrawFunds<'info> {
    token_program: Program<'info, Token>,
    user: Signer<'info>,
    #[account(mut)]
    user_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    trader_risk_group: AccountLoader<'info, TraderRiskGroup>,
    market_product_group: AccountLoader<'info, MarketProductGroup>,
    #[account(mut)]
    market_product_group_vault: Account<'info, TokenAccount>,
    #[account(executable)]
    risk_engine_program: AccountInfo<'info>,
    risk_model_configuration_acct: AccountInfo<'info>,
    #[account(mut)]
    risk_output_register: AccountInfo<'info>,
    #[account(mut)]
    trader_risk_state_acct: AccountInfo<'info>,
    risk_signer: AccountInfo<'info>,
    // Remaining accounts are for risk engine
}

#[repr(C)]
#[derive(AnchorSerialize, AnchorDeserialize, PartialEq, Clone)]
pub struct UpdateProductFundingParams {
    pub amount: Fractional,
    pub expired: bool,
}

#[derive(Accounts)]
pub struct UpdateProductFunding<'info> {
    #[account(mut)]
    market_product_group: AccountLoader<'info, MarketProductGroup>,
    product: Signer<'info>,
}

#[derive(Accounts)]
pub struct TransferFullPosition<'info> {
    liquidator: Signer<'info>,
    #[account(mut)]
    market_product_group: AccountLoader<'info, MarketProductGroup>,
    #[account(mut)]
    liquidatee_risk_group: AccountLoader<'info, TraderRiskGroup>,
    #[account(mut)]
    liquidator_risk_group: AccountLoader<'info, TraderRiskGroup>,
    #[account(executable)]
    risk_engine_program: AccountInfo<'info>,
    risk_model_configuration_acct: AccountInfo<'info>,
    #[account(mut)]
    risk_output_register: AccountInfo<'info>,
    #[account(mut)]
    liquidator_risk_state_account_info: AccountInfo<'info>,
    #[account(mut)]
    liquidatee_risk_state_account_info: AccountInfo<'info>,
    risk_signer: AccountInfo<'info>,
    // Remaining accounts are for risk engine
}

#[repr(C)]
#[derive(AnchorSerialize, AnchorDeserialize, PartialEq, Debug, Clone)]
pub struct InitializeComboParams {
    pub name: [u8; NAME_LEN],
    // Fixed point number (32 integer bits, 32 fractional bits)
    pub tick_size: Fractional,
    pub price_offset: Fractional,
    pub base_decimals: u64,
    pub ratios: Vec<i8>,
}

#[derive(Accounts)]
pub struct InitializeCombo<'info> {
    authority: Signer<'info>,
    #[account(mut)]
    market_product_group: AccountLoader<'info, MarketProductGroup>,
    orderbook: AccountInfo<'info>,
    // Remaining accounts are for products
}

#[derive(Accounts)]
pub struct UpdateTraderFunding<'info> {
    #[account(mut)]
    market_product_group: AccountLoader<'info, MarketProductGroup>,
    #[account(mut)]
    trader_risk_group: AccountLoader<'info, TraderRiskGroup>,
}

#[repr(C)]
#[derive(AnchorSerialize, AnchorDeserialize, PartialEq, Clone)]
pub struct ClearExpiredOrderbookParams {
    pub num_orders_to_cancel: u8,
}

#[derive(Accounts)]
pub struct ClearExpiredOrderbook<'info> {
    market_product_group: AccountLoader<'info, MarketProductGroup>,
    product: AccountInfo<'info>,
    #[account(executable)]
    aaob_program: AccountInfo<'info>,
    #[account(mut)]
    orderbook: AccountInfo<'info>,
    market_signer: AccountInfo<'info>,
    #[account(mut)]
    event_queue: AccountInfo<'info>,
    #[account(mut)]
    bids: AccountInfo<'info>,
    #[account(mut)]
    asks: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct SweepFees<'info> {
    #[account(mut)]
    market_product_group: AccountLoader<'info, MarketProductGroup>,
    fee_collector: AccountInfo<'info>,
    #[account(mut)]
    market_product_group_vault: Account<'info, TokenAccount>,
    #[account(mut)]
    fee_collector_token_account: Account<'info, TokenAccount>,
    token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ChooseSuccessor<'info> {
    #[account(mut)]
    market_product_group: AccountLoader<'info, MarketProductGroup>,
    authority: Signer<'info>,
    new_authority: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct ClaimAuthority<'info> {
    #[account(mut)]
    market_product_group: AccountLoader<'info, MarketProductGroup>,
    new_authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct UpdateHealthState<'info> {
    authority: Signer<'info>,
    #[account(mut)]
    trader_risk_group: AccountLoader<'info, TraderRiskGroup>,
    #[account(mut)]
    market_product_group: AccountLoader<'info, MarketProductGroup>,
    #[account(executable)]
    risk_engine_program: AccountInfo<'info>,
    #[account(mut)]
    risk_output_register: AccountInfo<'info>,
    #[account(mut)]
    trader_risk_state_acct: AccountInfo<'info>,
}

#[repr(C)]
#[derive(AnchorSerialize, AnchorDeserialize, Debug, Clone)]
pub struct LockCollateralParams {
    pub num_products: usize,
    pub products: LockedCollateralProductIndexes,
}

#[derive(Accounts)]
pub struct LockCollateral<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut)]
    pub trader_risk_group: AccountLoader<'info, TraderRiskGroup>,
    #[account(mut)]
    pub market_product_group: AccountLoader<'info, MarketProductGroup>,
    #[account(executable)]
    fee_model_program: AccountInfo<'info>,
    fee_model_configuration_acct: AccountInfo<'info>,
    #[account(mut)]
    fee_output_register: AccountInfo<'info>,
    #[account(executable)]
    risk_engine_program: AccountInfo<'info>,
    risk_model_configuration_acct: AccountInfo<'info>,
    #[account(mut)]
    risk_output_register: AccountInfo<'info>,
    risk_and_fee_signer: AccountInfo<'info>,
    #[account(mut)]
    fee_state_acct: AccountInfo<'info>,
    #[account(mut)]
    risk_state_acct: AccountInfo<'info>,
}

// this is for convenience. this is not supposed to derive(Accounts).
pub struct LockedCollateralAccounts {
    pub fee_model_program: Pubkey,
    pub fee_model_configuration_acct: Pubkey,
    pub fee_output_register: Pubkey,
    pub risk_engine_program: Pubkey,
    pub risk_model_configuration_acct: Pubkey,
    pub risk_output_register: Pubkey,
    pub creator_trader_fee_state_acct: Pubkey,
    pub creator_trader_risk_state_acct: Pubkey,
}

#[repr(C)]
#[derive(AnchorSerialize, AnchorDeserialize, Debug, Clone)]
pub struct InitializePrintTradeParams {
    pub num_products: usize,
    pub products: PrintTradeProductIndexes,
    pub price: Fractional, // quantity of quote (e.g., USDC) per base
    pub side: Side,        // side that creator is taking
    pub operator_creator_fee_proportion: Fractional,
    pub operator_counterparty_fee_proportion: Fractional,
    pub is_operator_signer: bool,
}

#[derive(Accounts)]
pub struct InitializePrintTrade<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    pub creator: AccountInfo<'info>,
    pub counterparty: AccountInfo<'info>,
    pub operator: AccountInfo<'info>,
    #[account(mut)]
    pub market_product_group: AccountInfo<'info>,
    #[account(mut)]
    pub print_trade: AccountInfo<'info>,
    pub system_program: AccountInfo<'info>,
    pub operator_owner: Signer<'info>,
    pub seed: AccountInfo<'info>,
}

#[repr(C)]
#[derive(AnchorSerialize, AnchorDeserialize, Debug, Clone)]
pub struct SignPrintTradeParams {
    pub num_products: usize,
    pub products: PrintTradeProductIndexes,
    pub price: Fractional,
    pub side: Side,
    pub operator_creator_fee_proportion: Fractional,
    pub operator_counterparty_fee_proportion: Fractional,
    pub use_locked_collateral: bool,
}

#[derive(Accounts)]
pub struct SignPrintTrade<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut)]
    pub creator: AccountInfo<'info>,
    #[account(mut)]
    pub counterparty: AccountInfo<'info>,
    #[account(mut)]
    pub operator: AccountInfo<'info>,
    #[account(mut)]
    pub market_product_group: AccountInfo<'info>,
    #[account(mut)]
    pub print_trade: AccountInfo<'info>,
    pub system_program: AccountInfo<'info>,
    pub fee_model_program: AccountInfo<'info>,
    pub fee_model_configuration_acct: AccountInfo<'info>,
    #[account(mut)]
    pub fee_output_register: AccountInfo<'info>,
    pub risk_engine_program: AccountInfo<'info>,
    pub risk_model_configuration_acct: AccountInfo<'info>,
    #[account(mut)]
    pub risk_output_register: AccountInfo<'info>,
    pub risk_and_fee_signer: AccountInfo<'info>,
    #[account(mut)]
    pub creator_trader_fee_state_acct: AccountInfo<'info>,
    #[account(mut)]
    pub creator_trader_risk_state_acct: AccountInfo<'info>,
    #[account(mut)]
    pub counterparty_trader_fee_state_acct: AccountInfo<'info>,
    #[account(mut)]
    pub counterparty_trader_risk_state_acct: AccountInfo<'info>,
    pub seed: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct ExecutePrintTrade<'info> {
    #[account(mut)]
    pub op: Signer<'info>,
    #[account(mut)]
    pub creator: AccountInfo<'info>,
    #[account(mut)]
    pub counterparty: AccountInfo<'info>,
    #[account(mut)]
    pub operator: AccountInfo<'info>,
    #[account(mut)]
    pub market_product_group: AccountInfo<'info>,
    #[account(mut)]
    pub print_trade: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
    #[account(executable)]
    fee_model_program: AccountInfo<'info>,
    fee_model_configuration_acct: AccountInfo<'info>,
    #[account(mut)]
    fee_output_register: AccountInfo<'info>,
    #[account(executable)]
    risk_engine_program: AccountInfo<'info>,
    risk_model_configuration_acct: AccountInfo<'info>,
    #[account(mut)]
    risk_output_register: AccountInfo<'info>,
    risk_and_fee_signer: AccountInfo<'info>,
    #[account(mut)]
    creator_trader_fee_state_acct: AccountInfo<'info>,
    #[account(mut)]
    creator_trader_risk_state_acct: AccountInfo<'info>,
    #[account(mut)]
    counterparty_trader_fee_state_acct: AccountInfo<'info>,
    #[account(mut)]
    counterparty_trader_risk_state_acct: AccountInfo<'info>,
    pub seed: AccountInfo<'info>,
    #[account(mut)]
    pub execution_output: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct ClosePrintTrade<'info> {
    #[account(mut)]
    pub op: Signer<'info>,
    pub creator: AccountLoader<'info, TraderRiskGroup>, // user owns creator trg
    pub counterparty: AccountLoader<'info, TraderRiskGroup>,
    pub operator: AccountLoader<'info, TraderRiskGroup>,
    pub market_product_group: AccountLoader<'info, MarketProductGroup>,
    #[account(mut)]
    pub print_trade: AccountLoader<'info, PrintTrade>,
    pub system_program: Program<'info, System>,
    pub seed: AccountInfo<'info>,
    #[account(mut)]
    pub creator_wallet: AccountInfo<'info>,
}
