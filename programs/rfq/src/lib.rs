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
    
    /// Ideally, RFQs are: customized, anonymous, viewable to all participants
    /// why RFQ? eliminate leg risk, efficient price discovery, competitive quotes under illiquidity, customizable strategies
    /// why now? dire need for on-chain liquidity provision for structured products and large DAO transactions
    /// Q: do we need one numeraire for undercollateralized RFQ?
    /// Q: how do we prevent spam transactions since solana is so cheap? make taker pay some flat fee just to initialize rfq?
    /// naive version: send request, put up collateral on both sides
    /// version #2: send request, put up collateral on side you want to trade in
    /// version #3: anonymize to hide direction, have designated MMs who get special privileges 
    pub fn request(
        ctx: Context<Request>,
        title: String,
        taker_order_type: u8, // 1=buy, 2=sell, 3=two-way
        instrument: u8, // Token, Future, Option, may not be needed
        expiry: i64, // when RFQ timer ~expires
        ratio: u8, // 1, inert for now, will be relevant for multi leg
        n_of_legs: u8, // inert for now
        amount: u64,
    ) -> ProgramResult {
        let rfq_state = &mut ctx.accounts.rfq_state;
         //*ctx.accounts.action.to_account_info().key;
        rfq_state.instrument = instrument;
        rfq_state.expiry = expiry;
        rfq_state.expired = false;
        rfq_state.ratio = ratio;
        rfq_state.n_of_legs = n_of_legs;
        rfq_state.order_count = 0;
        rfq_state.taker_order_type = taker_order_type;
        rfq_state.amount = amount;

        rfq_state.asset_mint = *ctx.accounts.asset_mint.to_account_info().key;
        rfq_state.quote_mint = *ctx.accounts.quote_mint.to_account_info().key;
        rfq_state.taker_address = *ctx.accounts.authority.key;

        //let order_book_state = &mut ctx.accounts.order_book_state;
        //order_book_state.bids = vec![];
        //order_book_state.asks = vec![];
        Ok(())
    }

    /// return one or two-way quote from request, single response per wallet, allow multiple responses
    /// what if two cpties tie for best price? give it to who priced earlier? what if both priced in same block, split the trade?
    /// how do we mitigate 'fat finger' error? make some protections for makers?
    /// margining system? 10% collateral upfront and slash if trade gets cancelled.
    pub fn respond(
        ctx: Context<Respond>,
        title: String,
        order_type: u8, // 1=buy/bid, 2=sell/ask, 3=two-way
        price: u64,
        amount: u64,
    ) -> ProgramResult {
        let mut rfq_state = &mut ctx.accounts.rfq_state;
        let mut best_bid = rfq_state.best_bid;
        let mut best_ask = rfq_state.best_bid;
        let best_bid_address = rfq_state.best_bid_address;
        let best_ask_address = rfq_state.best_bid_address;
        let authority = ctx.accounts.authority.key();
        let order_count = rfq_state.order_count;

        if order_count == 0 {
            best_ask = 18446744073709551615;
            best_bid = 0;
        }

        if order_type == 1 {
            if price > best_bid {
                rfq_state.best_bid = price;
                rfq_state.best_bid_address = authority;
                rfq_state.winning_maker_asset_escrow = ctx.accounts.escrow_asset_token.to_account_info().key();
                rfq_state.winning_maker_quote_escrow = ctx.accounts.escrow_quote_token.to_account_info().key();
            }
        } else if order_type == 2 {
            if price < best_ask {
                rfq_state.best_ask = price;
                rfq_state.best_ask_address = authority;
                rfq_state.winning_maker_asset_escrow = ctx.accounts.escrow_asset_token.to_account_info().key();
                rfq_state.winning_maker_quote_escrow = ctx.accounts.escrow_quote_token.to_account_info().key();
            }
        } else {
            return Err(ErrorCode::InvalidQuoteType.into());
        }
        // TODO: check if RFQ hasn't timed out
        let asset_amount = amount / price;

        anchor_spl::token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::Transfer {
                    from: ctx.accounts.quote_token.to_account_info(),
                    to: ctx.accounts.escrow_quote_token.to_account_info(),
                    authority: ctx.accounts.authority.to_account_info(),
                },
            ),
            amount,
        )?;
        anchor_spl::token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::Transfer {
                    from: ctx.accounts.asset_token.to_account_info(),
                    to: ctx.accounts.escrow_asset_token.to_account_info(),
                    authority: ctx.accounts.authority.to_account_info(),
                },
            ),
            asset_amount,
        )?;

        //rfq_state.participants.push(authority);
        rfq_state.order_count = rfq_state.order_count + 1;
        Ok(())
    }

    /// TODO: make sure to test respond and confirm RFQ as different wallets!
    /// taker confirms by picking a side (bid or ask) or by cancelling the transaction
    /// if within 20-30s, taker does nothing, transaction auto-cancels
    ///
    pub fn confirm(
        ctx: Context<Confirm>,
        title: String,
    ) -> ProgramResult {
        // check if valid best_bid or best_offer exists
        let rfq_state = &mut ctx.accounts.rfq_state;
        let best_bid = rfq_state.best_bid;
        let best_ask = rfq_state.best_bid;
        let best_bid_address = rfq_state.best_bid_address;
        let best_ask_address = rfq_state.best_bid_address;
        let order_count = rfq_state.order_count;
        let amount = rfq_state.amount;
        let authority = ctx.accounts.authority.key();
        let taker_address = rfq_state.taker_address;
        let taker_order_type = rfq_state.taker_order_type;

        // make sure current authority matches original taker address from 'request' fn call
        if taker_address != authority {
            return Err(ErrorCode::InvalidTakerAddress.into());
        }

        if taker_order_type == 1 {
            rfq_state.winning_address = best_ask_address;
            // taker wants to buy asset token, needs to post quote token as collateral 
            anchor_spl::token::transfer(
                CpiContext::new(
                    ctx.accounts.token_program.to_account_info(),
                    anchor_spl::token::Transfer {
                        from: ctx.accounts.quote_token.to_account_info(),
                        to: ctx.accounts.escrow_quote_token.to_account_info(),
                        authority: ctx.accounts.authority.to_account_info(),
                    },
                ),
                amount,
            )?;
        } else if taker_order_type == 2 {
            rfq_state.winning_address = best_bid_address;
            let asset_amount = amount / best_bid;

            anchor_spl::token::transfer(
                CpiContext::new(
                    ctx.accounts.token_program.to_account_info(),
                    anchor_spl::token::Transfer {
                        from: ctx.accounts.asset_token.to_account_info(),
                        to: ctx.accounts.escrow_asset_token.to_account_info(),
                        authority: ctx.accounts.authority.to_account_info(),
                    },
                ),
                asset_amount,
            )?;
        }

        rfq_state.confirmed = true;
        Ok(())
    }

    /// 1. taker -> asset collateral
    /// 2. maker -> asset and quote collateral
    /// 3. maker2 -> asset and quote collateral
    /// 4. taker's asset collateral goes to maker2
    /// 5. maker2's quote collateral goes to taker
    /// 6. maker2 recoups asset collateral
    /// 7. maker recoups asset and quote collateral
    /// settle RFQ, swap tokens between winning MM and taker, and return all collateral
    pub fn settle(
        ctx: Context<Settle>,
        title: String,
    ) -> ProgramResult {
        
        let rfq_state = &mut ctx.accounts.rfq_state;
        let taker_address = rfq_state.taker_address;
        let winning_address = &rfq_state.winning_address;
        let taker_order_type = rfq_state.taker_order_type;
        let amount = rfq_state.amount;
        let best_bid = rfq_state.best_bid;
        let authority = &ctx.accounts.authority;

        let asset_seed = &[b"quote_asset", winning_address.as_ref(), name_seed(&title)];
        let quote_seed = &[b"quote_asset", winning_address.as_ref(), name_seed(&title)];
        let (_escrow_asset_token, asset_bump) = Pubkey::find_program_address(asset_seed, ctx.program_id);
        let (_escrow_quote_token, quote_bump) = Pubkey::find_program_address(quote_seed, ctx.program_id);
        
        let asset_full_seed = &[b"quote_asset", 
            name_seed(&title), 
            &winning_address.key().to_bytes()[..],
            //&winning_address.as_ref(),
            &[asset_bump]
        ];
        
        let quote_full_seed = &[b"quote_asset", 
            name_seed(&title), 
            &winning_address.key().to_bytes()[..],
            //&winning_address.as_ref(),
            &[quote_bump]
        ];


        if rfq_state.confirmed == false {
            return Err(ErrorCode::TradeNotConfirmed.into());
        }
        
        // send winning maker's token to taker
        if taker_order_type == 1 && (authority.key() == taker_address.key()) {
            anchor_spl::token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    anchor_spl::token::Transfer {
                        from: ctx.accounts.escrow_asset_token.to_account_info(),
                        to: ctx.accounts.asset_token.to_account_info(),
                        authority: ctx.accounts.escrow_asset_token.to_account_info(),
                    },
                    &[&quote_full_seed[..]],
                ),
                1,
            )?;
        } else if taker_order_type == 2 && (authority.key() == taker_address.key()) {
            let asset_amount = amount / best_bid;
            anchor_spl::token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    anchor_spl::token::Transfer {
                        from: ctx.accounts.escrow_quote_token.to_account_info(),
                        to: ctx.accounts.quote_token.to_account_info(),
                        authority: ctx.accounts.escrow_quote_token.to_account_info(),
                    },
                    &[&asset_full_seed[..]],
                ),
                1,
            )?;
        }
        
        // send token from escrow to winning maker
        Ok(())
    }

    // last look functionality
    pub fn approve(
        ctx: Context<Respond>
    ) -> ProgramResult {
        Ok(())
    }

    // TODO: add ability for taker to counter with a better price
    // pub fn counter()
}

