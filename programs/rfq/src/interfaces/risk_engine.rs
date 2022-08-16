use anchor_lang::prelude::*;
use solana_program::{instruction::Instruction, program::invoke};

use crate::states::{FixedSize, Leg, Quote, Side};

const CALCULATE_REQUIRED_COLLATERAL_FOR_RFQ_SELECTOR: [u8; 8] =
    [3, 154, 182, 192, 204, 235, 214, 151];
const CALCULATE_REQUIRED_COLLATERAL_FOR_RESPONSE_SELECTOR: [u8; 8] =
    [202, 17, 188, 223, 194, 120, 202, 201];
const CALCULATE_REQUIRED_COLLATERAL_FOR_CONFIRMATION_SELECTOR: [u8; 8] =
    [19, 61, 174, 220, 175, 92, 14, 8];
const RISK_ENGINE_REGISTER_DISCRIMINATOR: [u8; 8] = [134, 173, 244, 36, 162, 38, 90, 249];

#[derive(AnchorDeserialize)]
pub struct RiskEngineRegister {
    pub required_collateral: u64,
}

impl RiskEngineRegister {
    pub fn fetch(account_info: &AccountInfo) -> Result<Self> {
        let mut data: &[u8] = &account_info.try_borrow_data()?;
        RiskEngineRegister::try_deserialize(&mut data)
    }
}

impl anchor_lang::AccountDeserialize for RiskEngineRegister {
    fn try_deserialize(buf: &mut &[u8]) -> anchor_lang::Result<Self> {
        if buf.len() < RISK_ENGINE_REGISTER_DISCRIMINATOR.len() {
            return Err(anchor_lang::error::ErrorCode::AccountDiscriminatorNotFound.into());
        }
        let given_disc = &buf[..8];
        if RISK_ENGINE_REGISTER_DISCRIMINATOR != given_disc {
            return Err(anchor_lang::error::ErrorCode::AccountDiscriminatorMismatch.into());
        }
        Self::try_deserialize_unchecked(buf)
    }
    fn try_deserialize_unchecked(buf: &mut &[u8]) -> anchor_lang::Result<Self> {
        let mut data: &[u8] = &buf[8..];
        AnchorDeserialize::deserialize(&mut data)
            .map_err(|_| anchor_lang::error::ErrorCode::AccountDidNotDeserialize.into())
    }
}

pub fn calculate_required_collateral_for_rfq(
    taker: &Pubkey,
    risk_engine: &AccountInfo,
    risk_engine_register: &AccountInfo,
    legs: &Vec<Leg>,
    fixed_size: &FixedSize,
) -> Result<u64> {
    let mut data = CALCULATE_REQUIRED_COLLATERAL_FOR_RFQ_SELECTOR.to_vec();
    AnchorSerialize::serialize(taker, &mut data)?;
    AnchorSerialize::serialize(legs, &mut data)?;
    AnchorSerialize::serialize(fixed_size, &mut data)?;

    let instruction = Instruction {
        program_id: risk_engine.key(),
        accounts: vec![AccountMeta::new(risk_engine_register.key(), false)],
        data,
    };
    invoke(&instruction, &[risk_engine_register.clone()])?;

    let response = RiskEngineRegister::fetch(risk_engine_register)?;
    Ok(response.required_collateral)
}

pub fn calculate_required_collateral_for_response<'a, 'info: 'a>(
    maker: &Pubkey,
    rfq: &'a AccountInfo<'info>,
    risk_engine: &'a AccountInfo<'info>,
    risk_engine_register: &'a AccountInfo<'info>,
    bid: Option<Quote>,
    ask: Option<Quote>,
) -> Result<u64> {
    let mut data = CALCULATE_REQUIRED_COLLATERAL_FOR_RESPONSE_SELECTOR.to_vec();
    AnchorSerialize::serialize(maker, &mut data)?;
    AnchorSerialize::serialize(&bid, &mut data)?;
    AnchorSerialize::serialize(&ask, &mut data)?;

    let instruction = Instruction {
        program_id: risk_engine.key(),
        accounts: vec![
            AccountMeta::new(risk_engine_register.key(), false),
            AccountMeta::new_readonly(rfq.key(), false),
        ],
        data,
    };
    invoke(&instruction, &[risk_engine_register.clone(), rfq.clone()])?;

    let response = RiskEngineRegister::fetch(risk_engine_register)?;
    Ok(response.required_collateral)
}

pub fn calculate_required_collateral_for_confirmation<'a, 'info: 'a>(
    rfq: &'a AccountInfo<'info>,
    response: &'a AccountInfo<'info>,
    risk_engine: &'a AccountInfo<'info>,
    risk_engine_register: &'a AccountInfo<'info>,
    side: &Side,
) -> Result<u64> {
    let mut data = CALCULATE_REQUIRED_COLLATERAL_FOR_CONFIRMATION_SELECTOR.to_vec();
    AnchorSerialize::serialize(&side, &mut data)?;

    let instruction = Instruction {
        program_id: risk_engine.key(),
        accounts: vec![
            AccountMeta::new(risk_engine_register.key(), false),
            AccountMeta::new_readonly(rfq.key(), false),
            AccountMeta::new_readonly(response.key(), false),
        ],
        data,
    };
    invoke(
        &instruction,
        &[risk_engine_register.clone(), rfq.clone(), response.clone()],
    )?;

    let response = RiskEngineRegister::fetch(risk_engine_register)?;
    Ok(response.required_collateral)
}
