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

    pub fn initialize_rfq(
        ctx: Context<InitializeRfq>,
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

    /// 1. authorityAssetToken gets transfers ownership of token into escrow PDA
    /// 2. limit price gets recorded in either asks or bids vector
    pub fn place_limit_order(
        ctx: Context<PlaceLimitOrder>,
        action: bool,
        price: u64,
        amount: u64,
    ) -> ProgramResult {
        
        let rfq_state = &mut ctx.accounts.rfq_state;
        
        // need to tie order book state with wallet signers for each pledged bid -> escrow?

        let order_book_state = &mut ctx.accounts.order_book_state;
        
        let mut bid_signers = order_book_state.bid_signers.clone();
        let mut ask_signers = order_book_state.ask_signers.clone();
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
        
        anchor_spl::token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::Transfer {
                    from: ctx.accounts.asset_token.to_account_info(),
                    to: ctx.accounts.escrow_token.to_account_info(),
                    authority: ctx.accounts.authority.to_account_info(),
                },
            ),
            amount,
        )?;

        Ok(())
    }

    const ESCROW_SEED: &[u8] = b"escrow_seed";
    /// escrow PDA transfers token back to wallet 
    /// removes corresponding limit price from bids or asks
    pub fn cancel_limit_order(
        ctx: Context<CancelLimitOrder>,
        action: bool,
        price: u64,
        amount: u64,
    ) -> ProgramResult {
        let (_pda, bump) = Pubkey::find_program_address(&[ESCROW_SEED], ctx.program_id);
        //let signer_seeds = &[&ESCROW_SEED[..], &[bump]];

        anchor_spl::token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::Transfer {
                    from: ctx.accounts.escrow_token.to_account_info(),
                    to: ctx.accounts.asset_token.to_account_info(),
                    authority: ctx.accounts.escrow_token.to_account_info(),
                },
                &[&[&ESCROW_SEED, &[bump]]],
            ),
            amount,
        )?;
        
        Ok(())
    }
    //pub fn place_market_order()

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
pub struct InitializeRfq<'info> {
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
    pub rfq_state: Account<'info, RfqState>,
    #[account(
        init,
        payer = authority,
        seeds = [b"order_book_state"],
        space = 1024,
        bump
    )]
    pub order_book_state : Account<'info, OrderBookState>,
    
    // programs
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}


#[derive(Accounts)]
pub struct PlaceLimitOrder<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(
        init_if_needed,
        payer = authority,
        seeds = [b"rfq_state"],
        space = 1024,
        bump
    )]
    pub rfq_state: Account<'info, RfqState>,
    #[account(
        //init_if_needed,
        mut,
        seeds = [b"order_book_state"],
        //space = 1024,
        bump
    )]
    pub order_book_state: Account<'info, OrderBookState>,
    
    #[account(mut)]
    pub asset_token: Account<'info, TokenAccount>,
    
    #[account(
        init_if_needed,
        payer = authority,
        seeds = [b"escrow_token"],
        bump,
        token::mint = asset_mint,
        token::authority = escrow_token,
    )]
    pub escrow_token: Account<'info, TokenAccount>, // this PDA will be an authority for escrow with token pledged by wallet
    pub asset_mint: Account<'info, Mint>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}


#[derive(Accounts)]
pub struct CancelLimitOrder<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        //init_if_needed,
        mut,
        seeds = [b"order_book_state"],
        //space = 1024,
        bump
    )]
    pub order_book_state: Account<'info, OrderBookState>,

    #[account(mut)]
    pub asset_token: Account<'info, TokenAccount>,
    
    #[account(
        init_if_needed,
        payer = authority,
        seeds = [b"escrow_token"],
        bump,
        token::mint = asset_mint,
        token::authority = escrow_token,
    )]
    pub escrow_token: Account<'info, TokenAccount>, // this PDA will be an authority for escrow with token pledged by wallet
    pub asset_mint: Account<'info, Mint>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}


/// holds state of a given RFQ
#[account]
pub struct RfqState { 
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

// holds state of an order book tied to an RFQ
#[account]
pub struct OrderBookState { 
    pub bids: Vec<u64>,
    pub asks: Vec<u64>,
    pub bid_signers: Vec<u64>,
    pub ask_signers: Vec<u64>,
    // rfq_state: RfqState,
}

/// global state for the entire RFQ system
#[account]
pub struct GlobalState {
    pub rfq_count: u64, // ? for our indexooors
    pub access_manager_count: u64,
    pub authority: Pubkey,
    pub fee_denominator: u64,
    pub fee_numerator: u64,
}



