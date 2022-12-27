use anchor_lang::prelude::*;

use super::super::state::ParsedLegData;
use super::super::errors::HxroError;
use super::super::ValidateData;

pub fn validate_instrument_data(
    ctx: &Context<ValidateData>,
    instrument_data: &Vec<u8>,
) -> Result<()> {
    let ParsedLegData {
        dex,
        fee_model_program,
        risk_engine_program,
        fee_model_configuration_acct,
        risk_model_configuration_acct,
        fee_output_register,
        risk_output_register,
        risk_and_fee_signer,
        product_index,
    } = AnchorDeserialize::try_from_slice(instrument_data)?;
    require!(
        instrument_data.len() as usize == std::mem::size_of::<ParsedLegData>(),
        HxroError::InvalidDataSize
    );

    require!(dex == ctx.accounts.dex.key(), HxroError::InvalidDex);
    require!(
        fee_model_program == ctx.accounts.fee_model_program.key(),
        HxroError::InvalidFeeModelProgram
    );
    require!(
        risk_engine_program == ctx.accounts.risk_engine_program.key(),
        HxroError::InvalidRiskEngineProgram
    );
    require!(
        fee_model_configuration_acct == ctx.accounts.fee_model_configuration_acct.key(),
        HxroError::InvalidFeeModelConfigurationAcct
    );
    require!(
        risk_model_configuration_acct == ctx.accounts.risk_model_configuration_acct.key(),
        HxroError::InvalidRiskModelConfigurationAcct
    );
    require!(
        fee_output_register == ctx.accounts.fee_output_register.key(),
        HxroError::InvalidFeeOutputRegister
    );
    require!(
        risk_output_register == ctx.accounts.risk_output_register.key(),
        HxroError::InvalidRiskOutputRegister
    );
    require!(
        risk_and_fee_signer == ctx.accounts.risk_and_fee_signer.key(),
        HxroError::InvalidRiskAndFeeSigner
    );

    Ok(())
}
