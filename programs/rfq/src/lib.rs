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

    /// Taker requests quote.
    ///
    /// request_order
    /// instrument
    /// expiry
    /// amount
    pub fn request(
        ctx: Context<Request>,
        request_order: Order,
        instrument: Instrument,
        expiry: i64,
        amount: u64,
    ) -> Result<()> {
        let protocol = &mut ctx.accounts.protocol;
        protocol.rfq_count += 1;

        let rfq = &mut ctx.accounts.rfq;
        rfq.asset_escrow_bump = *ctx.bumps.get(ASSET_ESCROW_SEED).unwrap();
        rfq.approved = false;
        rfq.best_ask_amount = U64_UPPER_LIMIT;
        rfq.best_bid_amount = 0;
        rfq.bump = *ctx.bumps.get(RFQ_SEED).unwrap();
        rfq.expired = false;
        rfq.expiry = expiry;
        rfq.id = ctx.accounts.protocol.rfq_count;
        rfq.instrument = instrument;
        rfq.order_amount = amount;
        rfq.quote_escrow_bump = *ctx.bumps.get(QUOTE_ESCROW_SEED).unwrap();
        rfq.request_order = request_order;
        rfq.response_count = 0;
        rfq.taker_address = *ctx.accounts.authority.key;
        rfq.time_begin = Clock::get().unwrap().unix_timestamp;

        Ok(())
    }

    /// Maker responds with one-way or two-way quotes.
    ///
    /// ctx
    /// bid
    /// ask
    #[access_control(respond_access_control(&ctx, bid, ask))]
    pub fn respond(ctx: Context<Respond>, bid: u64, ask: u64) -> Result<()> {
        let rfq = &mut ctx.accounts.rfq;
        let order_amount = rfq.order_amount;
        rfq.response_count += 1;
        rfq.time_response = Clock::get().unwrap().unix_timestamp;

        let order = &mut ctx.accounts.order;
        let authority = ctx.accounts.authority.key();
        order.authority = authority;
        order.bump = *ctx.bumps.get(ORDER_SEED).unwrap();
        order.id = rfq.response_count;

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
    #[access_control(confirm_access_control(&ctx, confirm_order))]
    pub fn confirm(ctx: Context<Confirm>, confirm_order: Order) -> Result<()> {
        let order = &mut ctx.accounts.order;
        order.bump = *ctx.bumps.get(ORDER_SEED).unwrap();
        order.id = 0;

        let rfq = &mut ctx.accounts.rfq;
        rfq.confirmed = true;
        rfq.confirm_order = confirm_order;

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
                    rfq.best_ask_amount,
                )?;
            }
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
                    rfq.best_bid_amount,
                )?;
            }
            Order::TwoWay => return Err(error!(ProtocolError::NotImplemented)),
        }

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
            Order::TwoWay => return Err(error!(ProtocolError::NotImplemented)),
        };

        if is_winner {
            rfq.approved = true;
        }

        Ok(())
    }

    /// Return collateral of non-winning makers.
    ///
    /// ctx
    #[access_control(return_collateral_access_control(&ctx))]
    pub fn return_collateral(ctx: Context<ReturnCollateral>) -> Result<()> {
        let rfq = &ctx.accounts.rfq;
        let order = &mut ctx.accounts.order;
        order.collateral_returned = true;

        if order.ask != 0 && (rfq.best_ask_amount != order.ask || rfq.confirm_order == Order::Sell)
        {
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
                            &[rfq.asset_escrow_bump],
                        ][..],
                        &[
                            RFQ_SEED.as_bytes(),
                            rfq.id.to_string().as_bytes(),
                            &[rfq.bump],
                        ][..],
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
                            &[rfq.quote_escrow_bump],
                        ][..],
                        &[
                            RFQ_SEED.as_bytes(),
                            rfq.id.to_string().as_bytes(),
                            &[rfq.bump],
                        ][..],
                    ],
                ),
                order.bid,
            )?;
        }

        Ok(())
    }

    /// Settles winning maker and taker fund transfers.
    ///
    /// ctx
    #[access_control(settle_access_control(&ctx))]
    pub fn settle(ctx: Context<Settle>) -> Result<()> {
        let rfq = &ctx.accounts.rfq;
        let confirm_order = rfq.confirm_order;
        let taker_address = rfq.taker_address;

        let order = &ctx.accounts.order;
        let authority_address = *ctx.accounts.authority.to_account_info().key;

        if authority_address == taker_address && confirm_order == Order::Buy {
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
                            &[rfq.asset_escrow_bump],
                        ][..],
                        &[
                            RFQ_SEED.as_bytes(),
                            rfq.id.to_string().as_bytes(),
                            &[rfq.bump],
                        ][..],
                    ],
                ),
                rfq.order_amount,
            )?;
        }

        if authority_address == taker_address && confirm_order == Order::Sell {
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
                            &[rfq.quote_escrow_bump],
                        ][..],
                        &[
                            RFQ_SEED.as_bytes(),
                            rfq.id.to_string().as_bytes(),
                            &[rfq.bump],
                        ][..],
                    ],
                ),
                rfq.best_bid_amount,
            )?;
        }

        if rfq.best_ask_amount == order.ask && confirm_order == Order::Buy {
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
                            &[rfq.quote_escrow_bump],
                        ][..],
                        &[
                            RFQ_SEED.as_bytes(),
                            rfq.id.to_string().as_bytes(),
                            &[rfq.bump],
                        ][..],
                    ],
                ),
                order.ask,
            )?;
        }

        if rfq.best_bid_amount == order.bid && confirm_order == Order::Sell {
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
                            &[rfq.asset_escrow_bump],
                        ][..],
                        &[
                            RFQ_SEED.as_bytes(),
                            rfq.id.to_string().as_bytes(),
                            &[rfq.bump],
                        ][..],
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
    pub asset_escrow_bump: u8,
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
    pub instrument: Instrument,
    pub order_amount: u64,
    pub quote_escrow_bump: u8,
    pub quote_mint: Pubkey,
    pub response_count: u64,
    pub request_order: Order,
    pub taker_address: Pubkey,
    pub time_begin: i64,
    pub time_response: i64,
}

