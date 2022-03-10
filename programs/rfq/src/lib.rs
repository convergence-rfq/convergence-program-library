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
    
    /// naive version: send request, put up collateral on both sides
    /// version #2: send request, put up collateral on side you want to trade in
    /// version #3: anonymize to hide direction, have designated MMs who get special privileges 
    pub fn request(
        ctx: Context<Request>,
        title: String,
        taker_order_type: u8, // 1=buy, 2=sell, 3=two-way
        instrument: u8, // Token, Future, Option, may not be needed
        expiry: i64, // when RFQ timer ~expires, inert for now
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
        rfq_state.response_count = 0;
        rfq_state.taker_order_type = taker_order_type;
        rfq_state.order_amount = amount;
        rfq_state.taker_address = *ctx.accounts.authority.key;

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
        let mut rfq_state = &mut ctx.accounts.rfq_state;
        let mut best_bid_amount = rfq_state.best_bid_amount;
        let mut best_ask_amount = rfq_state.best_ask_amount;
        let best_bid_address = rfq_state.best_bid_address;
        let best_ask_address = rfq_state.best_bid_address;
        let authority = ctx.accounts.authority.key();
        let taker_order_type = rfq_state.taker_order_type;
        let order_state = &mut ctx.accounts.order_state;
        let order_amount = rfq_state.order_amount;

        if rfq_state.response_count == 0 && taker_order_type == 1 {
            rfq_state.best_ask_amount = amount;
        }
        if rfq_state.response_count == 0 && taker_order_type == 2 {
            rfq_state.best_bid_amount = 3333;
        }

        // response to taker's order to buy asset_token
        if taker_order_type == 1 {
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
            if amount < best_ask_amount {
                rfq_state.best_ask_amount = amount;
                rfq_state.best_ask_address = authority;
                //rfq_state.winning_maker_asset_escrow = ctx.accounts.escrow_asset_token.to_account_info().key();
                //rfq_state.winning_maker_quote_escrow = ctx.accounts.escrow_quote_token.to_account_info().key();
            }
        } else if taker_order_type == 2 {
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
            if amount > best_bid_amount {
                rfq_state.best_bid_amount = amount;
                rfq_state.best_bid_address = authority;
                //rfq_state.winning_maker_asset_escrow = ctx.accounts.escrow_asset_token.to_account_info().key();
                //rfq_state.winning_maker_quote_escrow = ctx.accounts.escrow_quote_token.to_account_info().key();
            }
        } else {
            return Err(ErrorCode::InvalidQuoteType.into());
        }

        rfq_state.response_count = rfq_state.response_count + 1;
        rfq_state.participants.push(authority);
        Ok(())
    }

    pub fn confirm(
        ctx: Context<Confirm>,
        title: String,
    ) -> ProgramResult {
        // check if valid best_bid or best_offer exists
        let rfq_state = &mut ctx.accounts.rfq_state;
        let best_bid_amount = rfq_state.best_bid_amount;
        let best_ask_amount = rfq_state.best_ask_amount;
        let best_bid_address = rfq_state.best_bid_address;
        let best_ask_address = rfq_state.best_ask_address;
        let response_count = rfq_state.response_count;
        let order_amount = rfq_state.order_amount;
        let authority = ctx.accounts.authority.key();
        let taker_address = rfq_state.taker_address;
        let taker_order_type = rfq_state.taker_order_type;

        // make sure current authority matches original taker address from 'request' fn call
        if taker_address != authority {
            return Err(ErrorCode::InvalidTakerAddress.into());
        }

        if taker_order_type == 1 {
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
        } else if taker_order_type == 2 {
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

    pub fn settle(
        ctx: Context<Settle>,
        title: String,
    ) -> ProgramResult {
        let rfq_state = &mut ctx.accounts.rfq_state;
        let taker_order_type = rfq_state.taker_order_type;
        let order_amount = rfq_state.order_amount;
        let best_bid_amount = rfq_state.best_bid_amount;
        let best_ask_amount = rfq_state.best_ask_amount;
        let authority_address = *ctx.accounts.authority.to_account_info().key;
        let taker_address = rfq_state.taker_address;
        let order_state = &mut ctx.accounts.order_state;

        let asset_seed = &[b"escrow_asset", name_seed(&title)];
        let quote_seed = &[b"escrow_quote", name_seed(&title)];
        let (_escrow_asset_token, asset_bump) = Pubkey::find_program_address(asset_seed, ctx.program_id);
        let (_escrow_quote_token, quote_bump) = Pubkey::find_program_address(quote_seed, ctx.program_id);
        
        let asset_full_seed = &[b"escrow_asset", name_seed(&title), &[asset_bump]];
        let quote_full_seed = &[b"escrow_quote", name_seed(&title), &[quote_bump]];

        if rfq_state.confirmed == false {
            return Err(ErrorCode::TradeNotConfirmed.into());
        }

        let (rfq_pda, rfq_bump) = Pubkey::find_program_address(
            &[
                b"rfq_state",
                name_seed(&title),
            ],
            ctx.program_id,
        );

        let rfq_full_seed = &[b"rfq_state", name_seed(&title), &[rfq_bump]];
        
        //let check_any = rfq_state.participants.iter().any(|&item| item == authority_address);
        
        let is_taker_address = authority_address == taker_address;
        let is_winning_ask = rfq_state.best_ask_amount == order_state.ask;
        let is_winning_bid = rfq_state.best_bid_amount == order_state.bid;

        // need vault state to hold collateral pledged for each maker
        if is_taker_address  {
            // send winning maker's token to taker
            if taker_order_type == 1 {
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
            } else if taker_order_type == 2 {
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
            if taker_order_type == 1 {
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
            if taker_order_type == 2 {
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
            if taker_order_type == 1 {
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
            if taker_order_type == 2 {
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

    // TODO: last look functionality
    pub fn approve(
        ctx: Context<Respond>
    ) -> ProgramResult {
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


/// Holds state of one RFQ
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
    pub best_bid_amount: u64,
    pub best_ask_amount: u64,
    pub best_bid_address: Pubkey,
    pub best_ask_address: Pubkey,
    pub response_count: u16,
    pub taker_order_type: u8,
    pub asset_amount: u64,
    pub quote_amount: u64,
    pub order_amount: u64,
    pub confirmed: bool,
    pub taker_address: Pubkey,
    pub winning_maker_asset_escrow: Pubkey,
    pub winning_maker_quote_escrow: Pubkey,
    pub participants: Vec<Pubkey>,
}

/// global state for the entire RFQ system
#[account]
pub struct GlobalState {
    pub rfq_count: u64,
    pub access_manager_count: u64,
    pub authority: Pubkey,
    pub fee_denominator: u64,
    pub fee_numerator: u64,
    //pub min_usd_amount: u64, // TODO: to limit small transactions?
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
}
