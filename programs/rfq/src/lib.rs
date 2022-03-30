use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};
use solana_program::sysvar::clock::Clock;

declare_id!("6r538FKBpBtoGDSqLv2tL6HE3ffsWPBKSJ2QnnFpnFu2");

const U64_UPPER_LIMIT: u64 = 18446744073709551615;

// Do not use hyphens in seed
const ASSET_ESCROW_SEED: &str = "asset_escrow";
const ORDER_SEED: &str = "order";
const PROTOCOL_SEED: &str = "protocol";
const QUOTE_ESCROW_SEED: &str = "quote_escrow";
const RFQ_SEED: &str = "rfq";

#[program]
pub mod rfq {
    use super::*;
    
    /// Initializes protocol.
    ///
    /// fee_denominator Fee denominator
    /// fee_numerator Fee numerator
    pub fn initialize(
        ctx: Context<Initialize>,
        fee_denominator: u64,
        fee_numerator: u64,
    ) -> Result<()> {
        let protocol = &mut ctx.accounts.protocol;
        protocol.access_manager_count = 0;
        protocol.authority = ctx.accounts.authority.key();
        protocol.bump = *ctx.bumps.get(PROTOCOL_SEED).unwrap();
        protocol.fee_denominator = fee_denominator;
        protocol.fee_numerator = fee_numerator;
        protocol.rfq_count = 0;
        Ok(())
    }
    
    /// Request quote.
    ///
    /// request_order
    /// instrument
    /// expiry
    /// amount
    pub fn request(
        ctx: Context<Request>,
        request_order: Order,
        instrument: u8, 
        expiry: i64, 
        amount: u64, 
    ) -> Result<()> {
        let rfq = &mut ctx.accounts.rfq;
        rfq.approved = false;
        rfq.best_ask_amount = U64_UPPER_LIMIT;
        rfq.best_bid_amount = 0;
        rfq.bump = *ctx.bumps.get(RFQ_SEED).unwrap();
        rfq.expired = false;
        rfq.expiry = expiry;
        rfq.id = ctx.accounts.protocol.rfq_count;
        rfq.instrument = instrument;
        rfq.order_amount = amount;
        rfq.request_order = request_order;
        rfq.response_count = 0;
        rfq.taker_address = *ctx.accounts.authority.key;
        rfq.time_begin = Clock::get().unwrap().unix_timestamp;

        let protocol = &mut ctx.accounts.protocol;
        protocol.rfq_count += 1;

        Ok(())
    }

    /// Maker response with one-way or two-way quotes.
    ///
    /// ctx
    /// bid
    /// ask
    pub fn respond(ctx: Context<Respond>, bid: u64, ask: u64) -> Result<()> {
        let time_response = Clock::get().unwrap().unix_timestamp;

        let rfq = &mut ctx.accounts.rfq;
        let expiry = rfq.expiry;
        let order_amount = rfq.order_amount;
        let time_begin = rfq.time_begin;
        let authority = ctx.accounts.authority.key();

        let order = &mut ctx.accounts.order;
        order.asset_escrow_bump = *ctx.bumps.get(ASSET_ESCROW_SEED).unwrap();
        order.authority = authority;
        order.bump = *ctx.bumps.get(ORDER_SEED).unwrap();
        order.id = rfq.response_count;
        order.quote_escrow_bump = *ctx.bumps.get(QUOTE_ESCROW_SEED).unwrap();

        require!((time_response - time_begin) < expiry, ProtocolError::ResponseTimeElapsed);
        require!(bid > 0 || ask > 0, ProtocolError::InvalidQuote);

        rfq.response_count += 1;
        rfq.time_response = time_response;

        if ask > 0 {
            anchor_spl::token::transfer(
                CpiContext::new(
                    ctx.accounts.token_program.to_account_info(),
                    anchor_spl::token::Transfer {
                        from: ctx.accounts.asset_token.to_account_info(),
                        to: ctx.accounts.asset_escrow.to_account_info(),
                        authority: ctx.accounts.authority.to_account_info(),
                    },
                ),
                order_amount, // Collateral is an asset token amount
            )?;

            order.ask = ask;

            if ask < rfq.best_ask_amount {
                rfq.best_ask_amount = ask;
                rfq.best_ask_address = authority;
            }
        }

        if bid > 0 {
            anchor_spl::token::transfer(
                CpiContext::new(
                    ctx.accounts.token_program.to_account_info(),
                    anchor_spl::token::Transfer {
                        from: ctx.accounts.quote_token.to_account_info(),
                        to: ctx.accounts.quote_escrow.to_account_info(),
                        authority: ctx.accounts.authority.to_account_info(),
                    },
                ),
                bid, // Collateral is a quote token amount
            )?;
            
            order.bid = bid;

            if bid > rfq.best_bid_amount {
                rfq.best_bid_amount = bid;
                rfq.best_bid_address = authority;
            }
        } 

        Ok(())
    }

