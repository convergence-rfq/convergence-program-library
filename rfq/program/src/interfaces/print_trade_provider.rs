use anchor_lang::prelude::*;
use solana_program::{instruction::Instruction, program::invoke_signed};

use crate::{
    errors::ProtocolError,
    seeds::PROTOCOL_SEED,
    state::{AuthoritySide, ProtocolState, Response, Rfq},
    utils::ToAccountMeta,
};

const VALIDATE_LEGS_SELECTOR: [u8; 8] = [0, 0, 0, 0, 0, 0, 0, 0];
const CREATE_PRINT_TRADE_SELECTOR: [u8; 8] = [0, 0, 0, 0, 0, 0, 0, 0];
const SETTLE_PRINT_TRADE_SELECTOR: [u8; 8] = [0, 0, 0, 0, 0, 0, 0, 0];
const CLEAN_UP_SELECTOR: [u8; 8] = [0, 0, 0, 0, 0, 0, 0, 0];

pub fn validate_print_trade_data<'a, 'info: 'a>(
    rfq: &Account<'info, Rfq>,
    protocol: &Account<'info, ProtocolState>,
    remaining_accounts: &mut impl Iterator<Item = &'a AccountInfo<'info>>,
) -> Result<()> {
    let data = VALIDATE_LEGS_SELECTOR.to_vec();

    let print_trade_provider_key = rfq
        .print_trade_provider
        .ok_or(error!(ProtocolError::NoPrintTradeProvider))?;
    let print_trade_provider_parameters =
        protocol.get_print_trade_provider_parameters(print_trade_provider_key)?;

    call_instrument(
        data,
        protocol,
        &print_trade_provider_key,
        Some(print_trade_provider_parameters.validate_data_accounts as usize),
        None,
        None,
        remaining_accounts,
    )
}

pub fn create_print_trade<'a, 'info: 'a>(
    side: AuthoritySide,
    protocol: &Account<'info, ProtocolState>,
    rfq: &Account<'info, Rfq>,
    response: &Account<'info, Response>,
    remaining_accounts: &mut impl Iterator<Item = &'a AccountInfo<'info>>,
) -> Result<()> {
    let mut data = CREATE_PRINT_TRADE_SELECTOR.to_vec();
    AnchorSerialize::serialize(&side, &mut data)?;

    let print_trade_provider_key = rfq
        .print_trade_provider
        .ok_or(error!(ProtocolError::NoPrintTradeProvider))?;

    call_instrument(
        data,
        protocol,
        &print_trade_provider_key,
        None,
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
        None,
        Some(rfq),
        Some(response),
        remaining_accounts,
    )
}

pub fn clean_up<'a, 'info: 'a>(
    protocol: &Account<'info, ProtocolState>,
    rfq: &Account<'info, Rfq>,
    response: &Account<'info, Response>,
    remaining_accounts: &mut impl Iterator<Item = &'a AccountInfo<'info>>,
) -> Result<()> {
    let data = CLEAN_UP_SELECTOR.to_vec();

    let print_trade_provider_key = rfq
        .print_trade_provider
        .ok_or(error!(ProtocolError::NoPrintTradeProvider))?;

    call_instrument(
        data,
        protocol,
        &print_trade_provider_key,
        None,
        Some(rfq),
        Some(response),
        remaining_accounts,
    )
}

fn call_instrument<'a, 'info: 'a>(
    data: Vec<u8>,
    protocol: &Account<'info, ProtocolState>,
    provider_key: &Pubkey,
    accounts_number: Option<usize>,
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

    match accounts_number {
        None => accounts.extend(remaining_accounts.cloned()),
        Some(accounts_to_take) => {
            let accounts_number_before = accounts.len();

            accounts.extend(remaining_accounts.take(accounts_to_take).cloned());

            require!(
                accounts.len() == accounts_to_take + accounts_number_before,
                ProtocolError::NotEnoughAccounts
            )
        }
    }

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
