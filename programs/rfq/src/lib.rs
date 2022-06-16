//! Request for quote (RFQ) protocol.
//!
//! Provides an abstraction and implements the RFQ mechanism.

use anchor_lang::prelude::*;
use solana_security_txt::security_txt;

pub mod access_controls;
pub mod constants;
pub mod contexts;
pub mod errors;
pub mod instructions;
pub mod psyoptions;
pub mod states;

use contexts::*;
use psyoptions::contexts::*;
use states::*;

security_txt! {
    name: "Convergence RFQ",
    project_url: "https://www.convergence.so",
    contacts: "email:hello@convergence.so,link:https://www.convergence.so/security",
    policy: "https://github.com/convergence-rfq/convergence/blob/master/SECURITY.md",
    preferred_languages: "en",
    source_code: "https://github.com/convergence-rfq/rfq",
    auditors: "None"
}

declare_id!("47p5Rh3fDeWp8ejFxThZE2uSwkAoyySSRXLDGWzcic92");

/// Request for quote (RFQ) protocol module.
#[program]
pub mod rfq {
    use super::*;

    /// Initializes.
    pub fn initialize(
        ctx: Context<Initialize>,
        fee_denominator: u64,
        fee_numerator: u64,
    ) -> Result<()> {
        instructions::initialize(ctx, fee_denominator, fee_numerator)
    }

    /// Sets fee.
    pub fn set_fee(ctx: Context<SetFee>, fee_denominator: u64, fee_numerator: u64) -> Result<()> {
        instructions::set_fee(ctx, fee_denominator, fee_numerator)
    }

    /// Requests quote (RFQ).
    pub fn request(
        ctx: Context<Request>,
        access_manager: Option<Pubkey>,
        expiry: i64,
        last_look: bool,
        legs: Vec<Leg>,
        order_amount: u64,
        order_type: Order,
    ) -> Result<()> {
        instructions::request(
            ctx,
            access_manager,
            expiry,
            last_look,
            legs,
            order_amount,
            order_type,
        )
    }

    /// Responds to RFQ.
    pub fn respond(ctx: Context<Respond>, bid: Option<u64>, ask: Option<u64>) -> Result<()> {
        instructions::respond(ctx, bid, ask)
    }

    /// Cancels RFQ.
    pub fn cancel(ctx: Context<Cancel>) -> Result<()> {
        instructions::cancel(ctx)
    }

    /// Quote last look.
    pub fn last_look(ctx: Context<LastLook>) -> Result<()> {
        instructions::last_look(ctx)
    }

    /// Confirms quote.
    pub fn confirm(ctx: Context<Confirm>, quote: Quote) -> Result<()> {
        instructions::confirm(ctx, quote)
    }

    /// Returns quote collateral.
    pub fn return_collateral(ctx: Context<ReturnCollateral>) -> Result<()> {
        instructions::return_collateral(ctx)
    }

    /// Settles RFQ.
    pub fn settle(ctx: Context<Settle>) -> Result<()> {
        instructions::settle(ctx)
    }

    /// Initializes PsyOptions American option market.
    pub fn initialize_psy_options_american_option_market<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, InitializeAmericanOptionMarket<'info>>,
        underlying_amount_per_contract: u64,
        quote_amount_per_contract: u64,
        expiration_unix_timestamp: i64,
        bump_seed: u8,
    ) -> Result<()> {
        psyoptions::instructions::initialize_american_option_market(
            ctx,
            underlying_amount_per_contract,
            quote_amount_per_contract,
            expiration_unix_timestamp,
            bump_seed,
        )
    }

    /// Initializes PsyOptions American mint vault.
    pub fn initialize_psy_options_american_mint_vault<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, InitializeAmericanMintVault<'info>>,
    ) -> Result<()> {
        psyoptions::instructions::initialize_american_mint_vault(ctx)
    }

    /// Mints PsyOptions American option market.
    pub fn mint_psy_options_american_option<'a, 'b, 'c, 'info>(
        ctx: Context<'a, 'b, 'c, 'info, MintAmericanOption<'info>>,
        leg: u64,
        size: u64,
        vault_authority_bump: u8,
    ) -> Result<()> {
        psyoptions::instructions::mint_american_option(ctx, leg, size, vault_authority_bump)
    }
}