    /// Taker confirms order.
    ///
    /// ctx
    /// confirm_order
    pub fn confirm(ctx: Context<Confirm>, confirm_order: Order) -> Result<()> {
        // Check if valid best_bid or best_offer exists
        let rfq = &mut ctx.accounts.rfq;
        let best_bid_amount = rfq.best_bid_amount;
        let best_ask_amount = rfq.best_ask_amount;
        let taker_address = rfq.taker_address;
        let request_order = rfq.request_order;
        let authority = ctx.accounts.authority.key();

        // Make sure current authority matches original taker address from request instruction
        require!(taker_address == authority, ProtocolError::InvalidTakerAddress);

        match request_order {
            Order::Buy => require!(confirm_order == Order::Buy, ProtocolError::InvalidOrder),
            Order::Sell => require!(confirm_order == Order::Sell, ProtocolError::InvalidOrder),
            Order::TwoWay => require!(confirm_order == Order::TwoWay, ProtocolError::InvalidOrder),
        }   

        match confirm_order {
            Order::Buy => {
                // Taker wants to buy asset token, needs to post quote token as collateral 
                anchor_spl::token::transfer(
                    CpiContext::new(
                        ctx.accounts.token_program.to_account_info(),
                        anchor_spl::token::Transfer {
                            from: ctx.accounts.quote_token.to_account_info(),
                            to: ctx.accounts.quote_escrow.to_account_info(),
                            authority: ctx.accounts.authority.to_account_info(),
                        },
                    ),
                    best_ask_amount,
                )?;
            },
            Order::Sell => {
                anchor_spl::token::transfer(
                    CpiContext::new(
                        ctx.accounts.token_program.to_account_info(),
                        anchor_spl::token::Transfer {
                            from: ctx.accounts.asset_token.to_account_info(),
                            to: ctx.accounts.asset_escrow.to_account_info(),
                            authority: ctx.accounts.authority.to_account_info(),
                        },
                    ),
                    best_bid_amount,
                )?;
            },
            Order::TwoWay => return Err(error!(ProtocolError::NotImplemented)),
        }

        rfq.confirmed = true;
        rfq.confirm_order = confirm_order;

        Ok(())
    }

    /// Last look.
    ///
    /// ctx
    pub fn last_look(ctx: Context<LastLook>) -> Result<()> {
        let rfq = &mut ctx.accounts.rfq;
        let order = &ctx.accounts.order;
        
        let is_winner = match rfq.confirm_order {
            Order::Buy => rfq.best_ask_amount == order.ask,
            Order::Sell => rfq.best_bid_amount == order.bid,
            Order::TwoWay => return Err(error!(ProtocolError::NotImplemented))
        };
        
        if is_winner {
            rfq.approved = true;
        }

        Ok(())
    }

