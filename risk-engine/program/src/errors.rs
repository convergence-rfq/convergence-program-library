use anchor_lang::prelude::*;

#[error_code]
pub enum Error {
    #[msg("Failed to extract instrument type")]
    FailedToExtractInstrumentType,
}
