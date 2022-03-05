use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount},
};
declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod rfq {
    use super::*;
    pub fn initialize(ctx: Context<Initialize>) -> ProgramResult {
        Ok(())
    }

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
        
        Ok(())
    }

    pub fn place_limit_order(
        ctx: Context<PlaceLimitOrder>,
        action: bool,
        price: u64,
    ) -> ProgramResult {

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
    pub state: Account<'info, State>,
}

#[derive(Accounts)]
pub struct PlaceLimitOrder<'info> {
    pub authority: Signer<'info>,
    pub rfq_state: Account<'info, RFQState>,
    pub order_book: Account<'info, OrderBook>
}

#[derive(Accounts)]
#[instruction(
    action: bool, //buy or sell
    instrument: u8, // Token, Future, Option, may not be needed
    rfq_expiry: i64, // when this RFQ timer expires
    strike: u64, // if an option, else inert
    ratio: u8, // 1, inert for now, will be relevant for multi leg
    n_of_legs: u8, // inert for now
)]
pub struct InitializeRFQ<'info> {
    pub authority: Signer<'info>,
    
    pub token: Account<'info, TokenAccount>,
    pub quote_token: Account<'info, TokenAccount>,
    pub rfq_state: Account<'info, RFQState>,
    pub global_state: Account<'info, State>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}

/// holds state of an RFQ, TODO: add internal order book logic
#[account]
pub struct RFQState { 
    pub action: bool,
    pub instrument: u8,
    pub rfq_expiry: i64,
    pub strike: u64,
    pub ratio: u8,
    pub n_of_legs: u8,
    pub best_offer: u64,
    pub best_bid: u64,
}

#[account]
pub struct OrderBook {
}

/// global state for RFQ system
#[account]
pub struct State { }


