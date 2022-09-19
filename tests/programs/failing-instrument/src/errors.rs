//! Error handling
use anchor_lang::prelude::*;

/// Error codes.
#[error_code]
pub enum Error {
    #[msg("Invalid data size")]
    InvalidDataSize,
    #[msg("Taker fails on settle")]
    TakerFailsOnSettle,
    #[msg("Maker fails on settle")]
    MakerFailsOnSettle,
}
