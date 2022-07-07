///! Contexts
use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};
use std::mem;

use crate::constants::*;
use crate::states::*;

/// Intializes protocol.
#[derive(Accounts)]
pub struct Initialize<'info> {
    /// Signer
    #[account(mut)]
    pub signer: Signer<'info>,
    /// Protocol
    #[account(
        init,
        payer = signer,
        seeds = [PROTOCOL_SEED.as_bytes()],
        space = 8 + mem::size_of::<ProtocolState>(),
        bump
    )]
    pub protocol: Account<'info, ProtocolState>,
    /// Solana system program
    pub system_program: Program<'info, System>,
}

/// Sets fee.
#[derive(Accounts)]
pub struct SetFee<'info> {
    /// Signer
    #[account(mut)]
    pub signer: Signer<'info>,
    /// Protocol
    #[account(
        mut,
        seeds = [PROTOCOL_SEED.as_bytes()],
        bump = protocol.bump,
        constraint = protocol.to_account_info().owner == program_id
    )]
    pub protocol: Account<'info, ProtocolState>,
}

/// Initialize leg.
#[derive(Accounts)]
#[instruction(
    base_amount: u64,
    instrument: Instrument,
    rfq: Pubkey,
    side: Side,
    venue: Venue,
)]
pub struct InitializeLeg<'info> {
    /// Protocol
    #[account(
        seeds = [PROTOCOL_SEED.as_bytes()],
        bump = protocol.bump,
        constraint = protocol.to_account_info().owner == program_id
    )]
    pub protocol: Account<'info, ProtocolState>,
    /// Leg
    #[account(
        init,
        payer = signer,
        seeds = [
            LEG_SEED.as_bytes(),
            rfq.as_ref(),
            &base_amount.to_le_bytes(),
        ],
        space = 8 + mem::size_of::<LegState>(),
        bump
    )]
    pub leg: Box<Account<'info, LegState>>,
    /// Signer
    #[account(mut)]
    pub signer: Signer<'info>,
    /// Solana system program
    pub system_program: Program<'info, System>,
}

/// Requests quote (RFQ).
#[derive(Accounts)]
#[instruction(
    access_manager: Option<Pubkey>,
    expiry: i64,
    last_look: bool,
    order_amount: u64,
    order_type: Order,
)]
pub struct Request<'info> {
    /// Asset escrow
    #[account(
        init,
        payer = signer,
        seeds = [ASSET_ESCROW_SEED.as_bytes(), rfq.key().as_ref()],
        space = 8 + mem::size_of::<TokenAccount>(),
        bump
    )]
    pub asset_escrow: Account<'info, TokenAccount>,
    /// Protocol
    #[account(
        mut,
        seeds = [PROTOCOL_SEED.as_bytes()],
        bump = protocol.bump,
        constraint = protocol.to_account_info().owner == program_id
    )]
    pub protocol: Account<'info, ProtocolState>,
    /// Quote escrow
    #[account(
        init,
        payer = signer,
        seeds = [QUOTE_ESCROW_SEED.as_bytes(), rfq.key().as_ref()],
        space = 8 + mem::size_of::<TokenAccount>(),
        bump
    )]
    pub quote_escrow: Account<'info, TokenAccount>,
    /// Rent
    pub rent: Sysvar<'info, Rent>,
    /// RFQ
    #[account(
        init,
        payer = signer,
        seeds = [
            RFQ_SEED.as_bytes(),
            signer.key().as_ref(),
            &order_amount.to_le_bytes(),
            &expiry.to_le_bytes()
        ],
        space = 8 + mem::size_of::<RfqState>(),
        bump
    )]
    pub rfq: Box<Account<'info, RfqState>>,
    /// Signer
    #[account(mut)]
    pub signer: Signer<'info>,
    /// Solana system program
    pub system_program: Program<'info, System>,
    /// Solana token program
    pub token_program: Program<'info, Token>,
}

/// Cancels RFQ.
#[derive(Accounts)]
pub struct Cancel<'info> {
    /// Protocol
    #[account(
        seeds = [PROTOCOL_SEED.as_bytes()],
        bump = protocol.bump,
        constraint = protocol.to_account_info().owner == program_id
    )]
    pub protocol: Account<'info, ProtocolState>,
    /// RFQ
    #[account(
        mut,
        seeds = [
            RFQ_SEED.as_bytes(),
            rfq.authority.key().as_ref(),
            &rfq.order_amount.to_le_bytes(),
            &rfq.expiry.to_le_bytes()
        ],
        bump = rfq.bump
    )]
    pub rfq: Box<Account<'info, RfqState>>,
    /// Signer
    #[account(mut)]
    pub signer: Signer<'info>,
}

