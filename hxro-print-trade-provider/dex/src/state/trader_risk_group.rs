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
    error::{DexError, DomainOrProgramError, DomainOrProgramResult},
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
    utils::{
        loadable::Loadable,
        numeric::{Fractional, ZERO_FRAC},
        validation::assert,
    },
};

#[account(zero_copy)]
/// State account corresponding to a trader on a given market product group
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
    // Densely packed linked list of open orders
    pub client_order_id: u128,
    pub open_orders: OpenOrders,
    pub locked_collateral: [LockedCollateral; MAX_TRADER_POSITIONS], // in one-to-one mapping with trader_positions
}

impl IsInitialized for TraderRiskGroup {
    fn is_initialized(&self) -> bool {
        self.tag == AccountTag::TraderRiskGroup
    }
}

impl Default for TraderRiskGroup {
    fn default() -> Self {
        unsafe { std::mem::zeroed() }
    }
}

impl TraderRiskGroup {
    pub fn find_position_index(&self, position_pk: &Pubkey) -> Option<usize> {
        self.trader_positions
            .iter()
            .position(|pk| &pk.product_key == position_pk)
    }

    pub fn apply_funding(
        &mut self,
        market_product_group: &mut MarketProductGroup,
        trader_position_index: usize,
    ) -> DomainOrProgramResult {
        let trader_position = &mut self.trader_positions[trader_position_index];
        let product_index = trader_position.product_index;
        let market_product =
            market_product_group.market_products[product_index].try_to_outright_mut()?;
        // if market_product.is_uninitialized() {
        //     msg!(
        //                 "Temporary solution: clearing TraderPosition and OpenOrders for product with index {}",
        //                 &product_index
        //             );
        //     let product_key = trader_position.product_key;
        //     self.open_orders.clear(product_index)?;
        //     for (_, combo) in market_product_group.active_combos() {
        //         if combo.has_leg(product_key) {
        //             return Err(DexError::MarketStillActive.into());
        //         }
        //     }
        //     self.clear(product_key)?;
        //     return Ok(());
        // }
        let funding_updated =
            trader_position.last_cum_funding_snapshot != market_product.cum_funding_per_share;
        let social_loss_updated =
            trader_position.last_social_loss_snapshot != market_product.cum_social_loss_per_share;
        // if funding_updated || social_loss_updated {
        //     if !market_product.is_fully_expired() {
        //         let amount_owed: Fractional = market_product
        //             .cum_funding_per_share
        //             .checked_sub(trader_position.last_cum_funding_snapshot)?
        //             .checked_add(trader_position.last_social_loss_snapshot)?
        //             .checked_sub(market_product.cum_social_loss_per_share)?
        //             .checked_mul(trader_position.position)?;
        //         self.cash_balance = self.cash_balance.checked_add(amount_owed)?;
        //         trader_position.last_cum_funding_snapshot = market_product.cum_funding_per_share;
        //         trader_position.last_social_loss_snapshot =
        //             market_product.cum_social_loss_per_share;
        //     }
        // }
        // if market_product.is_expired_or_expiring() {
        //     if trader_position.position > ZERO_FRAC {
        //         market_product.open_long_interest -= trader_position.position;
        //         msg!(
        //             "set open long interest to {}",
        //             &market_product.open_long_interest
        //         );
        //     } else {
        //         market_product.open_short_interest += trader_position.position;
        //         msg!(
        //             "set open short interest to {}",
        //             &market_product.open_short_interest
        //         );
        //     }
        //     trader_position.position = ZERO_FRAC;
        // }
        // if market_product.is_fully_expired() {
        //     let product_key = trader_position.product_key;
        //     self.open_orders.clear(product_index)?;
        //     for (combo_index, combo) in market_product_group.active_combos() {
        //         if combo.has_leg(product_key) {
        //             self.open_orders.clear(combo_index)?;
        //         }
        //     }
        //     self.clear(product_key)?;
        // }
        Ok(())
    }

