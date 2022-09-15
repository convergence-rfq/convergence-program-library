//! Error handling
use anchor_lang::prelude::*;

/// Error codes.
#[error_code]
pub enum HxroError {
    #[msg("An error occurred")]
    DefaultError,
}
