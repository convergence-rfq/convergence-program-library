///! State
use anchor_lang::prelude::*;

/// Protocol state.
#[account]
pub struct ProtocolState {
    // Protocol authority
    pub authority: Pubkey,
    // PDA bump
    pub bump: u8,
    // Fee denominator
    pub fee_denominator: u64,
    // Fee numerator
    pub fee_numerator: u64,
    // Treasury wallet
    pub treasury_wallet: Pubkey,
}

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
    /// Legs
    pub legs: [Pubkey; 10],
    /// Last look required to approve trade
    pub last_look: bool,
    /// Order amount
    pub order_amount: u64,
    /// Order type can be Buy or Sell
    pub order_type: Order,
    /// Quote escrow bump
    pub quote_escrow_bump: u8,
    /// Settled
    pub settled: bool,
    /// Creation time
    pub unix_timestamp: i64,
}

/// Leg.
#[account]
pub struct LegState {
    // Base amount
    pub base_amount: Pubkey,
    // Bump
    pub bump: u8,
    // Instrument
    //
    // TODO:
    //
    // Should instrument store additional IDs? Verify with Armani, Tommy and Norbert:
    // - Protocol integration ID
    // - Token ID
    // - ATA ID
    // - System ID
    pub instrument: Instrument,
    // Processed
    pub processed: bool,
    // RFQ
    pub rfq: Pubkey,
    // Side can be Buy or Sell
    pub side: Side,    
    // Venue
    pub venue: Venue,
}   

/// Instrument.
#[derive(AnchorSerialize, AnchorDeserialize, Copy, Clone, Debug, PartialEq, Eq)]
pub enum Instrument {
    PsyOptionsAmerican,
    PsyOptionsEuropean,
    NFT {
        // Base mint
        base_mint: Pubkey,
        // Quote mint
        quote_mint: Pubkey,
    },
    Spot {
        // Base mint
        base_mint: Pubkey,
        // Quote mint
        quote_mint: Pubkey,
    },
    Perp,
    Future,    
}

#[derive(AnchorSerialize, AnchorDeserialize, Copy, Clone, Debug, PartialEq, Eq)]
pub enum CallPut {
    Call,
    Put,
}

#[derive(AnchorSerialize, AnchorDeserialize, Copy, Clone, Debug, PartialEq, Eq)]
pub enum Quote {
    Bid,
    Ask,
}

/// Direction.
#[derive(AnchorSerialize, AnchorDeserialize, Copy, Clone, Debug, PartialEq, Eq)]
pub enum Side {
    Buy,
    Sell,
}

/// Venue.
#[derive(AnchorSerialize, AnchorDeserialize, Copy, Clone, Debug, PartialEq, Eq)]
pub enum Venue {
    PsyOptions,
    Sollar,
    Mango,
    Convergence,
}

/// PsyOptions American.
#[derive(AnchorSerialize, AnchorDeserialize, Copy, Clone, Debug, PartialEq, Eq)]
pub struct PsyOptionsAmerican {
    // Base contract size
    pub base_contract_size: u64,
    // Base mint
    pub base_mint: Pubkey,
    // Expiry
    pub expiry: i64,    
    // Call or Put
    pub call_put: CallPut,
    // Quote mint
    pub quote_mint: Pubkey,
    // Strike
    pub strike: u64,
}

/// PsyOptions European.
///
/// Different than American due to exercise enforcement.
#[derive(AnchorSerialize, AnchorDeserialize, Copy, Clone, Debug, PartialEq, Eq)]
pub struct PsyOptionsEuropean {
    // Base contract size
    pub base_contract_size: u64,
    // Base mint
    pub base_mint: Pubkey,
    // Expiry
    pub expiry: i64,    
    // Call or Put
    pub call_put: CallPut,
    // Quote mint
    pub quote_mint: Pubkey,
    // Strike
    pub strike: u64,
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
    /// Rfq
    pub rfq: Pubkey,
    /// Settled
    pub settled: bool,
    /// Creation time
    pub unix_timestamp: i64,
}

/// Order.
#[derive(AnchorSerialize, AnchorDeserialize, Copy, Clone, Debug, PartialEq, Eq)]
pub enum Order {
    Buy,
    Sell,
    TwoWay,
}
