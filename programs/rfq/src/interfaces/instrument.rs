use anchor_lang::prelude::*;
use solana_program::{instruction::Instruction, program::invoke};

use crate::{
    errors::ProtocolError,
    states::{AuthoritySide, InstrumentParameters, Leg},
    utils::ToAccountMeta,
};

const VALIDATE_DATA_SELECTOR: [u8; 8] = [181, 2, 45, 238, 64, 129, 254, 198];
const PREPARE_TO_SETTLE_SELECTOR: [u8; 8] = [254, 209, 39, 188, 15, 5, 140, 146];

pub fn validate_instrument_data<'a, 'info: 'a>(
    leg: &Leg,
    instrument_parameters: InstrumentParameters,
    remaining_accounts: &mut impl Iterator<Item = &'a AccountInfo<'info>>,
) -> Result<()> {
    let mut data = VALIDATE_DATA_SELECTOR.to_vec();
    AnchorSerialize::serialize(leg.instrument_data.as_slice(), &mut data)?;

    let program = remaining_accounts
        .next()
        .ok_or(ProtocolError::NotEnoughAccounts)?;

    let accounts_number = instrument_parameters.validate_data_account_amount as usize;
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

pub fn prepare_to_settle<'a, 'info: 'a>(
    leg_index: u8,
    side: AuthoritySide,
    instrument_parameters: InstrumentParameters,
    remaining_accounts: &mut impl Iterator<Item = &'a AccountInfo<'info>>,
) -> Result<()> {
    let mut data = PREPARE_TO_SETTLE_SELECTOR.to_vec();
    AnchorSerialize::serialize(&leg_index, &mut data)?;
    AnchorSerialize::serialize(&side, &mut data)?;

    let program = remaining_accounts
        .next()
        .ok_or(ProtocolError::NotEnoughAccounts)?;

    let accounts_number = instrument_parameters.prepare_to_settle_account_amount as usize;
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