impl RfqState {
    pub const LEN: usize = 8 + (32 * 5) + (8 * 8) + (1 * 6) + (1 * 3);
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
    // Ask collateral
    pub ask: u64,
    pub authority: Pubkey,
    // Bid collateral
    pub bid: u64,
    pub bump: u8,
    pub collateral_returned: bool,
    pub id: u64,
}

impl OrderState {
    pub const LEN: usize = 8 + (32 * 1) + (8 * 3) + (1 * 1) + (1 * 1);
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
    #[account(
        init,
        payer = authority,
        token::mint = asset_mint,
        token::authority = rfq,
        seeds = [
            ASSET_ESCROW_SEED.as_bytes(),
            (protocol.rfq_count + 1).to_string().as_bytes()
        ],
        bump
    )]
    pub asset_escrow: Account<'info, TokenAccount>,
    pub asset_mint: Box<Account<'info, Mint>>,
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        mut,
        seeds = [PROTOCOL_SEED.as_bytes()],
        bump = protocol.bump
    )]
    pub protocol: Account<'info, ProtocolState>,
    #[account(
        init,
        payer = authority,
        token::mint = quote_mint,
        token::authority = rfq,
        seeds = [
            QUOTE_ESCROW_SEED.as_bytes(),
            (protocol.rfq_count + 1).to_string().as_bytes()
        ],
        bump
    )]
    pub quote_escrow: Account<'info, TokenAccount>,
    pub quote_mint: Box<Account<'info, Mint>>,
    pub rent: Sysvar<'info, Rent>,
    #[account(
        init,
        payer = authority,
        seeds = [
            RFQ_SEED.as_bytes(),
            (protocol.rfq_count + 1).to_string().as_bytes()
        ],
        space = RfqState::LEN,
        bump
    )]
    pub rfq: Box<Account<'info, RfqState>>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
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
            (rfq.response_count + 1).to_string().as_bytes()
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
        mut,
        seeds = [ASSET_ESCROW_SEED.as_bytes(), rfq.id.to_string().as_bytes()],
        bump = rfq.asset_escrow_bump
    )]
    pub asset_escrow: Box<Account<'info, TokenAccount>>,
    #[account(
        mut,
        seeds = [QUOTE_ESCROW_SEED.as_bytes(), rfq.id.to_string().as_bytes()],
        bump = rfq.quote_escrow_bump
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
        mut,
        seeds = [ASSET_ESCROW_SEED.as_bytes(), rfq.id.to_string().as_bytes()],
        bump = rfq.asset_escrow_bump,
    )]
    pub asset_escrow: Box<Account<'info, TokenAccount>>,
    // TODO: Is this actually an order or is there a better way?
    #[account(
        init,
        payer = authority,
        space = OrderState::LEN,
        seeds = [
            ORDER_SEED.as_bytes(),
            rfq.id.to_string().as_bytes(),
            b"0"
        ],
        bump
    )]
    pub order: Box<Account<'info, OrderState>>,
    #[account(
        mut,
        seeds = [QUOTE_ESCROW_SEED.as_bytes(), rfq.id.to_string().as_bytes()],
        bump = rfq.quote_escrow_bump
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
        seeds = [ASSET_ESCROW_SEED.as_bytes(), rfq.id.to_string().as_bytes()],
        bump = rfq.asset_escrow_bump
    )]
    pub asset_escrow: Box<Account<'info, TokenAccount>>,
    // Maker does not have an order so use this for now
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
        seeds = [QUOTE_ESCROW_SEED.as_bytes(), rfq.id.to_string().as_bytes()],
        bump = rfq.quote_escrow_bump
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
        seeds = [ASSET_ESCROW_SEED.as_bytes(), rfq.id.to_string().as_bytes()],
        bump = rfq.asset_escrow_bump
    )]
    pub asset_escrow: Box<Account<'info, TokenAccount>>,
    #[account(
        mut,
        seeds = [QUOTE_ESCROW_SEED.as_bytes(), rfq.id.to_string().as_bytes()],
        bump = rfq.quote_escrow_bump
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