/// TBD: global state variables
#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
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
#[instruction(
    title: String,
)]
pub struct Request<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    pub asset_mint: Account<'info, Mint>,
    pub quote_mint: Account<'info, Mint>,
    /*
    #[account(
        init_if_needed,
        payer = authority,
        seeds = [b"order_book_state"],
        space = 1024,
        bump
    )]
    pub order_book_state: Account<'info, OrderBookState>,
    */
    #[account(
        init,
        payer = authority,
        seeds = [b"rfq_state", name_seed(&title)],
        space = 1024,
        bump
    )]
    pub rfq_state: Account<'info, RfqState>,
    
    // programs
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
#[instruction(
    title: String,
)]
pub struct Respond<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(
        init_if_needed,
        payer = authority,
        //seeds = [b"rfq_state", authority.to_account_info().key.as_ref(), name_seed(&title)],
        seeds = [b"rfq_state", name_seed(&title)],
        space = 1024,
        bump
    )]
    pub rfq_state: Box<Account<'info, RfqState>>,
    
    #[account(mut)]
    pub asset_token: Box<Account<'info, TokenAccount>>,
    #[account(mut)]
    pub quote_token: Box<Account<'info, TokenAccount>>,
    
    #[account(
        init_if_needed,
        payer = authority,
        seeds = [b"escrow_asset", &authority.key().to_bytes()[..], name_seed(&title)],
        //&authority.key().to_bytes()[..]
        bump,
        token::mint = asset_mint,
        token::authority = escrow_asset_token,
    )]
    pub escrow_asset_token: Box<Account<'info, TokenAccount>>, // this PDA will be an authority for escrow with token pledged by wallet
    #[account(
        init_if_needed,
        payer = authority,
        seeds = [b"escrow_quote", &authority.key().to_bytes()[..], name_seed(&title)],
        bump,
        token::mint = quote_mint,
        token::authority = escrow_quote_token,
    )]
    pub escrow_quote_token: Box<Account<'info, TokenAccount>>, // this PDA will be an authority for escrow with token pledged by wallet
    pub asset_mint: Box<Account<'info, Mint>>,
    pub quote_mint: Box<Account<'info, Mint>>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}


