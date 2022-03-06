use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount},
};
declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod rfq {
    use super::*;
    /// Initializes protocol.
    ///
    /// fee_denominator Fee denominator
    /// fee_numerator Fee numerator
    /// ctx Accounts context
    pub fn initialize(
        ctx: Context<Initialize>,
        fee_denominator: u64,
        fee_numerator: u64,
    ) -> ProgramResult {
        let protocol = &mut ctx.accounts.protocol;
        protocol.access_manager_count = 0;
        protocol.rfq_count = 0;
        protocol.authority = ctx.accounts.authority.key();
        protocol.fee_denominator = fee_denominator;
        protocol.fee_numerator = fee_numerator;
        Ok(())
    }

    /// a PDA is the authority a given limit order book
    /// a PDA is the authority for a given RFQ state
    /// when limit order is placed, it gets transferred to an Escrow-style PDA, and when that order is matched, the PDA transfers tokens
    /// limit order book is 3 vectors: bids, asks, market

    pub fn initialize_RFQ(
        ctx: Context<InitializeRFQ>,
        action: bool, //buy or sell
        instrument: u8, // Token, Future, Option, may not be needed
        rfq_expiry: i64, // when this RFQ timer expires
        strike: u64, // if an option, else inert
        ratio: u8, // 1, inert for now, will be relevant for multi leg
        n_of_legs: u8, // inert for now
    ) -> ProgramResult {
        let rfq_state = &mut ctx.accounts.rfq_state;
        rfq_state.action = action; //*ctx.accounts.action.to_account_info().key;
        rfq_state.instrument = instrument;
        rfq_state.rfq_expiry = rfq_expiry;
        rfq_state.strike = strike;
        rfq_state.ratio = ratio;
        rfq_state.n_of_legs = n_of_legs;

        let order_book_state = &mut ctx.accounts.order_book_state;
        order_book_state.bids = vec![];
        order_book_state.asks = vec![];

        Ok(())
    }

    pub fn place_limit_order(
        ctx: Context<PlaceLimitOrder>,
        action: bool,
        price: u64,
    ) -> ProgramResult {
        let rfq_state = &mut ctx.accounts.rfq_state;
        let order_book_state = &mut ctx.accounts.order_book_state;
        let mut bids = order_book_state.bids.clone();
        let mut asks = order_book_state.asks.clone();

        if action == true {
            bids.push(price);
            bids.sort();
        } else {
            asks.push(price);
            asks.sort();
        }

        order_book_state.bids = bids;
        order_book_state.asks = asks;

        Ok(())
    }

    pub fn place_market_order(ctx: Context<PlaceLimitOrder>) -> ProgramResult { Ok(()) }
    pub fn cancel_limit_order(ctx: Context<PlaceLimitOrder>) -> ProgramResult { Ok(()) }
    pub fn cancel_market_order(ctx: Context<PlaceLimitOrder>) -> ProgramResult { Ok(()) }
    pub fn cancel_all_orders(ctx: Context<PlaceLimitOrder>) -> ProgramResult { Ok(()) }
    pub fn settle(ctx: Context<PlaceLimitOrder>) -> ProgramResult { Ok(()) }
}

/// TBD: global state variables
#[derive(Accounts)]
pub struct Initialize<'info> {
    pub authority: Signer<'info>,
    #[account(
        init,
        payer = authority,
        seeds = [b"convergence_rfq"],
        space = 8 + 32 + 8 + 8 + 8 + 8,
        bump
    )]
    pub protocol: Account<'info, GlobalState>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitializeRFQ<'info> {
    pub authority: Signer<'info>,
    
    // tokens
    //pub asset_token: Account<'info, TokenAccount>,
    //pub quote_token: Account<'info, TokenAccount>,

    #[account(
        init,
        payer = authority,
        seeds = [b"rfq_state"],
        space = 1024,
        bump
    )]
    pub rfq_state: Account<'info, RFQState>,
    #[account(
        init,
        payer = authority,
        seeds = [b"order_book_state"],
        space = 1024,
        bump
    )]
    pub order_book_state : Account<'info, OrderBookState>,
    #[account(
        init,
        payer = authority,
        seeds = [b"convergence_rfq"],
        space = 8 + 32 + 8 + 8 + 8 + 8,
        bump
    )]
    pub global_state: Account<'info, GlobalState>,
    //
    // programs
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}


#[derive(Accounts)]
pub struct PlaceLimitOrder<'info> {
    pub authority: Signer<'info>,
    #[account(
        init,
        payer = authority,
        seeds = [b"rfq_state"],
        space = 1024,
        bump
    )]
    pub rfq_state: Account<'info, RFQState>,
    #[account(
        init,
        payer = authority,
        seeds = [b"order_book_state"],
        space = 1024,
        bump
    )]
    pub order_book_state: Account<'info, OrderBookState>,
    
    pub system_program: Program<'info, System>,
}

/// holds state of an RFQ, TODO: add internal order book logic
#[account]
pub struct RFQState { 
    pub action: bool,
    pub instrument: u8,
    pub rfq_expiry: i64,
    pub expiry: i64,
    pub strike: u64,
    pub ratio: u8,
    pub n_of_legs: u8,
    pub best_bid: u64,
    pub best_offer: u64,
}

#[account]
pub struct OrderBookState { 
    pub bids: Vec<u64>,
    pub asks: Vec<u64>,
    // rfq_state: RFQState,
}

/// global state for RFQ system
#[account]
pub struct GlobalState {
    pub rfq_count: u64, // ? for our indexooors
    pub access_manager_count: u64,
    pub authority: Pubkey,
    pub fee_denominator: u64,
    pub fee_numerator: u64,
}


