//! Error handling
use anchor_lang::prelude::*;

/// Error codes.
#[error_code]
pub enum ProtocolError {
    #[msg("Collateral returned")]
    CollateralReturned,
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
    #[msg("Math")]
    Math,
    #[msg("Order confirmed")]
    OrderConfirmed,
    #[msg("Order not approved via last look")]
    OrderNotApproved,
    #[msg("Order settled")]
    OrderSettled,
    #[msg("RFQ confirmed")]
    RfqConfirmed,
    #[msg("RFQ active or unconfirmed")]
    RfqActiveOrUnconfirmed,
    #[msg("RFQ inactive or confirmed")]
    RfqInactiveOrConfirmed,
    #[msg("RFQ settled")]
    RfqSettled,
}