#[derive(Accounts)]
#[instruction(
    title: String,
)]
pub struct Confirm<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(
        init_if_needed,
        payer = authority,
        seeds = [b"rfq_state", name_seed(&title)],
        space = 1024,
        bump
    )]
    pub rfq_state: Box<Account<'info, RfqState>>,
    
    #[account(mut)]
    pub asset_token: Box<Account<'info, TokenAccount>>,
    #[account(mut)]
    pub quote_token: Box<Account<'info, TokenAccount>>,
    
    #[account(
        init_if_needed,
        payer = authority,
        seeds = [b"escrow_asset", &authority.key().to_bytes()[..], name_seed(&title)],
        bump,
        token::mint = asset_mint,
        token::authority = escrow_asset_token,
    )]
    pub escrow_asset_token: Box<Account<'info, TokenAccount>>, // this PDA will be an authority for escrow with token pledged by wallet
    #[account(
        init_if_needed,
        payer = authority,
        seeds = [b"escrow_quote", &authority.key().to_bytes()[..], name_seed(&title)],
        bump,
        token::mint = quote_mint,
        token::authority = escrow_quote_token,
    )]
    pub escrow_quote_token: Box<Account<'info, TokenAccount>>, // this PDA will be an authority for escrow with token pledged by wallet
    pub asset_mint: Box<Account<'info, Mint>>,
    pub quote_mint: Box<Account<'info, Mint>>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}


