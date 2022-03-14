use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::*,
    token::{Mint, Token, TokenAccount },
};
use anchor_lang::solana_program::{
    system_instruction::transfer,
    program::invoke,
    program::invoke_signed,
};
use solana_program::sysvar::clock::Clock;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

pub enum OrderType {
    Buy,
    Sell,
    TwoWay
}

pub enum MakerOrderType {
    Bid,
    Ask,
    TwoWay,
}

const U64_UPPER_LIMIT: u64 = 18446744073709551615;

// in cross AAPL/USDC, I buy 1 share of AAPL
// maker deposits 1 share of AAPL

// in cross AAPL/USDC, I buy 100 USDC of AAPL
// maker deposits 100 USDC

// in AAPL/USDC, quote two-way in 1 AAPL
// 105/95

#[program]
pub mod rfq {
    use super::*;
    /// Initializes protocol.
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
    
    /// naive version: send request, put up collateral on both sides
    /// version #2: send request, put up collateral on side you want to trade in
    /// version #3: anonymize to hide direction, have designated MMs who get special privileges
    pub fn request(
        ctx: Context<Request>,
        title: String,
        request_order_type: u8, // 1=buy, 2=sell, 3=two-way
        instrument: u8, // Token, Future, Option, may not be needed
        expiry: i64, // when RFQ timer ~expires, inert for nowxs
        amount: u64, // denominator asset
    ) -> ProgramResult {
        let rfq_state = &mut ctx.accounts.rfq_state;
        rfq_state.instrument = instrument;
        rfq_state.expiry = expiry;
        rfq_state.expired = false;
        rfq_state.response_count = 0;
        rfq_state.request_order_type = request_order_type;
        rfq_state.order_amount = amount;
        rfq_state.taker_address = *ctx.accounts.authority.key;

        rfq_state.time_begin = Clock::get().unwrap().unix_timestamp;

        Ok(())
    }

    pub fn respond_twoway(
        ctx: Context<Respond>,
        title: String,
        bid_amount: u64,
        ask_amount: u64
    ) -> ProgramResult {
        let rfq_state: &mut Account<RfqState> = &mut ctx.accounts.rfq_state;
        let request_order_type = rfq_state.request_order_type;
        let order_amount = rfq_state.order_amount;
        let time_begin = rfq_state.time_begin;
        let expiry = rfq_state.expiry;
        let order_state: &mut Account<OrderState> = &mut ctx.accounts.order_state;
        let authority = ctx.accounts.authority.key();
        let time_response = Clock::get().unwrap().unix_timestamp;
        
        rfq_state.time_response = time_response;

        require!((time_response - time_begin) < expiry, Err(ErrorCode::ResponseTimeElapsed.into()));
        require!(request_order_type == 1 || request_order_type == 2, Err(ErrorCode::InvalidQuoteType.into()));

        if rfq_state.response_count == 0 {
            rfq_state.best_ask_amount = U64_UPPER_LIMIT;
            rfq_state.best_bid_amount = 0;
        }

        // 1: buy, 2: sell, 3: two-way, in two-way the amount is assumed to be in quote_token
        if request_order_type == 3 {
            anchor_spl::token::transfer(
                CpiContext::new(
                    ctx.accounts.token_program.to_account_info(),
                    anchor_spl::token::Transfer {
                        from: ctx.accounts.asset_token.to_account_info(),
                        to: ctx.accounts.escrow_asset_token.to_account_info(),
                        authority: ctx.accounts.authority.to_account_info(),
                    },
                ),
                order_amount,
            )?;

            order_state.ask = ask_amount;
            if ask_amount < rfq_state.best_ask_amount {
                rfq_state.best_ask_amount = ask_amount;
                rfq_state.best_ask_address = authority;
            }

            anchor_spl::token::transfer(
                CpiContext::new(
                    ctx.accounts.token_program.to_account_info(),
                    anchor_spl::token::Transfer {
                        from: ctx.accounts.quote_token.to_account_info(),
                        to: ctx.accounts.escrow_quote_token.to_account_info(),
                        authority: ctx.accounts.authority.to_account_info(),
                    },
                ),
                order_amount,
            )?;

            order_state.bid = bid_amount;
            if bid_amount > rfq_state.best_bid_amount {
                rfq_state.best_bid_amount = bid_amount;
                rfq_state.best_bid_address = authority;
            }
        }

        rfq_state.response_count = rfq_state.response_count + 1;
        Ok(())
    }


