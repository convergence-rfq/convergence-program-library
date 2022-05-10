//! State
use anchor_lang::prelude::*;

/// Access manager state.
#[account]
pub struct AccessManagerState {
    // Authority
    pub authority: Pubkey,
    // Id
    pub id: u64,
    // Wallets
    pub wallets: [Pubkey; 25],
}

/// RFQ state.
#[account]
pub struct RfqState {
    /// Optional access manager
    pub access_manager: Option<Pubkey>,
    /// Last look approved
    pub approved: Option<bool>,
    /// Asset escrow bump
    pub asset_escrow_bump: u8,
    /// Asset mint
    pub asset_mint: Pubkey,
    /// Authority
    pub authority: Pubkey,
    /// Best ask amount
    pub best_ask_amount: Option<u64>,
    /// Best bid amount
    pub best_bid_amount: Option<u64>,
    /// Best ask amount
    pub best_ask_address: Option<Pubkey>,
    /// Best bid amount
    pub best_bid_address: Option<Pubkey>,
    /// PDA bump
    pub bump: u8,
    /// Canceled
    pub canceled: bool,
    /// Confirmed
    pub confirmed: bool,
    /// Expiry time
    pub expiry: i64,
    /// Incremental integer id
    pub id: u64,
    /// Legs
    pub legs: Vec<Leg>,
    /// Last look required to approve trade
    pub last_look: bool,
    /// Order amount
    pub order_amount: u64,
    /// Order type
    pub order_type: Order,
    /// Quote escrow bump
    pub quote_escrow_bump: u8,
    /// Quote mint
    pub quote_mint: Pubkey,
    /// Response count
    pub response_count: u64,
    /// Settled
    pub settled: bool,
    /// Creation time
    pub unix_timestamp: i64,
}

/// Protocol state.
#[account]
pub struct ProtocolState {
    // Access manager count
    pub access_manager_count: u64,
    // Protocol authority
    pub authority: Pubkey,
    // PDA bump
    pub bump: u8,
    // Fee denominator
    pub fee_denominator: u64,
    // Fee numerator
    pub fee_numerator: u64,
    // RFQ count
    pub rfq_count: u64,
    // Treasury wallet
    pub treasury_wallet: Pubkey,
}

/// Order state.
#[account]
pub struct OrderState {
    // Optional ask
    pub ask: Option<u64>,
    // Order ask confirmed
    pub ask_confirmed: bool,
    // Order athority
    pub authority: Pubkey,
    // Optional bid
    pub bid: Option<u64>,
    // Order bid confirmed
    pub bid_confirmed: bool,
    // PDA bump
    pub bump: u8,
    /// Collateral returned
    pub collateral_returned: bool,
    // Confirmed quote
    pub confirmed_quote: Option<Quote>,
    // Order id
    pub id: u64,
    /// Rfq
    pub rfq: Pubkey,
    /// Settled
    pub settled: bool,
    /// Creation time
    pub unix_timestamp: i64,
}

/// Instrument.
#[derive(AnchorSerialize, AnchorDeserialize, Copy, Clone, Debug, PartialEq, Eq)]
pub enum Instrument {
    Call,
    Future,
    Put,
    Spot,
}

/// Venue.
#[derive(AnchorSerialize, AnchorDeserialize, Copy, Clone, Debug, PartialEq, Eq)]
pub enum Venue {
    Convergence,
    PsyOptions,
    Sollar,
}

/// Leg.
#[derive(AnchorSerialize, AnchorDeserialize, Copy, Clone, Debug, PartialEq, Eq)]
pub struct Leg {
    // Instrument
    instrument: Instrument,
    // Venue
    venue: Venue,
    // Amount
    amount: u64,
}

/// Quote.
#[derive(AnchorSerialize, AnchorDeserialize, Copy, Clone, Debug, PartialEq, Eq)]
pub enum Quote {
    Bid,
    Ask,
}

/// Order.
#[derive(AnchorSerialize, AnchorDeserialize, Copy, Clone, Debug, PartialEq, Eq)]
pub enum Order {
    Buy,
    Sell,
    TwoWay,
}