#[derive(Accounts)]
#[instruction(
    title: String,
)]
pub struct Settle<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(
        init_if_needed,
        payer = authority,
        seeds = [b"rfq_state", name_seed(&title)],
        space = 1024,
        bump
    )]
    pub rfq_state: Box<Account<'info, RfqState>>,
    
    #[account(mut)]
    pub asset_token: Box<Account<'info, TokenAccount>>,
    #[account(mut)]
    pub quote_token: Box<Account<'info, TokenAccount>>,

    #[account(
        init_if_needed,
        payer = authority,
        //seeds = [&asset_seed],
        seeds = [b"escrow_asset", &rfq_state.winning_address.key().to_bytes()[..], name_seed(&title)],
        bump,
        token::mint = asset_mint,
        token::authority = escrow_asset_token,
    )]
    pub escrow_asset_token: Box<Account<'info, TokenAccount>>, // this PDA will be an authority for escrow with token pledged by wallet
    #[account(
        init_if_needed,
        payer = authority,
        seeds = [b"escrow_quote", &rfq_state.winning_address.key().to_bytes()[..], name_seed(&title)],
        bump,
        token::mint = quote_mint,
        token::authority = escrow_quote_token,
    )]
    pub escrow_quote_token: Box<Account<'info, TokenAccount>>, // this PDA will be an authority for escrow with token pledged by wallet

    pub asset_mint: Box<Account<'info, Mint>>,
    pub quote_mint: Box<Account<'info, Mint>>,

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
    pub expiry: i64, // 30secs?
    pub expired: bool,
    pub ratio: u8,
    pub n_of_legs: u8,
    pub asset_mint: Pubkey,
    pub quote_mint: Pubkey,
    pub best_bid: u64,
    pub best_ask: u64,
    pub best_bid_address: Pubkey,
    pub best_ask_address: Pubkey,
    pub winning_address: Pubkey,
    pub order_count: u16,
    pub taker_order_type: u8,
    pub amount: u64,
    pub confirmed: bool,
    pub taker_address: Pubkey,
    pub winning_maker_asset_escrow: Pubkey,
    pub winning_maker_quote_escrow: Pubkey,
    //pub participants: Vec<Pubkey>,
}

/// global state for the entire RFQ system
#[account]
pub struct GlobalState {
    pub rfq_count: u64,
    pub access_manager_count: u64,
    pub authority: Pubkey,
    pub fee_denominator: u64,
    pub fee_numerator: u64,
    //pub min_usd_amount: u64, // to limit small transactions?
}

pub fn name_seed(name: &str) -> &[u8] {
    let b = name.as_bytes();
    if b.len() > 32 { &b[0..32] } else { b }
}

#[error]
pub enum ErrorCode {
    #[msg("Invalid quote type")]
    InvalidQuoteType,
    #[msg("Invalid taker address")]
    InvalidTakerAddress,
    #[msg("Trade has not been confirmed by taker")]
    TradeNotConfirmed,
}