    /// return one or two-way quote from request, single response per wallet, allow multiple responses
    /// what if two cpties tie for best price? give it to who priced earlier? what if both priced in same block, split the trade?
    /// how do we mitigate 'fat finger' error? make some protections for makers?
    /// margining system? 10% collateral upfront and slash if trade gets cancelled.
    pub fn respond(
        ctx: Context<Respond>,
        title: String,
        amount: u64,
    ) -> ProgramResult {
        let rfq_state: &mut Account<RfqState> = &mut ctx.accounts.rfq_state;
        let request_order_type = rfq_state.request_order_type;
        let order_amount = rfq_state.order_amount;
        let time_begin = rfq_state.time_begin;
        let expiry = rfq_state.expiry;
        let order_state: &mut Account<OrderState> = &mut ctx.accounts.order_state;
        let authority = ctx.accounts.authority.key();
        let time_response = Clock::get().unwrap().unix_timestamp;
        
        rfq_state.time_response = time_response;

        require!((time_response - time_begin) < expiry, Err(ErrorCode::ResponseTimeElapsed.into()));
        require!(request_order_type == 1 || request_order_type == 2, Err(ErrorCode::InvalidQuoteType.into()));

        if rfq_state.response_count == 0 {
            rfq_state.best_ask_amount = U64_UPPER_LIMIT;
            rfq_state.best_bid_amount = 0;
        }

        // 1: buy, 2: sell, 3: two-way, in two-way the amount is assumed to be in quote_token
        if request_order_type == 1 {
            anchor_spl::token::transfer(
                CpiContext::new(
                    ctx.accounts.token_program.to_account_info(),
                    anchor_spl::token::Transfer {
                        from: ctx.accounts.asset_token.to_account_info(),
                        to: ctx.accounts.escrow_asset_token.to_account_info(),
                        authority: ctx.accounts.authority.to_account_info(),
                    },
                ),
                order_amount,
            )?;

            order_state.ask = amount;
            if amount < rfq_state.best_ask_amount {
                rfq_state.best_ask_amount = amount;
                rfq_state.best_ask_address = authority;
            }
        } else if request_order_type == 2 {
            anchor_spl::token::transfer(
                CpiContext::new(
                    ctx.accounts.token_program.to_account_info(),
                    anchor_spl::token::Transfer {
                        from: ctx.accounts.quote_token.to_account_info(),
                        to: ctx.accounts.escrow_quote_token.to_account_info(),
                        authority: ctx.accounts.authority.to_account_info(),
                    },
                ),
                order_amount,
            )?;
            
            order_state.bid = amount;
            if amount > rfq_state.best_bid_amount {
                rfq_state.best_bid_amount = amount;
                rfq_state.best_bid_address = authority;
            }
        } else if request_order_type == 3 {

        }

        rfq_state.response_count = rfq_state.response_count + 1;
        Ok(())
    }

