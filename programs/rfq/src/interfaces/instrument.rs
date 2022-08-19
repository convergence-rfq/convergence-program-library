use anchor_lang::prelude::*;
use solana_program::{instruction::Instruction, program::invoke};

use crate::{
    errors::ProtocolError,
    states::{AuthoritySide, InstrumentParameters, Leg},
    utils::ToAccountMeta,
};

const VALIDATE_DATA_SELECTOR: [u8; 8] = [181, 2, 45, 238, 64, 129, 254, 198];
const PREPARE_TO_SETTLE_SELECTOR: [u8; 8] = [254, 209, 39, 188, 15, 5, 140, 146];
const SETTLE_SELECTOR: [u8; 8] = [175, 42, 185, 87, 144, 131, 102, 212];

pub fn validate_instrument_data<'a, 'info: 'a>(
    leg: &Leg,
    instrument_key: &Pubkey,
    instrument_parameters: InstrumentParameters,
    remaining_accounts: &mut impl Iterator<Item = &'a AccountInfo<'info>>,
) -> Result<()> {
    let mut data = VALIDATE_DATA_SELECTOR.to_vec();
    AnchorSerialize::serialize(leg.instrument_data.as_slice(), &mut data)?;

    call_instrument(
        data,
        instrument_key,
        instrument_parameters.validate_data_account_amount as usize,
        remaining_accounts,
    )
}

pub fn prepare_to_settle<'a, 'info: 'a>(
    leg_index: u8,
    side: AuthoritySide,
    instrument_key: &Pubkey,
    instrument_parameters: InstrumentParameters,
    remaining_accounts: &mut impl Iterator<Item = &'a AccountInfo<'info>>,
) -> Result<()> {
    let mut data = PREPARE_TO_SETTLE_SELECTOR.to_vec();
    AnchorSerialize::serialize(&leg_index, &mut data)?;
    AnchorSerialize::serialize(&side, &mut data)?;

    call_instrument(
        data,
        instrument_key,
        instrument_parameters.prepare_to_settle_account_amount as usize,
        remaining_accounts,
    )
}

pub fn settle<'a, 'info: 'a>(
    leg_index: u8,
    instrument_key: &Pubkey,
    instrument_parameters: InstrumentParameters,
    remaining_accounts: &mut impl Iterator<Item = &'a AccountInfo<'info>>,
) -> Result<()> {
    let mut data = SETTLE_SELECTOR.to_vec();
    AnchorSerialize::serialize(&leg_index, &mut data)?;

    call_instrument(
        data,
        instrument_key,
        instrument_parameters.settle_account_amount as usize,
        remaining_accounts,
    )
}

fn call_instrument<'a, 'info: 'a>(
    data: Vec<u8>,
    instrument_key: &Pubkey,
    accounts_number: usize,
    remaining_accounts: &mut impl Iterator<Item = &'a AccountInfo<'info>>,
) -> Result<()> {
    let program = remaining_accounts
        .next()
        .ok_or(ProtocolError::NotEnoughAccounts)?;
    require!(
        &program.key() == instrument_key,
        ProtocolError::PassedProgramIdDiffersFromAnInstrument
    );

    let accounts: Vec<AccountInfo> = remaining_accounts.take(accounts_number).cloned().collect();
    require!(
        accounts.len() == accounts_number,
        ProtocolError::NotEnoughAccounts
    );

    let account_metas: Vec<AccountMeta> = accounts.iter().map(|x| x.to_account_meta()).collect();
    let instruction = Instruction {
        program_id: program.key(),
        accounts: account_metas,
        data,
    };
    invoke(&instruction, &accounts)?;

    Ok(())
}
