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
    // Active
    pub active: bool,
}

/// Access manager state.
#[account]
pub struct AccessManagerState {
    // Authority
    pub authority: Pubkey,
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
    /// Order type can be Buy, Sell or TwoWay
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
pub struct RiskEngineState {
    // 
}

/// TODO: Risk Engine for Collateral Requirements
/// 
/// How do we handle quotes for multiple spots? Example:
///
/// Two-way RFQ
///
/// 2 BTC/USDT
/// 10 ETH/USDC
///
/// Risk Engine 
/// - Input should determine collateral 
///   - Input comes from risk engine as another progam
///   - Says how much collateral is needed
///
/// MVP
/// - Fully-collateralized
/// - One-way for now

/// Leg.
#[account]
pub struct LegState {
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
}   

/// Instrument.
#[derive(AnchorSerialize, AnchorDeserialize, Copy, Clone, Debug, PartialEq, Eq)]
pub enum Instrument {
    PsyOptionsAmerican {
        // Base amount
        base_amount: u64,       
        // Base contract size
        base_contract_size: u64,
        // Base mint
        base_mint: Pubkey,
        // Expiry
        expiry: i64,    
        // Option type
        option_type: OptionType,
        // Quote mint
        quote_mint: Pubkey,
        // Strike
        strike: u64,
    },
    PsyOptionsEuropean {        
        // Base amount
        base_amount: u64,
        // Base contract size
        base_contract_size: u64,
        // Base mint
        base_mint: Pubkey,
        // Expiry
        expiry: i64,    
        // Call or Put
        option_type: OptionType,
        // Quote mint
        quote_mint: Pubkey,
        // Strike
        strike: u64,
    },
    NFT {
        // Base mint
        base_mint: Pubkey,
        // Quote mint
        quote_mint: Pubkey,
    },
    Spot {        
        // Base amount
        base_amount: Option<u64>,
        // Base mint
        base_mint: Pubkey,
        // Quote amount
        quote_amount: Option<u64>,
        // Quote mint
        quote_mint: Pubkey,
    },
    MangoPerp {
        // Base mint
        base_mint: Pubkey,
        // Quote mint
        quote_mint: Pubkey,
    },
    CypherFuture {
        // Base mint
        base_mint: Pubkey,
        // Quote mint
        quote_mint: Pubkey,
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Copy, Clone, Debug, PartialEq, Eq)]
pub enum OptionType {
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