/// Types

#[derive(AnchorSerialize, AnchorDeserialize, Copy, Clone, Debug, PartialEq, Eq)]
pub enum Order {
    Buy,
    Sell,
    TwoWay,
}

#[derive(AnchorSerialize, AnchorDeserialize, Copy, Clone, Debug, PartialEq, Eq)]
pub enum Instrument {
    Call,
    Future,
    Put,
    Spot,
}

/// Access controls

pub fn settle_access_control<'info>(ctx: &Context<Settle<'info>>) -> Result<()> {
    require!(ctx.accounts.rfq.confirmed, ProtocolError::TradeNotConfirmed);
    require!(ctx.accounts.rfq.approved, ProtocolError::TradeNotApproved);
    Ok(())
}

pub fn confirm_access_control<'info>(
    ctx: &Context<Confirm<'info>>,
    confirm_order: Order,
) -> Result<()> {
    let rfq = &ctx.accounts.rfq;
    let taker_address = rfq.taker_address;
    let request_order = rfq.request_order;
    let authority = ctx.accounts.authority.key();

    // Make sure current authority matches original taker address from request instruction
    require!(
        taker_address == authority,
        ProtocolError::InvalidTakerAddress
    );

    match request_order {
        Order::Buy => require!(confirm_order == Order::Buy, ProtocolError::InvalidOrder),
        Order::Sell => require!(confirm_order == Order::Sell, ProtocolError::InvalidOrder),
        Order::TwoWay => require!(confirm_order == Order::TwoWay, ProtocolError::InvalidOrder),
    }

    Ok(())
}

pub fn respond_access_control<'info>(
    ctx: &Context<Respond<'info>>,
    bid: u64,
    ask: u64,
) -> Result<()> {
    let rfq = &ctx.accounts.rfq;
    let expiry = rfq.expiry;
    let order_amount = rfq.order_amount;
    let time_begin = rfq.time_begin;
    let unix_timestamp = Clock::get().unwrap().unix_timestamp;
    let delay = unix_timestamp - time_begin;

    require!(delay < expiry, ProtocolError::ResponseTimeElapsed);
    require!(bid > 0 || ask > 0, ProtocolError::InvalidQuote);
    require!(order_amount > 0, ProtocolError::InvalidOrderAmount);

    Ok(())
}

pub fn return_collateral_access_control<'info>(ctx: &Context<ReturnCollateral>) -> Result<()> {
    let rfq = &ctx.accounts.rfq;
    let order = &ctx.accounts.order;

    require!(rfq.confirmed, ProtocolError::TradeNotConfirmed);
    require!(!order.collateral_returned, ProtocolError::TradeNotConfirmed);

    Ok(())
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
    #[msg("Invalid order amount")]
    InvalidOrderAmount,
    #[msg("Not implemented")]
    NotImplemented,
    #[msg("Trade has not been confirmed by taker")]
    TradeNotConfirmed,
    #[msg("Trade has not been approved via last look by maker")]
    TradeNotApproved,
    #[msg("Timed out on response to request")]
    ResponseTimeElapsed,
}