    pub fn compute_unsettled_funding(
        &self,
        market_product_group: &MarketProductGroup,
    ) -> std::result::Result<Fractional, DomainOrProgramError> {
        let mut funding = ZERO_FRAC;
        for trader_index in 0..self.trader_positions.len() {
            let position = self.trader_positions[trader_index];
            if !position.is_initialized() {
                continue;
            }
            let idx = position.product_index;
            let market_product = market_product_group.market_products[idx].try_to_outright()?;
            let amount_owed: Fractional = market_product
                .cum_funding_per_share
                .checked_sub(position.last_cum_funding_snapshot)?
                .checked_add(position.last_social_loss_snapshot)?
                .checked_sub(market_product.cum_social_loss_per_share)?
                .checked_mul(position.position)?;
            funding = funding.checked_add(amount_owed)?;
        }
        Ok(funding)
    }

    pub fn apply_all_funding(
        &mut self,
        market_product_group: &mut MarketProductGroup,
    ) -> DomainOrProgramResult {
        for trader_index in 0..self.trader_positions.len() {
            if !self.trader_positions[trader_index].is_initialized() {
                continue;
            }
            self.apply_funding(market_product_group, trader_index)?;
        }
        Ok(())
    }

    pub fn add_open_order(
        &mut self,
        index: usize,
        order_id: u128,
        qty: u64,
    ) -> DomainOrProgramResult {
        // TODO: consider reinstating is_active check at some point
        let num_open_orders = self.open_orders.products[index].num_open_orders;

        assert(
            num_open_orders < MAX_OPEN_ORDERS_PER_POSITION,
            DexError::TooManyOpenOrdersError,
        )?;

        self.open_orders.products[index].num_open_orders += 1;
        self.open_orders.total_open_orders += 1;
        self.open_orders
            .add_open_order(index, order_id, qty)
            .map_err(Into::into)
    }

    pub fn remove_open_order(&mut self, index: usize, order_id: u128) -> DomainOrProgramResult {
        // TODO: consider reinstating is_active check at some point
        let num_open_orders = self.open_orders.products[index].num_open_orders;
        assert(num_open_orders > 0, DexError::NoMoreOpenOrdersError)?;

        self.open_orders.products[index].num_open_orders -= 1;
        msg!(
            "Remaining open orders {}",
            self.open_orders.products[index].num_open_orders
        );
        self.open_orders.total_open_orders = self.open_orders.total_open_orders.saturating_sub(1);
        self.open_orders
            .remove_open_order(index, order_id)
            .map_err(Into::into)
    }

    pub fn remove_open_order_by_index(
        &mut self,
        product_index: usize,
        order_index: usize,
        order_id: u128,
    ) -> DomainOrProgramResult {
        // TODO: consider reinstating is_active check at some point
        let num_open_orders = self.open_orders.products[product_index].num_open_orders;
        assert(num_open_orders > 0, DexError::NoMoreOpenOrdersError)?;

        self.open_orders.products[product_index].num_open_orders -= 1;
        msg!(
            "Remaining open orders {}",
            self.open_orders.products[product_index].num_open_orders
        );
        self.open_orders.total_open_orders = self.open_orders.total_open_orders.saturating_sub(1);
        self.open_orders
            .remove_open_order_by_index(product_index, order_index, order_id)
            .map_err(Into::into)
    }

