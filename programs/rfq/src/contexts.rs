///! Contexts
use std::mem;
use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

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

/// Requests quote (RFQ).
#[derive(Accounts)]
pub struct Request<'info> {
    /// Asset escrow
    #[account(
        init,
        payer = signer,
        token::mint = asset_mint,
        token::authority = rfq,
        seeds = [ASSET_ESCROW_SEED.as_bytes(), (protocol.rfq_count + 1).to_string().as_bytes()],
        bump
    )]
    pub asset_escrow: Account<'info, TokenAccount>,
    /// Asset mint
    #[account(constraint = asset_mint.key() == asset_escrow.mint.key())]
    pub asset_mint: Box<Account<'info, Mint>>,
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
        token::mint = quote_mint,
        token::authority = rfq,
        seeds = [QUOTE_ESCROW_SEED.as_bytes(), (protocol.rfq_count + 1).to_string().as_bytes()],
        bump
    )]
    pub quote_escrow: Account<'info, TokenAccount>,
    /// Quote mint
    #[account(constraint = quote_mint.key() == quote_escrow.mint.key())]
    pub quote_mint: Box<Account<'info, Mint>>,
    /// Rent
    pub rent: Sysvar<'info, Rent>,
    /// RFQ
    #[account(
        init,
        payer = signer,
        seeds = [RFQ_SEED.as_bytes(), (protocol.rfq_count + 1).to_string().as_bytes()],
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

