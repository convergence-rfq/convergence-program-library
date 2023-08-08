use anchor_lang::prelude::*;
use solana_program::{instruction::Instruction, program::invoke_signed};

use crate::{
    errors::ProtocolError,
    seeds::PROTOCOL_SEED,
    state::{AuthoritySide, ProtocolState, Response, Rfq},
    utils::ToAccountMeta,
};

const VALIDATE_PRINT_TRADE_SELECTOR: [u8; 8] = [196, 101, 141, 125, 6, 132, 232, 195];
const PREPARE_PRINT_TRADE_SELECTOR: [u8; 8] = [240, 73, 86, 183, 80, 149, 180, 158];
const SETTLE_PRINT_TRADE_SELECTOR: [u8; 8] = [188, 110, 242, 145, 117, 203, 30, 239];
const REVERT_PRINT_TRADE_PREPARATION_SELECTOR: [u8; 8] = [242, 33, 96, 69, 184, 244, 78, 6];
const CLEAN_UP_PRINT_TRADE_SELECTOR: [u8; 8] = [246, 29, 115, 215, 20, 227, 25, 57];

pub fn validate_print_trade<'a, 'info: 'a>(
    rfq: &Account<'info, Rfq>,
    protocol: &Account<'info, ProtocolState>,
    remaining_accounts: &mut impl Iterator<Item = &'a AccountInfo<'info>>,
) -> Result<()> {
    let data = VALIDATE_PRINT_TRADE_SELECTOR.to_vec();

    let print_trade_provider_key = rfq
        .print_trade_provider
        .ok_or(error!(ProtocolError::NoPrintTradeProvider))?;

    call_instrument(
        data,
        protocol,
        &print_trade_provider_key,
        Some(rfq),
        None,
        remaining_accounts,
    )
}

pub fn prepare_print_trade<'a, 'info: 'a>(
    side: AuthoritySide,
    protocol: &Account<'info, ProtocolState>,
    rfq: &Account<'info, Rfq>,
    response: &Account<'info, Response>,
    remaining_accounts: &mut impl Iterator<Item = &'a AccountInfo<'info>>,
) -> Result<()> {
    let mut data = PREPARE_PRINT_TRADE_SELECTOR.to_vec();
    AnchorSerialize::serialize(&side, &mut data)?;

    let print_trade_provider_key = rfq
        .print_trade_provider
        .ok_or(error!(ProtocolError::NoPrintTradeProvider))?;

    call_instrument(
        data,
        protocol,
        &print_trade_provider_key,
        Some(rfq),
        Some(response),
        remaining_accounts,
    )
}

pub fn settle_print_trade<'a, 'info: 'a>(
    protocol: &Account<'info, ProtocolState>,
    rfq: &Account<'info, Rfq>,
    response: &Account<'info, Response>,
    remaining_accounts: &mut impl Iterator<Item = &'a AccountInfo<'info>>,
) -> Result<()> {
    let data = SETTLE_PRINT_TRADE_SELECTOR.to_vec();

    let print_trade_provider_key = rfq
        .print_trade_provider
        .ok_or(error!(ProtocolError::NoPrintTradeProvider))?;

    call_instrument(
        data,
        protocol,
        &print_trade_provider_key,
        Some(rfq),
        Some(response),
        remaining_accounts,
    )
}

pub fn revert_print_trade_preparation<'a, 'info: 'a>(
    side: AuthoritySide,
    protocol: &Account<'info, ProtocolState>,
    rfq: &Account<'info, Rfq>,
    response: &Account<'info, Response>,
    remaining_accounts: &mut impl Iterator<Item = &'a AccountInfo<'info>>,
) -> Result<()> {
    let mut data = REVERT_PRINT_TRADE_PREPARATION_SELECTOR.to_vec();
    AnchorSerialize::serialize(&side, &mut data)?;

    let print_trade_provider_key = rfq
        .print_trade_provider
        .ok_or(error!(ProtocolError::NoPrintTradeProvider))?;

    call_instrument(
        data,
        protocol,
        &print_trade_provider_key,
        Some(rfq),
        Some(response),
        remaining_accounts,
    )
}

pub fn clean_up_print_trade<'a, 'info: 'a>(
    protocol: &Account<'info, ProtocolState>,
    rfq: &Account<'info, Rfq>,
    response: &Account<'info, Response>,
    remaining_accounts: &mut impl Iterator<Item = &'a AccountInfo<'info>>,
) -> Result<()> {
    let data = CLEAN_UP_PRINT_TRADE_SELECTOR.to_vec();

    let print_trade_provider_key = rfq
        .print_trade_provider
        .ok_or(error!(ProtocolError::NoPrintTradeProvider))?;

    call_instrument(
        data,
        protocol,
        &print_trade_provider_key,
        Some(rfq),
        Some(response),
        remaining_accounts,
    )
}

fn call_instrument<'a, 'info: 'a>(
    data: Vec<u8>,
    protocol: &Account<'info, ProtocolState>,
    provider_key: &Pubkey,
    rfq: Option<&Account<'info, Rfq>>,
    response: Option<&Account<'info, Response>>,
    remaining_accounts: &mut impl Iterator<Item = &'a AccountInfo<'info>>,
) -> Result<()> {
    let program = remaining_accounts
        .next()
        .ok_or(ProtocolError::NotEnoughAccounts)?;
    require!(
        &program.key() == provider_key,
        ProtocolError::PassedProgramIdDiffersFromAPrintTradeProvider
    );

    let mut protocol_info = protocol.to_account_info();
    protocol_info.is_signer = true;
    let mut accounts = vec![protocol_info];
    if let Some(acc) = rfq {
        accounts.push(acc.to_account_info());
    }
    if let Some(acc) = response {
        accounts.push(acc.to_account_info());
    }

    accounts.extend(remaining_accounts.cloned());

    let account_metas: Vec<AccountMeta> = accounts.iter().map(|x| x.to_account_meta()).collect();

    let instruction = Instruction {
        program_id: program.key(),
        accounts: account_metas,
        data,
    };
    let bump_seed = [protocol.bump];
    let protocol_seed = &[&[PROTOCOL_SEED.as_bytes(), &bump_seed][..]];
    invoke_signed(&instruction, &accounts, protocol_seed)?;

    Ok(())
}