/// Responds to quote.
#[derive(Accounts)]
#[instruction(bid: Option<u64>, ask: Option<u64>)]
pub struct Respond<'info> {
    /// Authority
    #[account(mut)]
    pub signer: Signer<'info>,
    /// Order
    #[account(
        init,
        payer = signer,
        seeds = [
            ORDER_SEED.as_bytes(),
            rfq.key().as_ref(),
            signer.key().as_ref(),
            &bid.unwrap_or(0).to_le_bytes(),
            &ask.unwrap_or(0).to_le_bytes(),
        ],
        space = 8 + mem::size_of::<OrderState>(),
        bump
    )]
    pub order: Box<Account<'info, OrderState>>,
    /// RFQ
    #[account(
        mut,
        seeds = [
            RFQ_SEED.as_bytes(),
            rfq.authority.key().as_ref(),
            &rfq.order_amount.to_le_bytes(),
            &rfq.expiry.to_le_bytes()    
        ],
        bump = rfq.bump,
        constraint = rfq.to_account_info().owner == program_id
    )]
    pub rfq: Box<Account<'info, RfqState>>,
    /// Asset wallet
    #[account(
        mut, 
        //constraint = asset_wallet.mint == rfq.asset_mint,
        constraint = asset_wallet.owner.key() == signer.key()
    )]
    pub asset_wallet: Box<Account<'info, TokenAccount>>,
    /// Quote wallet
    #[account(
        mut, 
        //constraint = quote_wallet.mint == rfq.quote_mint,
        constraint = quote_wallet.owner.key() == signer.key()
    )]
    pub quote_wallet: Box<Account<'info, TokenAccount>>,
    /// Asset escrow
    #[account(
        mut,
        seeds = [ASSET_ESCROW_SEED.as_bytes(), rfq.key().as_ref()],
        bump = rfq.asset_escrow_bump,
        constraint = asset_escrow.owner.key() == rfq.key(),
        //constraint = asset_escrow.mint == rfq.asset_mint
    )]
    pub asset_escrow: Box<Account<'info, TokenAccount>>,
    /// Quote escrow
    #[account(
        mut,
        seeds = [QUOTE_ESCROW_SEED.as_bytes(), rfq.key().as_ref()],
        bump = rfq.quote_escrow_bump,
        constraint = quote_escrow.owner == rfq.key(),
        //constraint = quote_escrow.mint == rfq.quote_mint
    )]
    pub quote_escrow: Box<Account<'info, TokenAccount>>,
    /// Asset mint
    #[account(
        mut, 
        //constraint = asset_mint.key() == rfq.asset_mint.key()
    )]
    pub asset_mint: Box<Account<'info, Mint>>,
    /// Quote mint
    #[account(
        mut, 
        //constraint = quote_mint.key() == rfq.quote_mint.key()
    )]
    pub quote_mint: Box<Account<'info, Mint>>,
    /// System program
    pub system_program: Program<'info, System>,
    /// Token program
    pub token_program: Program<'info, Token>,
    /// Rent
    pub rent: Sysvar<'info, Rent>,
}

