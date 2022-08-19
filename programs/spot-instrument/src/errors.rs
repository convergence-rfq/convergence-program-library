//! Error handling
use anchor_lang::prelude::*;

/// Error codes.
#[error_code]
pub enum SpotError {
    #[msg("Passed mint account does not match")]
    PassedMintDoesNotMatch,
    #[msg("Passed account is not an associated token account of a receiver")]
    InvalidReceiver,
}