/// Responds to quote.
#[derive(Accounts)]
pub struct Respond<'info> {
    /// Authority
    #[account(mut)]
    pub signer: Signer<'info>,
    /// Order
    #[account(
        init,
        payer = signer,
        seeds = [ORDER_SEED.as_bytes(), rfq.id.to_string().as_bytes(), (rfq.response_count + 1).to_string().as_bytes()],
        space = 8 + mem::size_of::<OrderState>(),
        bump
    )]
    pub order: Box<Account<'info, OrderState>>,
    /// RFQ 
    #[account(
        mut,
        seeds = [RFQ_SEED.as_bytes(), rfq.id.to_string().as_bytes()],
        bump = rfq.bump,
        constraint = rfq.to_account_info().owner == program_id
    )]
    pub rfq: Box<Account<'info, RfqState>>,
    /// Asset wallet
    #[account(mut, constraint = asset_wallet.mint == rfq.asset_mint)]
    pub asset_wallet: Box<Account<'info, TokenAccount>>,
    /// Quote wallet
    #[account(mut, constraint = quote_wallet.mint == rfq.quote_mint)]
    pub quote_wallet: Box<Account<'info, TokenAccount>>,
    /// Asset escrow
    #[account(
        mut,
        seeds = [ASSET_ESCROW_SEED.as_bytes(), rfq.id.to_string().as_bytes()],
        bump = rfq.asset_escrow_bump,
        constraint = asset_escrow.owner.key() == rfq.key()
    )]
    pub asset_escrow: Box<Account<'info, TokenAccount>>,
    /// Quote escrow
    #[account(
        mut,
        seeds = [QUOTE_ESCROW_SEED.as_bytes(), rfq.id.to_string().as_bytes()],
        bump = rfq.quote_escrow_bump,
        constraint = quote_escrow.owner == rfq.key(),
    )]
    pub quote_escrow: Box<Account<'info, TokenAccount>>,
    /// Asset mint
    #[account(mut, constraint = asset_mint.key() == rfq.asset_mint.key())]
    pub asset_mint: Box<Account<'info, Mint>>,
    /// Quote mint
    #[account(mut, constraint = quote_mint.key() == rfq.quote_mint.key())]
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
        seeds = [ASSET_ESCROW_SEED.as_bytes(), rfq.id.to_string().as_bytes()],
        bump = rfq.asset_escrow_bump,
        constraint = asset_escrow.owner.key() == rfq.key()
    )]
    pub asset_escrow: Box<Account<'info, TokenAccount>>,
    /// Asset mint
    #[account(mut, constraint = asset_mint.key() == rfq.asset_mint.key())]
    pub asset_mint: Box<Account<'info, Mint>>,
    /// Asset wallet
    #[account(mut, constraint = asset_mint.key() == rfq.asset_mint.key())]
    pub asset_wallet: Box<Account<'info, TokenAccount>>,
    /// Order
    #[account(
        mut,
        seeds = [ORDER_SEED.as_bytes(), rfq.id.to_string().as_bytes(), order.id.to_string().as_bytes()],
        bump = order.bump,
        constraint = order.to_account_info().owner == program_id
    )]
    pub order: Box<Account<'info, OrderState>>,
    /// Quote escrow
    #[account(
        mut,
        seeds = [QUOTE_ESCROW_SEED.as_bytes(), rfq.id.to_string().as_bytes()],
        bump = rfq.quote_escrow_bump,
        constraint = quote_escrow.owner.key() == rfq.key()
    )]
    pub quote_escrow: Box<Account<'info, TokenAccount>>,
    /// Quote mint
    #[account(mut, constraint = quote_wallet.mint == rfq.quote_mint)]
    pub quote_mint: Box<Account<'info, Mint>>,
    /// Quote wallet
    #[account(mut, constraint = quote_wallet.mint == rfq.quote_mint)]
    pub quote_wallet: Box<Account<'info, TokenAccount>>,
    /// Rent
    pub rent: Sysvar<'info, Rent>,
    /// RFQ
    #[account(
        mut,
        seeds = [RFQ_SEED.as_bytes(), rfq.id.to_string().as_bytes()],
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
        seeds = [ORDER_SEED.as_bytes(), rfq.id.to_string().as_bytes(), order.id.to_string().as_bytes()],
        bump = order.bump,
        constraint = order.to_account_info().owner == program_id
    )]
    pub order: Box<Account<'info, OrderState>>,
    /// RFQ
    #[account(
        mut,
        seeds = [RFQ_SEED.as_bytes(), rfq.id.to_string().as_bytes()],
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
        seeds = [ASSET_ESCROW_SEED.as_bytes(), rfq.id.to_string().as_bytes()],
        bump = rfq.asset_escrow_bump,
        constraint = asset_escrow.owner.key() == rfq.key()
    )]
    pub asset_escrow: Box<Account<'info, TokenAccount>>,
    /// Asset mint
    #[account(mut, constraint = asset_mint.key() == rfq.asset_mint.key())]
    pub asset_mint: Box<Account<'info, Mint>>,
    /// Asset wallet
    #[account(mut, constraint = asset_wallet.mint == rfq.asset_mint)]
    pub asset_wallet: Box<Account<'info, TokenAccount>>,
    /// Order
    #[account(
        mut,
        seeds = [ORDER_SEED.as_bytes(), rfq.id.to_string().as_bytes(), order.id.to_string().as_bytes()],
        bump = order.bump,
        constraint = order.to_account_info().owner == program_id
    )]
    pub order: Box<Account<'info, OrderState>>,
    /// Quote escrow
    #[account(
        mut,
        seeds = [QUOTE_ESCROW_SEED.as_bytes(), rfq.id.to_string().as_bytes()],
        bump = rfq.quote_escrow_bump,
        constraint = quote_escrow.owner.key() == rfq.key()
    )]
    pub quote_escrow: Box<Account<'info, TokenAccount>>,
    /// Quote mint
    #[account(mut, constraint = quote_mint.key() == rfq.quote_mint.key())]
    pub quote_mint: Box<Account<'info, Mint>>,
    /// Quote wallet
    #[account(mut, constraint = quote_wallet.mint == rfq.quote_mint)]
    pub quote_wallet: Box<Account<'info, TokenAccount>>,
    /// Rent
    pub rent: Sysvar<'info, Rent>,
    /// RFQ
    #[account(
        seeds = [RFQ_SEED.as_bytes(), rfq.id.to_string().as_bytes()],
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
    #[account(mut, constraint = asset_mint.key() == rfq.asset_mint.key())]
    pub asset_mint: Box<Account<'info, Mint>>,
    /// Asset wallet
    #[account(mut, constraint = asset_wallet.mint == rfq.asset_mint)]
    pub asset_wallet: Box<Account<'info, TokenAccount>>,
    #[account(
        mut,
        seeds = [ASSET_ESCROW_SEED.as_bytes(), rfq.id.to_string().as_bytes()],
        bump = rfq.asset_escrow_bump,
        constraint = asset_escrow.owner.key() == rfq.key()
    )]
    pub asset_escrow: Box<Account<'info, TokenAccount>>,
    /// Order
    #[account(
        mut,
        seeds = [ORDER_SEED.as_bytes(), rfq.id.to_string().as_bytes(), order.id.to_string().as_bytes()],
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
        seeds = [QUOTE_ESCROW_SEED.as_bytes(), rfq.id.to_string().as_bytes()],
        bump = rfq.quote_escrow_bump,
        constraint = quote_escrow.owner.key() == rfq.key()
    )]
    pub quote_escrow: Box<Account<'info, TokenAccount>>,
    /// Quote mint
    #[account(mut, constraint = quote_mint.key() == rfq.quote_mint.key())]
    pub quote_mint: Box<Account<'info, Mint>>,
    /// Quote wallet
    #[account(mut, constraint = quote_wallet.mint == rfq.quote_mint)]
    pub quote_wallet: Box<Account<'info, TokenAccount>>,
    /// RFQ
    #[account(
        mut,
        seeds = [RFQ_SEED.as_bytes(), rfq.id.to_string().as_bytes()],
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
    #[account(mut)]
    pub treasury_wallet: Box<Account<'info, TokenAccount>>,
}