    /// begin_to_cancel_open_order begins the open order cancel process by
    /// decrementing the open order's quantity from product.open_*_qty.
    /// This satisfies our objective of not allowing the timing of the
    /// event queue to affect risk profiles. Additionally, it maintains the
    /// constraint that orders are not removed from a TRG until all relevant
    /// events are processed.
    ///
    /// CAVEATS AND IMPORTANT ASSUMPTIONS:
    ///
    /// 1. We assume that it has already been verified that the relevant open
    /// order exists on the given TRG.
    pub fn begin_to_cancel_open_order(
        &mut self,
        product_index: usize,
        market_product: &Product,
        bids: &Slab,
        asks: &Slab,
        order_id: u128,
    ) -> DomainOrProgramResult {
        let side = get_side_from_order_id(order_id);

        // I couldn't figure out how to get the compiler to do this:
        //
        // let slab = match side {
        //     ...
        // };
        // let aaob_base_qty = slab
        //                         .find_by_key(...)
        //                         .and_then(...)
        //                         ...;
        //
        // due to some lifetime subtyping/variance error,
        // so instead we duplicate the .find_by_key(...).and_then(...)... calls.

        // let aaob_base_qty = match side {
        //     Side::Bid => bids
        //         .find_by_key(order_id)
        //         .and_then(|handle| bids.get_node(handle))
        //         .and_then(|node| node.as_leaf())
        //         .map(|leaf| leaf.base_quantity)
        //         .ok_or(DexError::FailedToGetOrderQuantity)?,
        //     Side::Ask => asks
        //         .find_by_key(order_id)
        //         .and_then(|handle| asks.get_node(handle))
        //         .and_then(|node| node.as_leaf())
        //         .map(|leaf| leaf.base_quantity)
        //         .ok_or(DexError::FailedToGetOrderQuantity)?,
        // };
        // let true_order_qty_dex =
        //     Fractional::new(aaob_base_qty as i64, market_product.base_decimals);
        // self.open_orders
        //     .begin_to_cancel_open_order(product_index, side, true_order_qty_dex)
        //     .map_err(Into::into)
        Ok(())
    }

