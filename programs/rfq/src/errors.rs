//! Error handling
use anchor_lang::prelude::*;

/// Error codes.
#[error_code]
pub enum ProtocolError {
    #[msg("Require protocol authority")]
    NotAProtocolAuthority,
    #[msg("Instrument already added")]
    InstrumentAlreadyAdded,
    #[msg("Invalid risk engine register")]
    InvalidRiskEngineRegister,
    #[msg("Passed mint is not a collateral mint")]
    NotACollateralMint,
    #[msg("Passed token account does not belong to collateral mint")]
    NotACollateralTokenAccount,
    #[msg("Passed account is not a risk engine in the protocol")]
    NotARiskEngine,
    #[msg("Passed account is not a risk engine register in the protocol")]
    NotARiskEngineRegister,
    #[msg("Not enough tokens")]
    NotEnoughTokens,
    #[msg("Not enough collateral")]
    NotEnoughCollateral,
}