/// Confirms RFQ response.
#[derive(Accounts)]
pub struct Confirm<'info> {
    /// Asset escrow
    #[account(
        mut,
        seeds = [ASSET_ESCROW_SEED.as_bytes(), rfq.key().as_ref()],
        bump = rfq.asset_escrow_bump,
        constraint = asset_escrow.owner.key() == rfq.key(),
        //constraint = asset_escrow.mint == rfq.asset_mint
    )]
    pub asset_escrow: Box<Account<'info, TokenAccount>>,
    /// Asset mint
    #[account(
        mut,
        //constraint = asset_mint.key() == rfq.asset_mint.key()
    )]
    pub asset_mint: Box<Account<'info, Mint>>,
    /// Asset wallet
    #[account(
        mut,
        //constraint = asset_wallet.mint == rfq.asset_mint,
        constraint = asset_wallet.owner.key() == signer.key()
    )]
    pub asset_wallet: Box<Account<'info, TokenAccount>>,
    /// Order
    #[account(
        mut,
        seeds = [
            ORDER_SEED.as_bytes(),
            rfq.key().as_ref(),
            order.authority.key().as_ref(),
            &order.bid.unwrap_or(0).to_le_bytes(),
            &order.ask.unwrap_or(0).to_le_bytes(),
        ],
        bump = order.bump,
        constraint = order.to_account_info().owner == program_id
    )]
    pub order: Box<Account<'info, OrderState>>,
    /// Quote escrow
    #[account(
        mut,
        seeds = [QUOTE_ESCROW_SEED.as_bytes(), rfq.key().as_ref()],
        bump = rfq.quote_escrow_bump,
        constraint = quote_escrow.owner.key() == rfq.key(),
        //constraint = quote_escrow.mint == rfq.quote_mint
    )]
    pub quote_escrow: Box<Account<'info, TokenAccount>>,
    /// Quote mint
    #[account(
        mut,
        //constraint = quote_wallet.mint == rfq.quote_mint
    )]
    pub quote_mint: Box<Account<'info, Mint>>,
    /// Quote wallet
    #[account(
        mut,
        //constraint = quote_wallet.mint == rfq.quote_mint,
        constraint = quote_wallet.owner.key() == signer.key()
    )]
    pub quote_wallet: Box<Account<'info, TokenAccount>>,
    /// Rent
    pub rent: Sysvar<'info, Rent>,
    /// RFQ
    #[account(
        mut,
        seeds = [
            RFQ_SEED.as_bytes(),
            rfq.authority.key().as_ref(),
            &rfq.order_amount.to_le_bytes(),
            &rfq.expiry.to_le_bytes()
        ],
        bump = rfq.bump,
        constraint = rfq.to_account_info().owner == program_id
    )]
    pub rfq: Box<Account<'info, RfqState>>,
    /// Signer
    #[account(mut)]
    pub signer: Signer<'info>,
    /// System program
    pub system_program: Program<'info, System>,
    /// Token program
    pub token_program: Program<'info, Token>,
}

/// Last look for RFQ.
#[derive(Accounts)]
pub struct LastLook<'info> {
    /// Order
    #[account(
        mut,
        seeds = [
            ORDER_SEED.as_bytes(),
            rfq.key().as_ref(),
            order.authority.key().as_ref(),
            &order.bid.unwrap_or(0).to_le_bytes(),
            &order.ask.unwrap_or(0).to_le_bytes(),
        ],
        bump = order.bump,
        constraint = order.to_account_info().owner == program_id
    )]
    pub order: Box<Account<'info, OrderState>>,
    /// RFQ
    #[account(
        mut,
        seeds = [
            RFQ_SEED.as_bytes(),
            rfq.authority.key().as_ref(),
            &rfq.order_amount.to_le_bytes(),
            &rfq.expiry.to_le_bytes()
        ],
        bump = rfq.bump,
        constraint = rfq.to_account_info().owner == program_id
    )]
    pub rfq: Box<Account<'info, RfqState>>,
    /// Signer
    #[account(mut)]
    pub signer: Signer<'info>,
}

/// Returns collateral.
#[derive(Accounts)]
pub struct ReturnCollateral<'info> {
    /// Asset escrow
    #[account(
        mut,
        seeds = [ASSET_ESCROW_SEED.as_bytes(), rfq.key().as_ref()],
        bump = rfq.asset_escrow_bump,
        constraint = asset_escrow.owner.key() == rfq.key(),
        //constraint = asset_escrow.mint == rfq.asset_mint
    )]
    pub asset_escrow: Box<Account<'info, TokenAccount>>,
    /// Asset mint
    #[account(
        mut, 
        //constraint = asset_mint.key() == rfq.asset_mint.key()
    )]
    pub asset_mint: Box<Account<'info, Mint>>,
    /// Asset wallet
    #[account(
        mut, 
        //constraint = asset_wallet.mint == rfq.asset_mint,
        constraint = asset_wallet.owner.key() == signer.key()
    )]
    pub asset_wallet: Box<Account<'info, TokenAccount>>,
    /// Order
    #[account(
        mut,
        seeds = [
            ORDER_SEED.as_bytes(),
            rfq.key().as_ref(),
            order.authority.key().as_ref(),
            &order.bid.unwrap_or(0).to_le_bytes(),
            &order.ask.unwrap_or(0).to_le_bytes(),
        ],
        bump = order.bump,
        constraint = order.to_account_info().owner == program_id
    )]
    pub order: Box<Account<'info, OrderState>>,
    /// Quote escrow
    #[account(
        mut,
        seeds = [QUOTE_ESCROW_SEED.as_bytes(), rfq.key().as_ref()],
        bump = rfq.quote_escrow_bump,
        constraint = quote_escrow.owner.key() == rfq.key(),
        //constraint = quote_escrow.mint == rfq.quote_mint
    )]
    pub quote_escrow: Box<Account<'info, TokenAccount>>,
    /// Quote mint
    #[account(
        mut, 
        //constraint = quote_mint.key() == rfq.quote_mint.key()
    )]
    pub quote_mint: Box<Account<'info, Mint>>,
    /// Quote wallet
    #[account(
        mut,
        //constraint = quote_wallet.mint == rfq.quote_mint,
        constraint = quote_wallet.owner.key() == signer.key()
    )]
    pub quote_wallet: Box<Account<'info, TokenAccount>>,
    /// Rent
    pub rent: Sysvar<'info, Rent>,
    /// RFQ
    #[account(
        mut,
        seeds = [
            RFQ_SEED.as_bytes(),
            rfq.authority.key().as_ref(),
            &rfq.order_amount.to_le_bytes(),
            &rfq.expiry.to_le_bytes()
        ],
        bump = rfq.bump,
        constraint = rfq.to_account_info().owner == program_id
    )]
    pub rfq: Box<Account<'info, RfqState>>,
    /// Signer
    #[account(mut)]
    pub signer: Signer<'info>,
    /// Solana token program
    pub token_program: Program<'info, Token>,
}