    pub fn activate_if_uninitialized<'a>(
        &mut self,
        product_index: usize,
        product_key: &Pubkey,
        funding: Fractional,
        social_loss: Fractional,
        market_product_group: &mut MarketProductGroup,
    ) -> std::result::Result<usize, DomainOrProgramError> {
        let position_index = self.get_position_index(product_index)?;
        if position_index != u8::MAX {
            return Ok(position_index as usize);
        }
        let has_uninitialized_positions = self.trader_positions.iter().any(|p| !p.is_initialized());
        let combos_with_open_orders: Vec<(usize, &Combo)> = if !has_uninitialized_positions {
            market_product_group
                .active_combos()
                .filter(|(idx, _)| self.open_orders.products[*idx].num_open_orders > 0)
                .collect::<Vec<_>>()
        } else {
            vec![]
        };

        // for (trader_position_index, trader_position) in self.trader_positions.iter_mut().enumerate()
        // {
        //     let locked_collateral = &self.locked_collateral[trader_position_index];
        //     msg!(
        //         "{} {} {}",
        //         trader_position_index,
        //         trader_position.is_initialized(),
        //         locked_collateral.is_initialized()
        //     );
        // }
        for (trader_position_index, trader_position) in self.trader_positions.iter_mut().enumerate()
        {
            if trader_position.is_initialized() {
                continue;
            }
            self.active_products[product_index] = trader_position_index as u8;
            trader_position.tag = AccountTag::TraderPosition;
            trader_position.product_key = *product_key;
            trader_position.product_index = product_index;
            trader_position.last_cum_funding_snapshot = funding;
            trader_position.last_social_loss_snapshot = social_loss;
            let locked_collateral = &mut self.locked_collateral[trader_position_index];
            if locked_collateral.is_initialized() {
                return Err(ProgramError::InvalidAccountData.into()); // todo make specific error for this
            }
            locked_collateral.tag = AccountTag::LockedCollateral;
            locked_collateral.ask_qty = ZERO_FRAC;
            // locked_collateral.bid_qty = ZERO_FRAC;
            // market_product_group.market_products[product_index]
            //     .try_to_outright_mut()?
            //     .num_risk_state_accounts += 1;
            return Ok(trader_position_index);
        }
        msg!("All trader positions are occupied");
        Err(ProgramError::InvalidAccountData.into())
    }

    pub fn adjust_book_qty(
        &mut self,
        product_index: usize,
        qty: Fractional,
        side: Side,
    ) -> DomainOrProgramResult {
        let open_orders = &mut self.open_orders.products[product_index];

        match side {
            Side::Bid => {
                open_orders.bid_qty_in_book = open_orders.bid_qty_in_book.checked_add(qty)?
            }
            Side::Ask => {
                open_orders.ask_qty_in_book = open_orders.ask_qty_in_book.checked_add(qty)?
            }
        }
        Ok(())
    }

    // reset_book_qty was used to fix bad state in trgs caused by not launching DEX and AAOB atomically
    pub fn reset_book_qty(&mut self, product_index: usize) -> DomainOrProgramResult {
        let open_orders = &mut self.open_orders.products[product_index];
        // assert(open_orders.num_open_orders == 0, DexError::ContractIsActive)?;
        open_orders.bid_qty_in_book = ZERO_FRAC;
        open_orders.ask_qty_in_book = ZERO_FRAC;
        Ok(())
    }

    pub fn decrement_book_size(
        &mut self,
        product_index: usize,
        side: Side,
        qty: Fractional,
    ) -> DomainOrProgramResult {
        let open_orders = &mut self.open_orders.products[product_index];

        match side {
            Side::Bid => {
                open_orders.bid_qty_in_book = open_orders.bid_qty_in_book.checked_sub(qty)?
            }
            Side::Ask => {
                open_orders.ask_qty_in_book = open_orders.ask_qty_in_book.checked_sub(qty)?
            }
        }
        Ok(())
    }

    pub fn decrement_order_size_by_index(
        &mut self,
        order_index: usize,
        qty: u64,
    ) -> DomainOrProgramResult {
        self.open_orders
            .decrement_order_size_by_index(order_index, qty)
    }

    pub fn decrement_order_size(
        &mut self,
        product_index: usize,
        order_id: u128,
        qty: u64,
    ) -> DomainOrProgramResult {
        self.open_orders
            .decrement_order_size(product_index, order_id, qty)
    }

    pub fn is_active_product(
        &self,
        index: usize,
    ) -> std::result::Result<bool, DomainOrProgramError> {
        if !self.is_initialized() {
            msg!("TraderRiskGroup is not initialized");
            return Err(ProgramError::InvalidAccountData.into());
        }
        if index >= MAX_OUTRIGHTS {
            msg!(
                "Product index is out of bounds. index: {}, max products: {}",
                index,
                MAX_OUTRIGHTS
            );
            return Err(ProgramError::InvalidAccountData.into());
        }
        Ok(self.active_products[index] != u8::MAX)
    }

    // maps product index in mpg to trader position index
    pub fn get_position_index(
        &self,
        index: usize,
    ) -> std::result::Result<u8, DomainOrProgramError> {
        if !self.is_initialized() {
            msg!("TraderRiskGroup is not initialized");
            return Err(ProgramError::InvalidAccountData.into());
        }
        if index >= MAX_OUTRIGHTS {
            msg!(
                "Product index is out of bounds. index: {}, max products: {}",
                index,
                MAX_OUTRIGHTS
            );
            return Err(ProgramError::InvalidAccountData.into());
        }
        Ok(self.active_products[index])
    }

    pub fn clear(&mut self, product_key: Pubkey) -> DomainOrProgramResult {
        let trader_position_index = match self.find_position_index(&product_key) {
            Some(i) => i,
            None => {
                return Err(ProgramError::InvalidAccountData.into());
            }
        };
        let trader_position = &mut self.trader_positions[trader_position_index];
        self.active_products[trader_position.product_index] = u8::max_value();
        trader_position.tag = AccountTag::Uninitialized;
        // trader_position.product_key = Pubkey::default(); // The reason we don't zero this is for the risk engine.
        trader_position.position = ZERO_FRAC;
        trader_position.pending_position = ZERO_FRAC;
        trader_position.product_index = 0;
        trader_position.last_cum_funding_snapshot = ZERO_FRAC;
        trader_position.last_social_loss_snapshot = ZERO_FRAC;
        let locked_collateral = &mut self.locked_collateral[trader_position_index]; // use trader_position_index because one-to-one
        locked_collateral.tag = AccountTag::Uninitialized;
        locked_collateral.ask_qty = ZERO_FRAC;
        locked_collateral.bid_qty = ZERO_FRAC;
        Ok(())
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
