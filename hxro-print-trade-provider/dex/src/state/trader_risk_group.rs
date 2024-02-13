use agnostic_orderbook::{
    critbit::Slab,
    state::{get_side_from_order_id, Side},
};
use anchor_lang::{
    prelude::*,
    solana_program::{
        clock::UnixTimestamp, msg, program_error::ProgramError, program_pack::IsInitialized,
        pubkey::Pubkey,
    },
};

use crate::{
    state::{
        constants::{
            HEALTH_BUFFER_LEN, MAX_COMBOS, MAX_OPEN_ORDERS_PER_POSITION, MAX_OUTRIGHTS,
            MAX_TRADER_POSITIONS,
        },
        enums::AccountTag,
        market_product_group::MarketProductGroup,
        open_orders::OpenOrders,
        products::{Combo, Product},
    },
    utils::numeric::{Fractional, ZERO_FRAC},
};

#[account(zero_copy(unsafe))]
pub struct TraderRiskGroup {
    pub tag: AccountTag,
    pub market_product_group: Pubkey,
    pub owner: Pubkey,
    // Default value is 255 (max int) which corresponds to no position for the product at the corresponding index
    pub active_products: [u8; MAX_OUTRIGHTS],
    pub total_deposited: Fractional,
    pub total_withdrawn: Fractional,
    // Treat cash separately since it is collateral (unless we eventually support spot)
    pub cash_balance: Fractional,
    // Keep track of pending fills for risk calculations (only for takers)
    pub pending_cash_balance: Fractional,
    // Keep track of pending taker fees to be collected in consume_events
    pub pending_fees: Fractional,
    pub valid_until: UnixTimestamp,
    pub maker_fee_bps: i32,
    pub taker_fee_bps: i32,
    pub trader_positions: [TraderPosition; MAX_TRADER_POSITIONS],
    pub risk_state_account: Pubkey,
    pub fee_state_account: Pubkey,
    pub locked_collateral: [LockedCollateral; MAX_TRADER_POSITIONS], // in one-to-one mapping with trader_positions
    pub notional_maker_volume: Fractional,
    pub notional_taker_volume: Fractional,
    pub referred_takers_notional_volume: Fractional,
    /// referral_fees is not necessarily REFERRER_FEES_PROPORTION * referred_takers_notional_volume,
    /// because combo volume has only collects 1/8th the fees as outright volume
    pub referral_fees: Fractional,
    // unused
    pub allocated_for_future_use: [u8; 256],
    pub open_orders: OpenOrders,
}

impl IsInitialized for TraderRiskGroup {
    fn is_initialized(&self) -> bool {
        unimplemented!()
    }
}

impl Default for TraderRiskGroup {
    fn default() -> Self {
        unsafe { std::mem::zeroed() }
    }
}
#[zero_copy]
#[derive(Debug)]
pub struct TraderPosition {
    pub tag: AccountTag,
    pub product_key: Pubkey,
    pub position: Fractional,
    pub pending_position: Fractional,
    pub product_index: usize,
    pub last_cum_funding_snapshot: Fractional,
    pub last_social_loss_snapshot: Fractional,
}
impl IsInitialized for TraderPosition {
    fn is_initialized(&self) -> bool {
        self.tag == AccountTag::TraderPosition
    }
}
impl TraderPosition {
    pub fn is_active(&self) -> bool {
        self.position != ZERO_FRAC || self.pending_position != ZERO_FRAC
    }
}

/// there is one LockedCollateral for each product; the array is in one-to-one mapping with trader_positions
#[zero_copy]
#[derive(Debug)]
pub struct LockedCollateral {
    pub tag: AccountTag,
    pub ask_qty: Fractional,
    pub bid_qty: Fractional,
}
impl IsInitialized for LockedCollateral {
    fn is_initialized(&self) -> bool {
        self.tag == AccountTag::LockedCollateral
    }
}

#[account(zero_copy)]
#[derive(AnchorSerialize, AnchorDeserialize, Default, Debug)]
pub struct LockedCollateralProductIndex {
    pub product_index: usize,
    pub size: Fractional, // quantity of base (e.g. BTCUSD contract)
}

// #[derive(AnchorSerialize, AnchorDeserialize, Default, Debug)] not allowed on arrays
pub type LockedCollateralProductIndexes =
    [LockedCollateralProductIndex; LockedCollateral::MAX_PRODUCTS_PER_LOCK_IX];

impl LockedCollateral {
    pub const MAX_PRODUCTS_PER_LOCK_IX: usize = 6;
    pub fn default() -> Self {
        LockedCollateral {
            tag: AccountTag::Uninitialized,
            ask_qty: ZERO_FRAC,
            bid_qty: ZERO_FRAC,
        }
    }
}
