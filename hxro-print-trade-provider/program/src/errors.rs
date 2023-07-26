//! Error handling
use anchor_lang::prelude::*;

/// Error codes.
#[error_code]
pub enum HxroError {
    #[msg("Invalid data size")]
    InvalidDataSize,
    #[msg("There are too many legs on the RFQ")]
    TooManyLegs,
}
