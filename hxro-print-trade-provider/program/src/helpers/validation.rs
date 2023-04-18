use crate::state::ParsedQuoteData;
use anchor_lang::prelude::*;

use super::super::errors::HxroError;
use super::super::state::ParsedLegData;
use super::super::ValidatePrintTradeAccounts;

pub fn validate_leg_data(
    _ctx: &Context<ValidatePrintTradeAccounts>,
    instrument_data: &Vec<u8>,
) -> Result<()> {
    let ParsedLegData { product_index: _ } = AnchorDeserialize::try_from_slice(instrument_data)?;
    require!(
        instrument_data.len() as usize == std::mem::size_of::<ParsedLegData>(),
        HxroError::InvalidDataSize
    );

    // require!(dex == ctx.accounts.dex.key(), HxroError::InvalidDex);
    // require!(
    //     fee_model_program == ctx.accounts.fee_model_program.key(),
    //     HxroError::InvalidFeeModelProgram
    // );
    // require!(
    //     risk_engine_program == ctx.accounts.risk_engine_program.key(),
    //     HxroError::InvalidRiskEngineProgram
    // );
    // require!(
    //     fee_model_configuration_acct == ctx.accounts.fee_model_configuration_acct.key(),
    //     HxroError::InvalidFeeModelConfigurationAcct
    // );
    // require!(
    //     risk_model_configuration_acct == ctx.accounts.risk_model_configuration_acct.key(),
    //     HxroError::InvalidRiskModelConfigurationAcct
    // );
    // require!(
    //     fee_output_register == ctx.accounts.fee_output_register.key(),
    //     HxroError::InvalidFeeOutputRegister
    // );
    // require!(
    //     risk_output_register == ctx.accounts.risk_output_register.key(),
    //     HxroError::InvalidRiskOutputRegister
    // );
    // require!(
    //     risk_and_fee_signer == ctx.accounts.risk_and_fee_signer.key(),
    //     HxroError::InvalidRiskAndFeeSigner
    // );

    Ok(())
}

pub fn validate_quote_data(
    _ctx: &Context<ValidatePrintTradeAccounts>,
    instrument_data: &Vec<u8>,
) -> Result<()> {
    let ParsedQuoteData {} = AnchorDeserialize::try_from_slice(instrument_data)?;

    Ok(())
}
