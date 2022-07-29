//! Error handling
use anchor_lang::prelude::*;

/// Error codes.
#[error_code]
pub enum ProtocolError {
    #[msg("Collateral returned")]
    CollateralReturned,
    #[msg("CPI error")]
    CpiError,
    #[msg("Invalid cancel")]
    InvalidCancel,
    #[msg("Invalid confirm")]
    InvalidConfirm,
    #[msg("Invalid fee")]
    InvalidFee,
    #[msg("Invalid quote")]
    InvalidQuote,
    #[msg("Invalid RFQ")]
    InvalidRfq,
    #[msg("Invalid taker")]
    InvalidTaker,
    #[msg("Invalid authority")]
    InvalidAuthority,
    #[msg("Invalid request")]
    InvalidRequest,
    #[msg("Last look not set")]
    LastLookNotSet,
    #[msg("Last look already done")]
    LastLookAlreadyDone,
    #[msg("Math")]
    Math,
    #[msg("Not implemented")]
    NotImplemented,
    #[msg("No collateral to return")]
    NoCollateralToReturn,
    #[msg("Order not confirmed")]
    OrderNotConfirmed,
    #[msg("Order not approved via last look")]
    OrderNotApproved,
    #[msg("Order settled")]
    OrderSettled,
    #[msg("RFQ active")]
    RfqActive,
    #[msg("RFQ inactive")]
    RfqInactive,
    #[msg("RFQ confirmed")]
    RfqConfirmed,
    #[msg("RFQ unconfirmed")]
    RfqUnconfirmed,
    #[msg("RFQ canceled")]
    RfqCanceled,
    #[msg("RFQ settled")]
    RfqSettled,
    #[msg("Error creating a dex instruction")]
    DexIxError,
}
