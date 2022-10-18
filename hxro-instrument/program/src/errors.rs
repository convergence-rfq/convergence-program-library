//! Error handling
use anchor_lang::prelude::*;

/// Error codes.
#[error_code]
pub enum HxroError {
    #[msg("An error occurred")]
    DefaultError,
    #[msg("Passed mint account does not match")]
    PassedMintDoesNotMatch,
    #[msg("Invalid data size")]
    InvalidDataSize,
    #[msg("This dex is not equal to the expected one")]
    InvalidDex,
    #[msg("This fee model program is not equal to the expected one")]
    InvalidFeeModelProgram,
    #[msg("This risk engine program is not equal to the expected one")]
    InvalidRiskEngineProgram,
    #[msg("This fee model configurationAcct is not equal to the expected one")]
    InvalidFeeModelConfigurationAcct,
    #[msg("This risk model configuration acct is not equal to the expected one")]
    InvalidRiskModelConfigurationAcct,
    #[msg("This fee output register is not equal to the expected one")]
    InvalidFeeOutputRegister,
    #[msg("This risk output register is not equal to the expected one")]
    InvalidRiskOutputRegister,
    #[msg("This risk and fee signer is not equal to the expected one")]
    InvalidRiskAndFeeSigner,
}