    // taker confirms order
    pub fn confirm(
        ctx: Context<Confirm>,
        title: String,
        confirm_order_type: u8,
    ) -> ProgramResult {
        // check if valid best_bid or best_offer exists
        let rfq_state: &mut Account<RfqState>  = &mut ctx.accounts.rfq_state;
        let best_bid_amount = rfq_state.best_bid_amount;
        let best_ask_amount = rfq_state.best_ask_amount;
        let taker_address = rfq_state.taker_address;
        let request_order_type = rfq_state.request_order_type;
        let authority = ctx.accounts.authority.key();

        // make sure current authority matches original taker address from 'request' fn call
        require!(taker_address == authority, Err(ErrorCode::InvalidTakerAddress.into()));
        require!(confirm_order_type < 3, Err(ErrorCode::InvalidOrder.into()));

        if request_order_type == 1 {
            require!(confirm_order_type == 1, Err(ErrorCode::InvalidOrder.into()));
        }
        if request_order_type == 2 {
            require!(confirm_order_type == 2, Err(ErrorCode::InvalidOrder.into()));
        }

        rfq_state.confirm_order_type = confirm_order_type;

        if confirm_order_type == 1 {
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
                best_ask_amount,
            )?;
        } else if confirm_order_type == 2 {
            anchor_spl::token::transfer(
                CpiContext::new(
                    ctx.accounts.token_program.to_account_info(),
                    anchor_spl::token::Transfer {
                        from: ctx.accounts.asset_token.to_account_info(),
                        to: ctx.accounts.escrow_asset_token.to_account_info(),
                        authority: ctx.accounts.authority.to_account_info(),
                    },
                ),
                best_bid_amount,
            )?;
        }

