///! Error handling
use anchor_lang::prelude::*;

/// Error handling codes.
#[error_code]
pub enum ProtocolError {
    #[msg("Active or unconfirmed")]
    ActiveOrUnconfirmed,
    #[msg("Collateral returned")]
    CollateralReturned,
    #[msg("Expired")]
    Expired,
    #[msg("Invalid confirm")]
    InvalidConfirm,
    #[msg("Invalid order")]
    InvalidOrder,
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
    #[msg("Last look has not been set")]
    LastLookNotSet,
    #[msg("RFQ confirmed")]
    RfqConfirmed,
    #[msg("Order confirmed")]
    OrderConfirmed,
    #[msg("Order settled")]
    OrderSettled,
    #[msg("Order not approved via last look")]
    OrderNotApproved,
    #[msg("RFQ settled")]
    RfqSettled,
}
