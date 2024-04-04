use std::mem;

use crate::{
    common::{validate_legs as common_validate_legs, validate_settlement_type_metadata},
    errors::ProtocolError,
    interfaces::instrument::validate_quote_instrument_data,
    seeds::{PROTOCOL_SEED, RFQ_SEED},
    state::{rfq::QuoteAsset, ApiLeg, FixedSize, OrderType, ProtocolState, Rfq, StoredRfqState},
    whitelist::Whitelist,
};
use anchor_lang::prelude::*;
use solana_program::hash::hash;

#[derive(Accounts)]
#[instruction(
    expected_legs_size: u16,
    expected_legs_hash: [u8; 32],
    _legs: Vec<ApiLeg>,
    print_trade_provider: Option<Pubkey>,
    order_type: OrderType,
    quote_asset: QuoteAsset,
    fixed_size: FixedSize,
    active_window: u32,
    settling_window: u32,
    recent_timestamp: u64,
)]
pub struct CreateRfqAccounts<'info> {
    #[account(mut)]
    pub taker: Signer<'info>,

    #[account(seeds = [PROTOCOL_SEED.as_bytes()], bump = protocol.bump)]
    pub protocol: Box<Account<'info, ProtocolState>>,
    #[account(
        init,
        payer = taker,
        space = 8 + mem::size_of::<Rfq>() + (expected_legs_size as usize),
        seeds = [
            RFQ_SEED.as_bytes(),
            taker.key().as_ref(),
            &expected_legs_hash,
            print_trade_provider.unwrap_or_default().as_ref(),
            &[order_type as u8],
            &hash(&quote_asset.try_to_vec().unwrap()).to_bytes(),
            &fixed_size.try_to_vec().unwrap(),
            &active_window.to_le_bytes(),
            &settling_window.to_le_bytes(),
            &recent_timestamp.to_le_bytes(),
        ],
        bump
    )]
    pub rfq: Box<Account<'info, Rfq>>,
    #[account(mut)]
    pub whitelist: Option<Box<Account<'info, Whitelist>>>,

    pub system_program: Program<'info, System>,
}

fn validate_quote<'a, 'info: 'a>(
    protocol: &Account<'info, ProtocolState>,
    remaining_accounts: &mut impl Iterator<Item = &'a AccountInfo<'info>>,
    quote_asset: &QuoteAsset,
    is_settled_as_print_trade: bool,
) -> Result<()> {
    validate_settlement_type_metadata(
        &quote_asset.settlement_type_metadata,
        is_settled_as_print_trade,
    )?;

    if !is_settled_as_print_trade {
        let instrument_index = quote_asset
            .settlement_type_metadata
            .get_instrument_index()
            .unwrap();
        let instrument_parameters = protocol.get_instrument_parameters(instrument_index)?;

        require!(
            instrument_parameters.can_be_used_as_quote,
            ProtocolError::InvalidQuoteInstrument
        );

        validate_quote_instrument_data(quote_asset, protocol, remaining_accounts)?;
    }

    Ok(())
}

fn validate_legs<'a, 'info: 'a>(
    protocol: &Account<'info, ProtocolState>,
    remaining_accounts: &mut impl Iterator<Item = &'a AccountInfo<'info>>,
    expected_leg_size: u16,
    legs: &[ApiLeg],
    is_settled_as_print_trade: bool,
) -> Result<()> {
    require!(
        legs.len() <= (Rfq::MAX_LEGS_AMOUNT as usize),
        ProtocolError::TooManyLegs
    );
    require!(
        expected_leg_size <= Rfq::MAX_LEGS_SIZE,
        ProtocolError::LegsDataTooBig
    );

    common_validate_legs(
        legs,
        protocol,
        remaining_accounts,
        is_settled_as_print_trade,
    )?;

    Ok(())
}

fn validate_whitelist(whitelist: &Whitelist, creator: Pubkey) -> Result<()> {
    require_keys_eq!(
        whitelist.associated_rfq,
        Pubkey::default(),
        ProtocolError::WhitelistAlreadyAssociated
    );
    require_keys_eq!(
        whitelist.creator,
        creator,
        ProtocolError::WhitelistCreatorMismatch
    );
    Ok(())
}

fn validate_print_trade_provider(
    protocol: &Account<ProtocolState>,
    print_trade_provider: Option<Pubkey>,
) -> Result<()> {
    if let Some(address) = print_trade_provider {
        protocol.get_print_trade_provider_parameters(address)?;
    }

    Ok(())
}

#[allow(clippy::too_many_arguments)]
pub fn create_rfq_instruction<'info>(
    ctx: Context<'_, '_, '_, 'info, CreateRfqAccounts<'info>>,
    expected_legs_size: u16,
    expected_legs_hash: [u8; 32],
    legs: Vec<ApiLeg>,
    print_trade_provider: Option<Pubkey>,
    order_type: OrderType,
    quote_asset: QuoteAsset,
    fixed_size: FixedSize,
    active_window: u32,
    settling_window: u32,
    _recent_timestamp: u64,
) -> Result<()> {
    let protocol = &ctx.accounts.protocol;
    let mut remaining_accounts = ctx.remaining_accounts.iter();
    validate_quote(
        protocol,
        &mut remaining_accounts,
        &quote_asset,
        print_trade_provider.is_some(),
    )?;
    validate_legs(
        protocol,
        &mut remaining_accounts,
        expected_legs_size,
        &legs,
        print_trade_provider.is_some(),
    )?;
    validate_print_trade_provider(protocol, print_trade_provider)?;
    let CreateRfqAccounts {
        taker,
        rfq,
        whitelist,
        ..
    } = ctx.accounts;
    let whitelist_to_pass = match whitelist {
        Some(whitelist) => {
            validate_whitelist(whitelist, taker.key())?;
            whitelist.associated_rfq = rfq.key();
            whitelist.key()
        }
        None => Pubkey::default(),
    };

    rfq.set_inner(Rfq {
        taker: taker.key(),
        order_type,
        fixed_size,
        quote_asset,
        creation_timestamp: 0,
        active_window,
        settling_window,
        expected_legs_size,
        expected_legs_hash,
        state: StoredRfqState::Constructed,
        non_response_taker_collateral_locked: 0,
        total_taker_collateral_locked: 0,
        total_responses: 0,
        cleared_responses: 0,
        confirmed_responses: 0,
        whitelist: whitelist_to_pass,
        print_trade_provider,
        reserved: [0; 224],
        legs: legs.into_iter().map(Into::into).collect(),
    });

    Ok(())
}