        rfq_state.confirmed = true;
        Ok(())
    }

    // TODO: last look functionality
    pub fn approve(
        ctx: Context<Approve>,
        title: String,
    ) -> ProgramResult {
        let rfq_state: &mut Account<RfqState> = &mut ctx.accounts.rfq_state;
        let order_state: &Account<OrderState> = &ctx.accounts.order_state;
        
        let mut is_winner = false;

        if (rfq_state.confirm_order_type == 1) && (rfq_state.best_bid_amount == order_state.bid) {
            is_winner = true;    
        }
        if (rfq_state.confirm_order_type == 2) && (rfq_state.best_ask_amount == order_state.ask) {
            is_winner = true;
        } 
        
        if is_winner {
            rfq_state.approved = true;
        }

        Ok(())
    }

    pub fn settle(
        ctx: Context<Settle>,
        title: String,
    ) -> ProgramResult {
        let rfq_state: &mut Account<RfqState> = &mut ctx.accounts.rfq_state;
        let order_amount = rfq_state.order_amount;
        let best_bid_amount = rfq_state.best_bid_amount;
        let best_ask_amount = rfq_state.best_ask_amount;
        let taker_address = rfq_state.taker_address;
        let order_state: &mut Account<OrderState> = &mut ctx.accounts.order_state;
        let authority_address = *ctx.accounts.authority.to_account_info().key;
        let request_order_type = rfq_state.request_order_type;
        let confirm_order_type = rfq_state.confirm_order_type;

        let asset_seed = &[b"escrow_asset", name_seed(&title)];
        let quote_seed = &[b"escrow_quote", name_seed(&title)];
        let (_escrow_asset_token, asset_bump) = Pubkey::find_program_address(asset_seed, ctx.program_id);
        let (_escrow_quote_token, quote_bump) = Pubkey::find_program_address(quote_seed, ctx.program_id);
        
        let asset_full_seed = &[b"escrow_asset", name_seed(&title), &[asset_bump]];
        let quote_full_seed = &[b"escrow_quote", name_seed(&title), &[quote_bump]];

        require!(rfq_state.confirmed == true, Err(ErrorCode::TradeNotConfirmed.into()));
        require!(rfq_state.approved == true, Err(ErrorCode::TradeNotApproved.into()));

        let (rfq_pda, rfq_bump) = Pubkey::find_program_address(
            &[b"rfq_state", name_seed(&title)],
            ctx.program_id,
        );

        let rfq_full_seed = &[b"rfq_state", name_seed(&title), &[rfq_bump]];
        let is_taker_address = authority_address == taker_address;
        let is_winning_ask = rfq_state.best_ask_amount == order_state.ask;
        let is_winning_bid = rfq_state.best_bid_amount == order_state.bid;

        if is_taker_address  {
            if confirm_order_type == 1 {
                anchor_spl::token::transfer(
                    CpiContext::new_with_signer(
                        ctx.accounts.token_program.to_account_info(),
                        anchor_spl::token::Transfer {
                            from: ctx.accounts.escrow_asset_token.to_account_info(),
                            to: ctx.accounts.asset_token.to_account_info(),
                            authority: rfq_state.to_account_info(),
                        },
                        &[&asset_full_seed[..], &rfq_full_seed[..]],
                    ),
                    order_amount,
                )?;
            } else if confirm_order_type == 2 {
                anchor_spl::token::transfer(
                    CpiContext::new_with_signer(
                        ctx.accounts.token_program.to_account_info(),
                        anchor_spl::token::Transfer {
                            from: ctx.accounts.escrow_quote_token.to_account_info(),
                            to: ctx.accounts.quote_token.to_account_info(),
                            authority: rfq_state.to_account_info(),
                        },
                        &[&quote_full_seed[..], &rfq_full_seed[..]],
                    ),
                    order_amount,
                )?;
            }
        } 

        // market makers that didn't win, get their collateral back
        if !is_taker_address && !is_winning_ask {
            // send winning maker's token to taker
            if request_order_type == 1 {
                anchor_spl::token::transfer(
                    CpiContext::new_with_signer(
                        ctx.accounts.token_program.to_account_info(),
                        anchor_spl::token::Transfer {
                            from: ctx.accounts.escrow_asset_token.to_account_info(),
                            to: ctx.accounts.asset_token.to_account_info(),
                            authority: rfq_state.to_account_info(),
                        },
                        &[&asset_full_seed[..], &rfq_full_seed[..]],
                    ),
                    order_amount,
                )?;
            }
        } 
        if !is_taker_address && !is_winning_bid {
            if request_order_type == 2 {
                anchor_spl::token::transfer(
                    CpiContext::new_with_signer(
                        ctx.accounts.token_program.to_account_info(),
                        anchor_spl::token::Transfer {
                            from: ctx.accounts.escrow_quote_token.to_account_info(),
                            to: ctx.accounts.quote_token.to_account_info(),
                            authority: rfq_state.to_account_info(),
                        },
                        &[&quote_full_seed[..], &rfq_full_seed[..]],
                    ),
                    order_amount,
                )?;
            }
        }

        if !is_taker_address && is_winning_ask {
            // send winning maker's token to taker
            if request_order_type == 1 {
                anchor_spl::token::transfer(
                    CpiContext::new_with_signer(
                        ctx.accounts.token_program.to_account_info(),
                        anchor_spl::token::Transfer {
                            from: ctx.accounts.escrow_quote_token.to_account_info(),
                            to: ctx.accounts.quote_token.to_account_info(),
                            authority: rfq_state.to_account_info(),
                        },
                        &[&quote_full_seed[..], &rfq_full_seed[..]],
                    ),
                    best_ask_amount,
                )?;
            }
        }
        
        if !is_taker_address && is_winning_bid {
            if request_order_type == 2 {
                anchor_spl::token::transfer(
                    CpiContext::new_with_signer(
                        ctx.accounts.token_program.to_account_info(),
                        anchor_spl::token::Transfer {
                            from: ctx.accounts.escrow_asset_token.to_account_info(),
                            to: ctx.accounts.asset_token.to_account_info(),
                            authority: rfq_state.to_account_info(),
                        },
                        &[&asset_full_seed[..], &rfq_full_seed[..]],
                    ),
                    best_bid_amount,
                )?;
            }
        }

        Ok(())
    }

    // TODO: add ability for taker to counter with a better price
    // pub fn counter()
}

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
    #[account(
        init_if_needed,
        payer = authority,
        seeds = [b"rfq_state", name_seed(&title)],
        space = 1024,
        bump
    )]
    pub rfq_state: Box<Account<'info, RfqState>>,
    
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
        seeds = [b"order_state", &authority.key().to_bytes()[..]],
        space = 64 + 64,
        bump
    )]
    pub order_state: Box<Account<'info, OrderState>>,
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
        seeds = [b"escrow_asset", name_seed(&title)],
        bump,
        token::mint = asset_mint,
        token::authority = rfq_state,
    )]
    pub escrow_asset_token: Box<Account<'info, TokenAccount>>,
    #[account(
        init_if_needed,
        payer = authority,
        seeds = [b"escrow_quote", name_seed(&title)],
        bump,
        token::mint = quote_mint,
        token::authority = rfq_state,
    )]
    pub escrow_quote_token: Box<Account<'info, TokenAccount>>,
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
        seeds = [b"escrow_asset", name_seed(&title)],
        bump,
        token::mint = asset_mint,
        token::authority = rfq_state,
    )]
    pub escrow_asset_token: Box<Account<'info, TokenAccount>>, 
    #[account(
        init_if_needed,
        payer = authority,
        seeds = [b"escrow_quote", name_seed(&title)],
        bump,
        token::mint = quote_mint,
        token::authority = rfq_state,
    )]
    pub escrow_quote_token: Box<Account<'info, TokenAccount>>, 
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
pub struct Approve<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        init_if_needed,
        payer = authority,
        seeds = [b"order_state", &authority.key().to_bytes()[..]],
        space = 64 + 64,
        bump
    )]
    pub order_state: Box<Account<'info, OrderState>>,
    #[account(
        init_if_needed,
        payer = authority,
        seeds = [b"rfq_state", name_seed(&title)],
        space = 1024,
        bump
    )]
    pub rfq_state: Box<Account<'info, RfqState>>,
    pub system_program: Program<'info, System>,
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
        seeds = [b"order_state", &authority.key().to_bytes()[..]],
        space = 64 + 64,
        bump
    )]
    pub order_state: Box<Account<'info, OrderState>>,
    
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

    #[account(mut)]
    pub escrow_asset_token: Box<Account<'info, TokenAccount>>, 
    #[account(mut)]
    pub escrow_quote_token: Box<Account<'info, TokenAccount>>, 

    #[account(mut)]
    pub asset_mint: Box<Account<'info, Mint>>,
    #[account(mut)]
    pub quote_mint: Box<Account<'info, Mint>>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}


