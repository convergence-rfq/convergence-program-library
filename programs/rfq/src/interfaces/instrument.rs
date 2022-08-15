use anchor_lang::prelude::*;
use solana_program::{instruction::Instruction, program::invoke};

use crate::{
    errors::ProtocolError,
    states::{InstrumentParameters, Leg},
};

const VALIDATE_DATA_SELECTOR: [u8; 8] = [181, 2, 45, 238, 64, 129, 254, 198];

pub fn validate_instrument_data<'a, 'info: 'a>(
    leg: &Leg,
    instrument_parameters: InstrumentParameters,
    remaining_accounts: &mut impl Iterator<Item = &'a AccountInfo<'info>>,
) -> Result<()> {
    let mut data = VALIDATE_DATA_SELECTOR.to_vec();
    AnchorSerialize::serialize(leg.instrument_data.as_slice(), &mut data)?;

    let program = remaining_accounts
        .next()
        .ok_or(ProtocolError::InvalidAccountsForLegDataVerification)?;

    let accounts_number = instrument_parameters.validate_data_accounts as usize;
    let accounts: Vec<AccountInfo> = remaining_accounts.take(accounts_number).cloned().collect();
    let account_metas: Vec<AccountMeta> = accounts
        .iter()
        .map(|x| AccountMeta::new_readonly(x.key(), false))
        .collect();

    let instruction = Instruction {
        program_id: program.key(),
        accounts: account_metas,
        data,
    };
    invoke(&instruction, &accounts)?;

    Ok(())
}
