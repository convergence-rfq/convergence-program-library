use anchor_lang::prelude::*;
use solana_program::{
    instruction::Instruction,
    program::{get_return_data, invoke},
};

use crate::states::{FixedSize, Leg, Quote, Side};

const CALCULATE_REQUIRED_COLLATERAL_FOR_RFQ_SELECTOR: [u8; 8] =
    [3, 154, 182, 192, 204, 235, 214, 151];
const CALCULATE_REQUIRED_COLLATERAL_FOR_RESPONSE_SELECTOR: [u8; 8] =
    [202, 17, 188, 223, 194, 120, 202, 201];
const CALCULATE_REQUIRED_COLLATERAL_FOR_CONFIRMATION_SELECTOR: [u8; 8] =
    [19, 61, 174, 220, 175, 92, 14, 8];

pub fn calculate_required_collateral_for_rfq(
    taker: &Pubkey,
    risk_engine: &AccountInfo,
    legs: &Vec<Leg>,
    fixed_size: &FixedSize,
) -> Result<u64> {
    let mut data = CALCULATE_REQUIRED_COLLATERAL_FOR_RFQ_SELECTOR.to_vec();
    AnchorSerialize::serialize(taker, &mut data)?;
    AnchorSerialize::serialize(legs, &mut data)?;
    AnchorSerialize::serialize(fixed_size, &mut data)?;

    let instruction = Instruction {
        program_id: risk_engine.key(),
        accounts: vec![],
        data,
    };
    invoke(&instruction, &[])?;

    let (_key, data) = get_return_data().unwrap();
    Ok(u64::try_from_slice(&data).unwrap())
}

pub fn calculate_required_collateral_for_response<'a, 'info: 'a>(
    maker: &Pubkey,
    rfq: &'a AccountInfo<'info>,
    risk_engine: &'a AccountInfo<'info>,
    bid: Option<Quote>,
    ask: Option<Quote>,
) -> Result<u64> {
    let mut data = CALCULATE_REQUIRED_COLLATERAL_FOR_RESPONSE_SELECTOR.to_vec();
    AnchorSerialize::serialize(maker, &mut data)?;
    AnchorSerialize::serialize(&bid, &mut data)?;
    AnchorSerialize::serialize(&ask, &mut data)?;

    let instruction = Instruction {
        program_id: risk_engine.key(),
        accounts: vec![AccountMeta::new_readonly(rfq.key(), false)],
        data,
    };
    invoke(&instruction, &[rfq.clone()])?;

    let (_key, data) = get_return_data().unwrap();
    Ok(u64::try_from_slice(&data).unwrap())
}

pub fn calculate_required_collateral_for_confirmation<'a, 'info: 'a>(
    rfq: &'a AccountInfo<'info>,
    response: &'a AccountInfo<'info>,
    risk_engine: &'a AccountInfo<'info>,
    side: &Side,
) -> Result<u64> {
    let mut data = CALCULATE_REQUIRED_COLLATERAL_FOR_CONFIRMATION_SELECTOR.to_vec();
    AnchorSerialize::serialize(&side, &mut data)?;

    let instruction = Instruction {
        program_id: risk_engine.key(),
        accounts: vec![
            AccountMeta::new_readonly(rfq.key(), false),
            AccountMeta::new_readonly(response.key(), false),
        ],
        data,
    };
    invoke(&instruction, &[rfq.clone(), response.clone()])?;

    let (_key, data) = get_return_data().unwrap();
    Ok(u64::try_from_slice(&data).unwrap())
}
