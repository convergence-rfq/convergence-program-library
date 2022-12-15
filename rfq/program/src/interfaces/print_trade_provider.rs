use anchor_lang::prelude::*;
use solana_program::{instruction::Instruction, program::invoke_signed};

use crate::{
    errors::ProtocolError,
    seeds::PROTOCOL_SEED,
    state::{AuthoritySide, Leg, ProtocolState, Response, Rfq},
    utils::ToAccountMeta,
};

const VALIDATE_LEGS_SELECTOR: [u8; 8] = [0, 0, 0, 0, 0, 0, 0, 0];
const CREATE_PRINT_TRADE_SELECTOR: [u8; 8] = [0, 0, 0, 0, 0, 0, 0, 0];
const SETTLE_PRINT_TRADE_SELECTOR: [u8; 8] = [0, 0, 0, 0, 0, 0, 0, 0];
const CLEAN_UP_SELECTOR: [u8; 8] = [0, 0, 0, 0, 0, 0, 0, 0];

pub fn validate_instrument_data<'a, 'info: 'a>(
    legs: &Vec<Leg>,
    protocol: &Account<'info, ProtocolState>,
    remaining_accounts: &mut impl Iterator<Item = &'a AccountInfo<'info>>,
) -> Result<()> {
    assert!(!legs.is_empty());

    let mut legs_data = AnchorSerialize::try_to_vec(legs)?;

    let mut data = VALIDATE_LEGS_SELECTOR.to_vec();
    AnchorSerialize::serialize(&(legs_data.len() as u32), &mut data)?;
    data.append(&mut legs_data);

    let print_trade_provider_key = legs[0].instrument_program;
    let print_trade_provider_parameters =
        protocol.get_print_trade_provider_parameters(print_trade_provider_key)?;

    call_instrument(
        data,
        protocol,
        &print_trade_provider_key,
        print_trade_provider_parameters.validate_data_account_amount as usize,
        None,
        None,
        remaining_accounts,
    )
}

pub fn create_print_trade<'a, 'info: 'a>(
    legs: &Vec<Leg>,
    side: AuthoritySide,
    protocol: &Account<'info, ProtocolState>,
    rfq: &Account<'info, Rfq>,
    response: &Account<'info, Response>,
    remaining_accounts: &mut impl Iterator<Item = &'a AccountInfo<'info>>,
) -> Result<()> {
    let mut data = CREATE_PRINT_TRADE_SELECTOR.to_vec();
    AnchorSerialize::serialize(&side, &mut data)?;

    let print_trade_provider_key = legs[0].instrument_program;
    let print_trade_provider_parameters =
        protocol.get_print_trade_provider_parameters(print_trade_provider_key)?;

    call_instrument(
        data,
        protocol,
        &print_trade_provider_key,
        print_trade_provider_parameters.create_print_trade_account_amount as usize,
        Some(rfq),
        Some(response),
        remaining_accounts,
    )
}

pub fn settle_print_trade<'a, 'info: 'a>(
    legs: &Vec<Leg>,
    protocol: &Account<'info, ProtocolState>,
    rfq: &Account<'info, Rfq>,
    response: &Account<'info, Response>,
    remaining_accounts: &mut impl Iterator<Item = &'a AccountInfo<'info>>,
) -> Result<()> {
    let data = SETTLE_PRINT_TRADE_SELECTOR.to_vec();

    let print_trade_provider_key = legs[0].instrument_program;
    let print_trade_provider_parameters =
        protocol.get_print_trade_provider_parameters(print_trade_provider_key)?;

    call_instrument(
        data,
        protocol,
        &print_trade_provider_key,
        print_trade_provider_parameters.settle_print_trade_account_amount as usize,
        Some(rfq),
        Some(response),
        remaining_accounts,
    )
}

pub fn clean_up<'a, 'info: 'a>(
    legs: &Vec<Leg>,
    protocol: &Account<'info, ProtocolState>,
    rfq: &Account<'info, Rfq>,
    response: &Account<'info, Response>,
    remaining_accounts: &mut impl Iterator<Item = &'a AccountInfo<'info>>,
) -> Result<()> {
    let data = CLEAN_UP_SELECTOR.to_vec();

    let print_trade_provider_key = legs[0].instrument_program;
    let print_trade_provider_parameters =
        protocol.get_print_trade_provider_parameters(print_trade_provider_key)?;

    call_instrument(
        data,
        protocol,
        &print_trade_provider_key,
        print_trade_provider_parameters.clean_up_account_amount as usize,
        Some(rfq),
        Some(response),
        remaining_accounts,
    )
}

fn call_instrument<'a, 'info: 'a>(
    data: Vec<u8>,
    protocol: &Account<'info, ProtocolState>,
    provider_key: &Pubkey,
    accounts_number: usize,
    rfq: Option<&Account<'info, Rfq>>,
    response: Option<&Account<'info, Response>>,
    remaining_accounts: &mut impl Iterator<Item = &'a AccountInfo<'info>>,
) -> Result<()> {
    let program = remaining_accounts
        .next()
        .ok_or(ProtocolError::NotEnoughAccounts)?;
    require!(
        &program.key() == provider_key,
        ProtocolError::PassedProgramIdDiffersFromAnInstrument
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
    let accounts_number_before = accounts.len();
    accounts.extend(remaining_accounts.take(accounts_number).cloned());
    require!(
        accounts.len() == accounts_number + accounts_number_before,
        ProtocolError::NotEnoughAccounts
    );

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