    /// Return collateral of non-winning makers.
    ///
    /// ctx
    pub fn return_collateral(ctx: Context<ReturnCollateral>) -> Result<()> {
        let rfq = &ctx.accounts.rfq;
        let order = &mut ctx.accounts.order;
        
        require!(rfq.confirmed, ProtocolError::TradeNotConfirmed);
        require!(!order.collateral_returned, ProtocolError::TradeNotConfirmed);

        if order.ask != 0 && (rfq.best_ask_amount != order.ask || rfq.confirm_order == Order::Sell) {
            anchor_spl::token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    anchor_spl::token::Transfer {
                        from: ctx.accounts.asset_escrow.to_account_info(),
                        to: ctx.accounts.asset_token.to_account_info(),
                        authority: rfq.to_account_info(),
                    },
                    &[
                        &[
                            ASSET_ESCROW_SEED.as_bytes(),
                            rfq.id.to_string().as_bytes(),
                            order.id.to_string().as_bytes(),
                            &[order.asset_escrow_bump]
                        ][..],
                        &[RFQ_SEED.as_bytes(), rfq.id.to_string().as_bytes(), &[rfq.bump]][..]
                    ],
                ),
                rfq.order_amount,
            )?;
        }

        if order.bid != 0 && (rfq.best_ask_amount != order.ask || rfq.confirm_order == Order::Buy) {
            anchor_spl::token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    anchor_spl::token::Transfer {
                        from: ctx.accounts.quote_escrow.to_account_info(),
                        to: ctx.accounts.quote_token.to_account_info(),
                        authority: rfq.to_account_info(),
                    },
                    &[
                        &[
                            QUOTE_ESCROW_SEED.as_bytes(),
                            rfq.id.to_string().as_bytes(), 
                            order.id.to_string().as_bytes(),
                            &[order.quote_escrow_bump]
                        ][..],
                        &[RFQ_SEED.as_bytes(), rfq.id.to_string().as_bytes(), &[rfq.bump]][..]
                    ],
                ),
                order.bid,
            )?;
        }

        order.collateral_returned = true;

        Ok(())
    }

    /// Settles winning maker and taker fund transfers.
    ///
    /// ctx
    pub fn settle(ctx: Context<Settle>) -> Result<()> {
        let rfq = &ctx.accounts.rfq;
        let taker_address = rfq.taker_address;

        let order = &mut ctx.accounts.order;
        let authority_address = *ctx.accounts.authority.to_account_info().key;
        let confirm_order = rfq.confirm_order;

        require!(rfq.confirmed, ProtocolError::TradeNotConfirmed);
        require!(rfq.approved, ProtocolError::TradeNotApproved);

        let is_taker_address = authority_address == taker_address;

        if is_taker_address && confirm_order == Order::Buy {
            anchor_spl::token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    anchor_spl::token::Transfer {
                        from: ctx.accounts.asset_escrow.to_account_info(),
                        to: ctx.accounts.asset_token.to_account_info(),
                        authority: rfq.to_account_info(),
                    },
                    &[
                        &[
                            ASSET_ESCROW_SEED.as_bytes(),
                            rfq.id.to_string().as_bytes(), 
                            order.id.to_string().as_bytes(),
                            &[order.asset_escrow_bump]
                        ][..],
                        &[RFQ_SEED.as_bytes(), rfq.id.to_string().as_bytes(), &[rfq.bump]][..]
                    ],
                ),
                rfq.order_amount,
            )?;
        }

        if is_taker_address && confirm_order == Order::Sell {
            anchor_spl::token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    anchor_spl::token::Transfer {
                        from: ctx.accounts.quote_escrow.to_account_info(),
                        to: ctx.accounts.quote_token.to_account_info(),
                        authority: rfq.to_account_info(),
                    },
                    &[
                        &[
                            QUOTE_ESCROW_SEED.as_bytes(),
                            rfq.id.to_string().as_bytes(),
                            order.id.to_string().as_bytes(),
                            &[order.quote_escrow_bump]
                        ][..],
                        &[RFQ_SEED.as_bytes(), rfq.id.to_string().as_bytes(), &[rfq.bump]][..]
                    ],
                ),
                rfq.best_bid_amount,
            )?;
        }
        
        if confirm_order == Order::Buy && (rfq.best_ask_amount == order.ask) {
            anchor_spl::token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    anchor_spl::token::Transfer {
                        from: ctx.accounts.quote_escrow.to_account_info(),
                        to: ctx.accounts.quote_token.to_account_info(),
                        authority: rfq.to_account_info(),
                    },
                    &[
                        &[
                            QUOTE_ESCROW_SEED.as_bytes(),
                            rfq.id.to_string().as_bytes(),
                            order.id.to_string().as_bytes(),
                            &[order.quote_escrow_bump]
                        ][..],
                        &[RFQ_SEED.as_bytes(), rfq.id.to_string().as_bytes(), &[rfq.bump]][..]
                    ],
                ),
                order.ask,
            )?;
        }

        if confirm_order == Order::Sell && (rfq.best_bid_amount == order.bid) {
            anchor_spl::token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    anchor_spl::token::Transfer {
                        from: ctx.accounts.asset_escrow.to_account_info(),
                        to: ctx.accounts.asset_token.to_account_info(),
                        authority: rfq.to_account_info(),
                    },
                    &[
                        &[
                            QUOTE_ESCROW_SEED.as_bytes(),
                            rfq.id.to_string().as_bytes(), 
                            order.id.to_string().as_bytes(),
                            &[order.asset_escrow_bump]
                        ][..],
                        &[RFQ_SEED.as_bytes(), rfq.id.to_string().as_bytes(), &[rfq.bump]][..]
                    ],
                ),
                rfq.order_amount,
            )?;
        }

        Ok(())
    }
}

/// State

