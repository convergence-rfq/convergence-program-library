use anchor_lang::prelude::*;
use solana_program::{
    instruction::Instruction,
    program::{get_return_data, invoke},
};

use crate::{errors::ProtocolError, utils::ToAccountMeta};

const CALCULATE_REQUIRED_COLLATERAL_FOR_RFQ_SELECTOR: [u8; 8] =
    [3, 154, 182, 192, 204, 235, 214, 151];
const CALCULATE_REQUIRED_COLLATERAL_FOR_RESPONSE_SELECTOR: [u8; 8] =
    [202, 17, 188, 223, 194, 120, 202, 201];
const CALCULATE_REQUIRED_COLLATERAL_FOR_CONFIRMATION_SELECTOR: [u8; 8] =
    [19, 61, 174, 220, 175, 92, 14, 8];

pub fn calculate_required_collateral_for_rfq<'a, 'info: 'a>(
    rfq: AccountInfo<'info>,
    risk_engine: &AccountInfo<'info>,
    remaining_accounts: &mut impl Iterator<Item = &'a AccountInfo<'info>>,
) -> Result<u64> {
    let data = CALCULATE_REQUIRED_COLLATERAL_FOR_RFQ_SELECTOR.to_vec();

    let mut accounts = vec![rfq];
    accounts.extend(remaining_accounts.cloned());
    let accounts_meta: Vec<_> = accounts.iter().map(|x| x.to_account_meta()).collect();
    let instruction = Instruction {
        program_id: risk_engine.key(),
        accounts: accounts_meta,
        data,
    };
    invoke(&instruction, &accounts)?;

    let (return_data_emitter, data) = get_return_data().unwrap();
    require_keys_eq!(
        return_data_emitter,
        risk_engine.key(),
        ProtocolError::InvalidReturnDataEmitter
    );
    Ok(u64::try_from_slice(&data).unwrap())
}

pub fn calculate_required_collateral_for_response<'a, 'info: 'a>(
    rfq: AccountInfo<'info>,
    response: AccountInfo<'info>,
    risk_engine: &AccountInfo<'info>,
    remaining_accounts: &mut impl Iterator<Item = &'a AccountInfo<'info>>,
) -> Result<u64> {
    let data = CALCULATE_REQUIRED_COLLATERAL_FOR_RESPONSE_SELECTOR.to_vec();

    let mut accounts = vec![rfq, response];
    accounts.extend(remaining_accounts.cloned());
    let accounts_meta: Vec<_> = accounts.iter().map(|x| x.to_account_meta()).collect();
    let instruction = Instruction {
        program_id: risk_engine.key(),
        accounts: accounts_meta,
        data,
    };
    invoke(&instruction, &accounts)?;

    let (return_data_emitter, data) = get_return_data().unwrap();
    require_keys_eq!(
        return_data_emitter,
        risk_engine.key(),
        ProtocolError::InvalidReturnDataEmitter
    );
    Ok(u64::try_from_slice(&data).unwrap())
}

pub fn calculate_required_collateral_for_confirmation<'info>(
    rfq: AccountInfo<'info>,
    response: AccountInfo<'info>,
    risk_engine: &AccountInfo<'info>,
    remaining_accounts: &[AccountInfo<'info>],
) -> Result<(u64, u64)> {
    let data = CALCULATE_REQUIRED_COLLATERAL_FOR_CONFIRMATION_SELECTOR.to_vec();

    let mut accounts = vec![rfq, response];
    accounts.extend(remaining_accounts.iter().cloned());
    let accounts_meta: Vec<_> = accounts.iter().map(|x| x.to_account_meta()).collect();
    let instruction = Instruction {
        program_id: risk_engine.key(),
        accounts: accounts_meta,
        data,
    };
    invoke(&instruction, &accounts)?;

    let (return_data_emitter, data) = get_return_data().unwrap();
    require_keys_eq!(
        return_data_emitter,
        risk_engine.key(),
        ProtocolError::InvalidReturnDataEmitter
    );
    Ok(<(u64, u64)>::try_from_slice(&data).unwrap())
}