/// Settles RFQ.
#[derive(Accounts)]
pub struct Settle<'info> {
    /// Asset mint
    #[account(
        mut,
        //constraint = asset_mint.key() == rfq.asset_mint.key()
    )]
    pub asset_mint: Box<Account<'info, Mint>>,
    /// Asset wallet
    #[account(
        mut,
        //constraint = asset_wallet.mint == rfq.asset_mint,
        constraint = asset_wallet.owner.key() == signer.key()
    )]
    pub asset_wallet: Box<Account<'info, TokenAccount>>,
    #[account(
        mut,
        seeds = [ASSET_ESCROW_SEED.as_bytes(), rfq.key().as_ref()],
        bump = rfq.asset_escrow_bump,
        constraint = asset_escrow.owner.key() == rfq.key(),
        //constraint = asset_escrow.mint == rfq.asset_mint
    )]
    pub asset_escrow: Box<Account<'info, TokenAccount>>,
    /// Order
    #[account(
        mut,
        seeds = [
            ORDER_SEED.as_bytes(),
            rfq.key().as_ref(),
            order.authority.key().as_ref(),
            &order.bid.unwrap_or(0).to_le_bytes(),
            &order.ask.unwrap_or(0).to_le_bytes(),
        ],
        bump = order.bump,
        constraint = order.to_account_info().owner == program_id
    )]
    pub order: Box<Account<'info, OrderState>>,
    /// Protocol
    #[account(
        mut,
        seeds = [PROTOCOL_SEED.as_bytes()],
        bump = protocol.bump,
        constraint = protocol.to_account_info().owner == program_id
    )]
    pub protocol: Box<Account<'info, ProtocolState>>,
    /// Quote escrow
    #[account(
        mut,
        seeds = [QUOTE_ESCROW_SEED.as_bytes(), rfq.key().as_ref()],
        bump = rfq.quote_escrow_bump,
        constraint = quote_escrow.owner.key() == rfq.key(),
        //constraint = quote_escrow.mint == rfq.quote_mint
    )]
    pub quote_escrow: Box<Account<'info, TokenAccount>>,
    /// Quote mint
    #[account(
        mut,
        //constraint = quote_mint.key() == rfq.quote_mint.key()
    )]
    pub quote_mint: Box<Account<'info, Mint>>,
    /// Quote wallet
    #[account(
        mut, 
        //constraint = quote_wallet.mint == rfq.quote_mint,
        constraint = quote_wallet.owner.key() == signer.key()
    )]
    pub quote_wallet: Box<Account<'info, TokenAccount>>,
    /// RFQ
    #[account(
        mut,
        seeds = [
            RFQ_SEED.as_bytes(),
            rfq.authority.key().as_ref(),
            &rfq.order_amount.to_le_bytes(),
            &rfq.expiry.to_le_bytes()
        ],
        bump = rfq.bump,
        constraint = rfq.to_account_info().owner == program_id
    )]
    pub rfq: Box<Account<'info, RfqState>>,
    /// Rent
    pub rent: Sysvar<'info, Rent>,
    /// Signer
    #[account(mut)]
    pub signer: Signer<'info>,
    /// System program
    pub system_program: Program<'info, System>,
    /// Solana token program
    pub token_program: Program<'info, Token>,
    // Treasury wallet
    #[account(mut, constraint = treasury_wallet.owner.key() == protocol.authority.key())]
    pub treasury_wallet: Box<Account<'info, TokenAccount>>,
}