/// Holds state of one RFQ
#[account]
pub struct RfqState { 
    pub approved: bool,
    pub asset_mint: Pubkey,
    pub best_ask_amount: u64,
    pub best_bid_amount: u64,
    pub best_ask_address: Pubkey,
    pub best_bid_address: Pubkey,
    pub bump: u8,
    pub confirm_order: Order,
    pub confirmed: bool,
    pub expired: bool,
    pub expiry: i64,
    pub id: u64,
    pub instrument: u8,
    pub order_amount: u64,
    pub quote_mint: Pubkey,
    pub response_count: u64,
    pub request_order: Order,
    pub taker_address: Pubkey,
    pub time_begin: i64,
    pub time_response: i64,
}

impl RfqState {
    pub const LEN: usize = 8 + (32 * 5) + (8 * 8) + (1 * 4) + (1 * 3);
}

/// Global state for the entire RFQ system
#[account]
pub struct ProtocolState {
    pub access_manager_count: u64,
    pub authority: Pubkey,
    pub bump: u8,
    pub fee_denominator: u64,
    pub fee_numerator: u64,
    pub rfq_count: u64,
    pub treasury_wallet: Pubkey,
}

impl ProtocolState {
    pub const LEN: usize = 8 + (32 * 2) + (8 * 4) + (1 * 1);
}

/// Market maker order state
#[account]
pub struct OrderState {
    pub ask: u64, // Ask collateral
    pub asset_escrow_bump: u8,
    pub authority: Pubkey,
    pub bid: u64, // Bid collateral
    pub bump: u8,
    pub collateral_returned: bool,
    pub id: u64,
    pub quote_escrow_bump: u8,
}

impl OrderState {
    pub const LEN: usize = 8 + (32 * 1) + (8 * 3) + (1 * 3) + (1 * 1);
}

/// Contexts

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        init,
        payer = authority,
        seeds = [PROTOCOL_SEED.as_bytes()],
        space = ProtocolState::LEN,
        bump
    )]
    pub protocol: Account<'info, ProtocolState>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Request<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        mut,
        seeds = [PROTOCOL_SEED.as_bytes()],
        bump = protocol.bump
    )]
    pub protocol: Account<'info, ProtocolState>,
    pub rent: Sysvar<'info, Rent>,
    #[account(
        init,
        payer = authority,
        seeds = [RFQ_SEED.as_bytes(), protocol.rfq_count.to_string().as_bytes()],
        space = RfqState::LEN,
        bump
    )]
    pub rfq: Box<Account<'info, RfqState>>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Respond<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        init,
        payer = authority,
        seeds = [
            ORDER_SEED.as_bytes(),
            rfq.id.to_string().as_bytes(),
            rfq.response_count.to_string().as_bytes()
        ],
        space = OrderState::LEN,
        bump
    )]
    pub order: Box<Account<'info, OrderState>>,
    #[account(
        mut,
        seeds = [RFQ_SEED.as_bytes(), rfq.id.to_string().as_bytes()],
        bump = rfq.bump
    )]
    pub rfq: Box<Account<'info, RfqState>>,
    #[account(mut)]
    pub asset_token: Box<Account<'info, TokenAccount>>,
    #[account(mut)]
    pub quote_token: Box<Account<'info, TokenAccount>>,
    #[account(
        init,
        payer = authority,
        token::mint = asset_mint,
        token::authority = rfq,
        seeds = [
            ASSET_ESCROW_SEED.as_bytes(), 
            rfq.id.to_string().as_bytes(),
            rfq.response_count.to_string().as_bytes()
        ],
        bump
    )]
    pub asset_escrow: Box<Account<'info, TokenAccount>>,
    #[account(
        init,
        payer = authority,
        token::mint = quote_mint,
        token::authority = rfq,
        seeds = [
            QUOTE_ESCROW_SEED.as_bytes(), 
            rfq.id.to_string().as_bytes(),
            rfq.response_count.to_string().as_bytes()
        ],
        bump
    )]
    pub quote_escrow: Box<Account<'info, TokenAccount>>,
    pub asset_mint: Box<Account<'info, Mint>>,
    pub quote_mint: Box<Account<'info, Mint>>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct Confirm<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        mut,
        seeds = [RFQ_SEED.as_bytes(), rfq.id.to_string().as_bytes()],
        bump = rfq.bump
    )]
    pub rfq: Box<Account<'info, RfqState>>,
    #[account(mut)]
    pub asset_token: Box<Account<'info, TokenAccount>>,
    pub asset_mint: Box<Account<'info, Mint>>,
    #[account(
        init,
        payer = authority,
        token::mint = asset_mint,
        token::authority = rfq,
        seeds = [ASSET_ESCROW_SEED.as_bytes(), rfq.id.to_string().as_bytes()],
        bump,
    )]
    pub asset_escrow: Box<Account<'info, TokenAccount>>, 
    #[account(
        init,
        payer = authority,
        token::mint = quote_mint,
        token::authority = rfq,
        seeds = [QUOTE_ESCROW_SEED.as_bytes(), rfq.id.to_string().as_bytes()],
        bump,
    )]
    pub quote_escrow: Box<Account<'info, TokenAccount>>, 
    pub quote_mint: Box<Account<'info, Mint>>,
    #[account(mut)]
    pub quote_token: Box<Account<'info, TokenAccount>>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct LastLook<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        mut,
        seeds = [
            ORDER_SEED.as_bytes(), 
            rfq.id.to_string().as_bytes(),
            order.id.to_string().as_bytes()
        ],
        bump = order.bump
    )]
    pub order: Box<Account<'info, OrderState>>,
    #[account(
        mut,
        seeds = [RFQ_SEED.as_bytes(), rfq.id.to_string().as_bytes()],
        bump = rfq.bump
    )]
    pub rfq: Box<Account<'info, RfqState>>,
}

