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

declare_id!("6r538FKBpBtoGDSqLv2tL6HE3ffsWPBKSJ2QnnFpnFu2");

const U64_UPPER_LIMIT: u64 = 18446744073709551615;

#[program]
pub mod rfq {
    use super::*;

    /// Initializes protocol.
    /// fee_denominator Fee denominator
    /// fee_numerator Fee numerator
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
        protocol.titles = Vec::new();

        Ok(())
    }
    
    pub fn request(
        ctx: Context<Request>,
        title: String,
        request_order_type: u8, // 1=buy, 2=sell, 3=two-way
        instrument: u8, 
        expiry: i64, 
        amount: u64, 
    ) -> ProgramResult {
        let rfq_state = &mut ctx.accounts.rfq_state;
        rfq_state.title = title.clone();
        rfq_state.instrument = instrument;
        rfq_state.expiry = expiry;
        rfq_state.expired = false;
        rfq_state.response_count = 0;
        rfq_state.request_order_type = request_order_type;
        rfq_state.order_amount = amount;
        rfq_state.taker_address = *ctx.accounts.authority.key;
        rfq_state.best_ask_amount = U64_UPPER_LIMIT;
        rfq_state.best_bid_amount = 0;
        rfq_state.time_begin = Clock::get().unwrap().unix_timestamp;
        rfq_state.approved = false;
        
        ctx.accounts.protocol.titles.push(title);
        
        Ok(())
    }

    /// Maker's response with one-way or two-way quotes
    pub fn respond(
        ctx: Context<Respond>,
        title: String,
        bid: u64,
        ask: u64,
    ) -> ProgramResult {
        let rfq_state: &mut Account<RfqState> = &mut ctx.accounts.rfq_state;

        let order_amount = rfq_state.order_amount;
        let time_begin = rfq_state.time_begin;
        let expiry = rfq_state.expiry;
        let order_state: &mut Account<OrderState> = &mut ctx.accounts.order_state;
        let authority = ctx.accounts.authority.key();
        let time_response = Clock::get().unwrap().unix_timestamp;
        
        rfq_state.time_response = time_response;

        require!((time_response - time_begin) < expiry, Err(ErrorCode::ResponseTimeElapsed.into()));
        require!(bid > 0 || ask > 0, Err(ErrorCode::InvalidQuoteType.into()));

        if ask > 0 {
            anchor_spl::token::transfer(
                CpiContext::new(
                    ctx.accounts.token_program.to_account_info(),
                    anchor_spl::token::Transfer {
                        from: ctx.accounts.asset_token.to_account_info(),
                        to: ctx.accounts.escrow_asset_token.to_account_info(),
                        authority: ctx.accounts.authority.to_account_info(),
                    },
                ),
                order_amount, // Collateral is an asset token amount
            )?;

            order_state.ask = ask;
            if ask < rfq_state.best_ask_amount {
                rfq_state.best_ask_amount = ask;
                rfq_state.best_ask_address = authority;
            }
        }
        if bid > 0 {
            anchor_spl::token::transfer(
                CpiContext::new(
                    ctx.accounts.token_program.to_account_info(),
                    anchor_spl::token::Transfer {
                        from: ctx.accounts.quote_token.to_account_info(),
                        to: ctx.accounts.escrow_quote_token.to_account_info(),
                        authority: ctx.accounts.authority.to_account_info(),
                    },
                ),
                bid, // Collateral is a quote token amount
            )?;
            
            order_state.bid = bid;
            if bid > rfq_state.best_bid_amount {
                rfq_state.best_bid_amount = bid;
                rfq_state.best_bid_address = authority;
            }
        } 

        rfq_state.response_count = rfq_state.response_count + 1;
        Ok(())
    }

    // Taker confirms order type
    pub fn confirm(
        ctx: Context<Confirm>,
        title: String,
        confirm_order_type: u8,
    ) -> ProgramResult {
        // Check if valid best_bid or best_offer exists
        let rfq_state: &mut Account<RfqState>  = &mut ctx.accounts.rfq_state;
        let best_bid_amount = rfq_state.best_bid_amount;
        let best_ask_amount = rfq_state.best_ask_amount;
        let taker_address = rfq_state.taker_address;
        let request_order_type = rfq_state.request_order_type;
        let authority = ctx.accounts.authority.key();

        // Make sure current authority matches original taker address from 'request' fn call
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

    pub fn last_look(
        ctx: Context<LastLook>,
        title: String,
    ) -> ProgramResult {
        let rfq_state: &mut Account<RfqState> = &mut ctx.accounts.rfq_state;
        let order_state: &Account<OrderState> = &ctx.accounts.order_state;
        
        let mut is_winner = false;

        if (rfq_state.confirm_order_type == 1) && (rfq_state.best_ask_amount == order_state.ask) {
            is_winner = true;
        }
        if (rfq_state.confirm_order_type == 2) && (rfq_state.best_bid_amount == order_state.bid) {
            is_winner = true;
        }
        
        if is_winner {
            rfq_state.approved = true;
        }

        Ok(())
    }

    /// Returns collateral of non-winning makers
    pub fn return_collateral(
        ctx: Context<ReturnCollateral>,
        title: String,
    ) -> ProgramResult {
        let rfq_state: &mut Account<RfqState> = &mut ctx.accounts.rfq_state;
        let order_state: &mut Account<OrderState> = &mut ctx.accounts.order_state;
        
        require!(rfq_state.confirmed == true, Err(ErrorCode::TradeNotConfirmed.into()));
        require!(order_state.collateral_returned == false, Err(ErrorCode::TradeNotConfirmed.into()));

        let asset_seed = &[b"escrow_asset", name_seed(&title)];
        let (_escrow_asset_token, asset_bump) = Pubkey::find_program_address(asset_seed, ctx.program_id);
        let asset_full_seed = &[b"escrow_asset", name_seed(&title), &[asset_bump]];
        let quote_seed = &[b"escrow_quote", name_seed(&title)];
        let (_escrow_quote_token, quote_bump) = Pubkey::find_program_address(quote_seed, ctx.program_id);
        let quote_full_seed = &[b"escrow_quote", name_seed(&title), &[quote_bump]];

        let (_rfq_pda, rfq_bump) = Pubkey::find_program_address(
            &[b"rfq_state", name_seed(&title)],
            ctx.program_id,
        );
        let rfq_full_seed = &[b"rfq_state", name_seed(&title), &[rfq_bump]];

        if order_state.ask != 0 && (rfq_state.best_ask_amount != order_state.ask || rfq_state.confirm_order_type == 2) {
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
                rfq_state.order_amount,
            )?;
        }

        if order_state.bid != 0 && (rfq_state.best_ask_amount != order_state.ask || rfq_state.confirm_order_type == 1) {
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
                order_state.bid,
            )?;
        }

        order_state.collateral_returned = true;

        Ok(())
    }

    // Settles winning maker's and taker's fund transfers
    pub fn settle(
        ctx: Context<Settle>,
        title: String,
    ) -> ProgramResult {
        let rfq_state: &mut Account<RfqState> = &mut ctx.accounts.rfq_state;
        let protocol: &mut Account<Protocol> = &mut ctx.accounts.protocol;

        let taker_address = rfq_state.taker_address;
        let order_state: &mut Account<OrderState> = &mut ctx.accounts.order_state;
        let authority_address = *ctx.accounts.authority.to_account_info().key;
        let confirm_order_type = rfq_state.confirm_order_type;

        require!(rfq_state.confirmed == true, Err(ErrorCode::TradeNotConfirmed.into()));
        require!(rfq_state.approved == true, Err(ErrorCode::TradeNotApproved.into()));

        let asset_seed = &[b"escrow_asset", name_seed(&title)];
        let quote_seed = &[b"escrow_quote", name_seed(&title)];
        let (_escrow_asset_token, asset_bump) = Pubkey::find_program_address(asset_seed, ctx.program_id);
        let (_escrow_quote_token, quote_bump) = Pubkey::find_program_address(quote_seed, ctx.program_id);
        let asset_full_seed = &[b"escrow_asset", name_seed(&title), &[asset_bump]];
        let quote_full_seed = &[b"escrow_quote", name_seed(&title), &[quote_bump]];

        let (_rfq_pda, rfq_bump) = Pubkey::find_program_address(
            &[b"rfq_state", name_seed(&title)],
            ctx.program_id,
        );
        let rfq_full_seed = &[b"rfq_state", name_seed(&title), &[rfq_bump]];

        let is_taker_address = authority_address == taker_address;

        if is_taker_address && confirm_order_type == 1 {
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
                rfq_state.order_amount,
            )?;
        }

        if is_taker_address && confirm_order_type == 2 {
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
                rfq_state.best_bid_amount,
            )?;
        }
        
        if confirm_order_type == 1 && (rfq_state.best_ask_amount == order_state.ask) {
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
                order_state.ask,
            )?;
        }

        if confirm_order_type == 2 && (rfq_state.best_bid_amount == order_state.bid) {
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
                rfq_state.order_amount,
            )?;
        }

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        init,
        payer = authority,
        seeds = [b"convergence_rfq"],
        space = 1024,
        bump
    )]
    pub protocol: Account<'info, Protocol>,
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
    #[account(
        init_if_needed,
        payer = authority,
        seeds = [b"convergence_rfq"],
        space = 1024,
        bump
    )]
    pub protocol: Account<'info, Protocol>,
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
        space = 64 + 64 + 8,
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
pub struct LastLook<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        init_if_needed,
        payer = authority,
        seeds = [b"order_state", &authority.key().to_bytes()[..]],
        space = 64 + 64 + 8,
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
pub struct ReturnCollateral<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        init_if_needed,
        payer = authority,
        seeds = [b"order_state", &authority.key().to_bytes()[..]],
        space = 64 + 64 + 8,
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
        space = 64 + 64 + 8,
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
    #[account(
        init_if_needed,
        payer = authority,
        seeds = [b"convergence_rfq"],
        space = 1024,
        bump
    )]
    pub protocol: Account<'info, Protocol>,
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
    pub title: String,
    pub instrument: u8,
    pub expiry: i64, // 30 secs?
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

/// Global state for the entire RFQ system
#[account]
pub struct Protocol {
    pub rfq_count: u64,
    pub access_manager_count: u64,
    pub authority: Pubkey,
    pub fee_denominator: u64,
    pub fee_numerator: u64,
    pub titles: Vec<String>,
    pub treasury_wallet: Pubkey,
}

/// MM order state
#[account]
pub struct OrderState {
    pub ask: u64, //ask collateral
    pub bid: u64, //bid collateral
    pub collateral_returned: bool,
}

pub fn name_seed(name: &str) -> &[u8] {
    let b = name.as_bytes();
    if b.len() > 32 { 
        &b[0..32] 
    } else { 
        b 
    }
}

#[error]
pub enum ErrorCode {
    #[msg("Invalid quote type")]
    InvalidQuoteType,
    #[msg("Invalid taker address")]
    InvalidTakerAddress,
    #[msg("Trade has not been confirmed by taker")]
    TradeNotConfirmed,
    #[msg("Trade has not been approved (last look) by maker")]
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