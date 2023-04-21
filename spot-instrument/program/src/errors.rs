//! Error handling
use anchor_lang::prelude::*;

/// Error codes.
#[error_code]
pub enum SpotError {
    #[msg("Invalid data size")]
    InvalidDataSize,
    #[msg("Passed mint account does not match")]
    PassedMintDoesNotMatch,
    #[msg("Decimals amount in the leg does not match value in mint")]
    DecimalsAmountDoesNotMatch,
    #[msg("Base asset in a leg does not match a value for this mint")]
    BaseAssetDoesNotMatch,
    #[msg("Passed account is not an associated token account of a receiver")]
    InvalidReceiver,
    #[msg("Passed address is not of a party first to prepare for settlement")]
    NotFirstToPrepare,
    #[msg("Mint type does not match. Either stablecoin passed as leg asset or asset with risk passed as quote")]
    MintTypeDoesNotMatch,
}