#[derive(Accounts)]
pub struct ReturnCollateral<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    pub asset_mint: Box<Account<'info, Mint>>,
    #[account(mut)]
    pub asset_token: Box<Account<'info, TokenAccount>>,
    #[account(mut)]
    pub quote_token: Box<Account<'info, TokenAccount>>,
    #[account(
        mut,
        seeds = [
            ASSET_ESCROW_SEED.as_bytes(),
            rfq.id.to_string().as_bytes(),
            order.id.to_string().as_bytes()
        ],
        bump = order.asset_escrow_bump
    )]
    pub asset_escrow: Box<Account<'info, TokenAccount>>, 
    #[account(
        mut,
        seeds = [
            ORDER_SEED.as_bytes(),
            rfq.id.to_string().as_bytes(),
            order.id.to_string().as_bytes()
        ],
        bump = order.bump
    )]
    pub order: Box<Account<'info, OrderState>>,
    pub quote_mint: Box<Account<'info, Mint>>,
    #[account(
        mut,
        seeds = [
            QUOTE_ESCROW_SEED.as_bytes(),
            rfq.id.to_string().as_bytes(),
            order.id.to_string().as_bytes()
        ],
        bump = order.quote_escrow_bump
    )]
    pub quote_escrow: Box<Account<'info, TokenAccount>>, 
    pub rfq: Box<Account<'info, RfqState>>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct Settle<'info> {
    pub asset_mint: Box<Account<'info, Mint>>,
    #[account(mut)]
    pub asset_token: Box<Account<'info, TokenAccount>>,
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        mut,
        seeds = [
            ASSET_ESCROW_SEED.as_bytes(),
            rfq.id.to_string().as_bytes(),
            order.id.to_string().as_bytes()
        ],
        bump = order.asset_escrow_bump
    )]
    pub asset_escrow: Box<Account<'info, TokenAccount>>, 
    #[account(
        mut,
        seeds = [
            QUOTE_ESCROW_SEED.as_bytes(),
            rfq.id.to_string().as_bytes(),
            order.id.to_string().as_bytes()
        ],
        bump = order.quote_escrow_bump
    )]
    pub quote_escrow: Box<Account<'info, TokenAccount>>, 
    #[account(
        mut,
        seeds = [
            ORDER_SEED.as_bytes(), 
            rfq.id.to_string().as_bytes(),
            order.id.to_string().as_bytes()
        ],
        bump = order.bump
    )]
    pub order: Box<Account<'info, OrderState>>,
    #[account(
        mut,
        seeds = [RFQ_SEED.as_bytes(), rfq.id.to_string().as_bytes()],
        bump = rfq.bump
    )]
    pub rfq: Box<Account<'info, RfqState>>,
    #[account(mut)]
    pub quote_token: Box<Account<'info, TokenAccount>>,
    pub quote_mint: Box<Account<'info, Mint>>,
    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

/// Helpers

#[derive(
    AnchorSerialize,
    AnchorDeserialize, 
    Copy, 
    Clone,
    Debug, 
    PartialEq,
    Eq,
)]
pub enum Order {
    Buy,
    Sell,
    TwoWay
}

/// Error handling

#[error_code]
pub enum ProtocolError {
    #[msg("Invalid order logic")]
    InvalidOrder,
    #[msg("Invalid quote")]
    InvalidQuote,
    #[msg("Invalid taker address")]
    InvalidTakerAddress,
    #[msg("Not implemented")]
    NotImplemented,
    #[msg("Trade has not been confirmed by taker")]
    TradeNotConfirmed,
    #[msg("Trade has not been approved via last look by maker")]
    TradeNotApproved,
    #[msg("Timed out on response to request")]
    ResponseTimeElapsed,
}