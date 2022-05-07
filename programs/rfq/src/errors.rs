//! Error handling
use anchor_lang::prelude::*;

/// Error codes.
#[error_code]
pub enum ProtocolError {
    #[msg("Collateral returned")]
    CollateralReturned,
    #[msg("Invalid confirm")]
    InvalidConfirm,
    #[msg("Invalid order")]
    InvalidOrder,
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
    #[msg("Invalid order amount")]
    InvalidOrderAmount,
    #[msg("Invalid settle")]
    InvalidSettle,
    #[msg("Last look not set")]
    LastLookNotSet,
    #[msg("Math")]
    Math,
    #[msg("Order confirmed")]
    OrderConfirmed,
    #[msg("Order settled")]
    OrderSettled,
    #[msg("Order not approved via last look")]
    OrderNotApproved,
    #[msg("RFQ confirmed")]
    RfqConfirmed,
    #[msg("RFQ active or unconfirmed")]
    RfqActiveOrUnconfirmed,
    #[msg("RFQ inactive")]
    RfqInactive,
    #[msg("RFQ settled")]
    RfqSettled,
}