#[account]
/// Holds state of one RFQ
pub struct RfqState { 
    pub instrument: u8,
    pub expiry: i64, // 30secs?
    pub expired: bool,
    pub asset_mint: Pubkey,
    pub quote_mint: Pubkey,
    pub best_bid_amount: u64,
    pub best_ask_amount: u64,
    pub best_bid_address: Pubkey,
    pub best_ask_address: Pubkey,
    pub response_count: u16,
    pub request_order_type: u8,
    pub confirm_order_type: u8,
    pub order_amount: u64,
    pub confirmed: bool,
    pub approved: bool,
    pub taker_address: Pubkey,
    pub time_begin: i64,
    pub time_response: i64,
}

/// global state for the entire RFQ system
#[account]
pub struct GlobalState {
    pub rfq_count: u64,
    pub access_manager_count: u64,
    pub authority: Pubkey,
    pub fee_denominator: u64,
    pub fee_numerator: u64,
}

/// MM order state
#[account]
pub struct OrderState {
    pub ask: u64,
    pub bid: u64,
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
    #[msg("Trade has not been approved by maker")]
    TradeNotApproved,
    #[msg("Timed out on response to request")]
    ResponseTimeElapsed,
    #[msg("Invalid order logic")]
    InvalidOrder,
}

#[macro_export]
macro_rules! require{
       ($a:expr,$b:expr)=>{
           {
               if !$a {
                   return $b
               }
           }
       }
}

pub fn transfer_spl<'info>(
    src: AccountInfo<'info>,
    from: AccountInfo<'info>,
    to: AccountInfo<'info>,
    amount: u64,
    token_program: AccountInfo<'info>,
    signer_seeds: &[&[&[u8]]]
) -> ProgramResult {

    invoke_signed(
        &spl_token::instruction::transfer(
            &token_program.key(),
            &from.key(),
            &to.key(),
            &src.key(),
            &[],
            amount,
        )?,
        &[
            src.to_account_info(),
            from.to_account_info(),
            to.to_account_info(),
            token_program.to_account_info()
        ],
        signer_seeds,
    )?;

    Ok(())
}