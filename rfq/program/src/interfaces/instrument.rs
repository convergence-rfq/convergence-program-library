use anchor_lang::prelude::*;
use solana_program::{instruction::Instruction, program::invoke_signed};

use crate::{
    errors::ProtocolError,
    seeds::PROTOCOL_SEED,
    state::{
        ApiLeg, AssetIdentifier, AuthoritySide, BaseAssetIndex, ProtocolState, QuoteAsset,
        Response, Rfq,
    },
    utils::ToAccountMeta,
};

const VALIDATE_DATA_SELECTOR: [u8; 8] = [181, 2, 45, 238, 64, 129, 254, 198];
const PREPARE_TO_SETTLE_SELECTOR: [u8; 8] = [254, 209, 39, 188, 15, 5, 140, 146];
const SETTLE_SELECTOR: [u8; 8] = [175, 42, 185, 87, 144, 131, 102, 212];
const REVERT_PREPARATION_SELECTOR: [u8; 8] = [32, 185, 171, 189, 112, 246, 209, 149];
const CLEAN_UP_SELECTOR: [u8; 8] = [8, 182, 195, 138, 85, 137, 221, 250];

pub fn validate_leg_instrument_data<'a, 'info: 'a>(
    leg: &ApiLeg,
    protocol: &Account<'info, ProtocolState>,
    remaining_accounts: &mut impl Iterator<Item = &'a AccountInfo<'info>>,
) -> Result<()> {
    let mut data = VALIDATE_DATA_SELECTOR.to_vec();
    AnchorSerialize::serialize(&leg.data, &mut data)?;
    AnchorSerialize::serialize(&Some(leg.base_asset_index), &mut data)?;
    AnchorSerialize::serialize(&leg.amount_decimals, &mut data)?;

    let instrument_index = leg.settlement_type_metadata.get_instrument_index().unwrap();
    let instrument_parameters = protocol.get_instrument_parameters(instrument_index)?;

    call_instrument(
        data,
        protocol,
        &instrument_parameters.program_key,
        instrument_parameters.validate_data_account_amount as usize,
        None,
        None,
        remaining_accounts,
    )
}

pub fn validate_quote_instrument_data<'a, 'info: 'a>(
    quote: &QuoteAsset,
    protocol: &Account<'info, ProtocolState>,
    remaining_accounts: &mut impl Iterator<Item = &'a AccountInfo<'info>>,
) -> Result<()> {
    let mut data = VALIDATE_DATA_SELECTOR.to_vec();
    AnchorSerialize::serialize(&quote.data, &mut data)?;
    AnchorSerialize::serialize(&Option::<BaseAssetIndex>::None, &mut data)?;
    AnchorSerialize::serialize(&quote.decimals, &mut data)?;

    let instrument_index = quote
        .settlement_type_metadata
        .get_instrument_index()
        .unwrap();
    let instrument_parameters = protocol.get_instrument_parameters(instrument_index)?;

    call_instrument(
        data,
        protocol,
        &instrument_parameters.program_key,
        instrument_parameters.validate_data_account_amount as usize,
        None,
        None,
        remaining_accounts,
    )
}

pub fn prepare_to_settle<'a, 'info: 'a>(
    asset_identifier: AssetIdentifier,
    side: AuthoritySide,
    protocol: &Account<'info, ProtocolState>,
    rfq: &Account<'info, Rfq>,
    response: &Account<'info, Response>,
    remaining_accounts: &mut impl Iterator<Item = &'a AccountInfo<'info>>,
) -> Result<()> {
    let mut data = PREPARE_TO_SETTLE_SELECTOR.to_vec();
    AnchorSerialize::serialize(&asset_identifier, &mut data)?;
    AnchorSerialize::serialize(&side, &mut data)?;

    let instrument_index = rfq.get_asset_instrument_index(asset_identifier).unwrap();
    let instrument_parameters = protocol.get_instrument_parameters(instrument_index)?;

    call_instrument(
        data,
        protocol,
        &instrument_parameters.program_key,
        instrument_parameters.prepare_to_settle_account_amount as usize,
        Some(rfq),
        Some(response),
        remaining_accounts,
    )
}

pub fn settle<'a, 'info: 'a>(
    asset_identifier: AssetIdentifier,
    protocol: &Account<'info, ProtocolState>,
    rfq: &Account<'info, Rfq>,
    response: &Account<'info, Response>,
    remaining_accounts: &mut impl Iterator<Item = &'a AccountInfo<'info>>,
) -> Result<()> {
    let mut data = SETTLE_SELECTOR.to_vec();
    AnchorSerialize::serialize(&asset_identifier, &mut data)?;

    let instrument_index = rfq.get_asset_instrument_index(asset_identifier).unwrap();
    let instrument_parameters = protocol.get_instrument_parameters(instrument_index)?;

    call_instrument(
        data,
        protocol,
        &instrument_parameters.program_key,
        instrument_parameters.settle_account_amount as usize,
        Some(rfq),
        Some(response),
        remaining_accounts,
    )
}

pub fn revert_preparation<'a, 'info: 'a>(
    asset_identifier: AssetIdentifier,
    side: AuthoritySide,
    protocol: &Account<'info, ProtocolState>,
    rfq: &Account<'info, Rfq>,
    response: &Account<'info, Response>,
    remaining_accounts: &mut impl Iterator<Item = &'a AccountInfo<'info>>,
) -> Result<()> {
    let mut data = REVERT_PREPARATION_SELECTOR.to_vec();
    AnchorSerialize::serialize(&asset_identifier, &mut data)?;
    AnchorSerialize::serialize(&side, &mut data)?;

    let instrument_index = rfq.get_asset_instrument_index(asset_identifier).unwrap();
    let instrument_parameters = protocol.get_instrument_parameters(instrument_index)?;

    call_instrument(
        data,
        protocol,
        &instrument_parameters.program_key,
        instrument_parameters.revert_preparation_account_amount as usize,
        Some(rfq),
        Some(response),
        remaining_accounts,
    )
}

pub fn clean_up<'a, 'info: 'a>(
    asset_identifier: AssetIdentifier,
    protocol: &Account<'info, ProtocolState>,
    rfq: &Account<'info, Rfq>,
    response: &Account<'info, Response>,
    remaining_accounts: &mut impl Iterator<Item = &'a AccountInfo<'info>>,
) -> Result<()> {
    let mut data = CLEAN_UP_SELECTOR.to_vec();
    AnchorSerialize::serialize(&asset_identifier, &mut data)?;

    let instrument_index = rfq.get_asset_instrument_index(asset_identifier).unwrap();
    let instrument_parameters = protocol.get_instrument_parameters(instrument_index)?;

    call_instrument(
        data,
        protocol,
        &instrument_parameters.program_key,
        instrument_parameters.clean_up_account_amount as usize,
        Some(rfq),
        Some(response),
        remaining_accounts,
    )
}

fn call_instrument<'a, 'info: 'a>(
    data: Vec<u8>,
    protocol: &Account<'info, ProtocolState>,
    instrument_key: &Pubkey,
    accounts_number: usize,
    rfq: Option<&Account<'info, Rfq>>,
    response: Option<&Account<'info, Response>>,
    remaining_accounts: &mut impl Iterator<Item = &'a AccountInfo<'info>>,
) -> Result<()> {
    let program = remaining_accounts
        .next()
        .ok_or(ProtocolError::NotEnoughAccounts)?;

    require!(
        &program.key() == instrument_key,
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
    msg!("calling invoke signed");
    invoke_signed(&instruction, &accounts, protocol_seed)?;

    Ok(())
}
