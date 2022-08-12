use anchor_lang::prelude::*;
use solana_program::{instruction::Instruction, program::invoke};

use crate::states::Leg;

const CALCULATE_REQUIRED_COLLATERAL_FOR_RFQ_SELECTOR: [u8; 8] =
    [3, 154, 182, 192, 204, 235, 214, 151];
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
        if &RISK_ENGINE_REGISTER_DISCRIMINATOR != given_disc {
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
    risk_engine: &AccountInfo,
    risk_engine_register: &AccountInfo,
    legs: &Vec<Leg>,
) -> Result<u64> {
    let mut data = CALCULATE_REQUIRED_COLLATERAL_FOR_RFQ_SELECTOR.to_vec();
    AnchorSerialize::serialize(legs, &mut data)?;

    let instruction = Instruction {
        program_id: risk_engine.key(),
        accounts: vec![AccountMeta::new(risk_engine_register.key(), false)],
        data,
    };
    invoke(&instruction, &[risk_engine_register.clone()])?;

    let response = RiskEngineRegister::fetch(risk_engine_register)?;
    Ok(response.required_collateral)
}
