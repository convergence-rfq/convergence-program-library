//! Error handling
use anchor_lang::prelude::*;

/// Error codes.
#[error_code]
pub enum ProtocolError {
    #[msg("Require protocol authority")]
    NotAProtocolAuthority,
    #[msg("Recent timestamp is too different from on-chain time")]
    InvalidRecentTimestamp,
    #[msg("Rfq is not in required state")]
    RfqIsNotInRequiredState,
    #[msg("Response does not match order type")]
    ResponseDoesNotMatchOrderType,
    #[msg("Invalid quote type")]
    InvalidQuoteType,
    #[msg("Response is for another Rfq")]
    ResponseForAnotherRfq,
    #[msg("Passed address is not a rfq taker")]
    NotATaker,
    #[msg("Response is not required state")]
    ResponseIsNotInRequiredState,
    #[msg("Confirmed side is missing in a response")]
    ConfirmedSideMissing,
    #[msg("Taker can not respond to rfq he had created")]
    TakerCanNotRespond,
    #[msg("Quote receiver account is not a receiver associated token account")]
    WrongQuoteReceiver,
    #[msg("Fixed size rfq doesn't support specifying legs multiplier")]
    NoLegMultiplierForFixedSize,
    #[msg("Leg amount can't be higher than which is specified in the quote")]
    LegAmountHigherThanInQuote,
    #[msg("Passed address is not a response maker")]
    NotAMaker,
    #[msg("Rfq have not cleared responses and can't be cleaned up")]
    HaveExistingResponses,
    #[msg("Can't cancel an rfq with existing responses")]
    HaveResponses,
    #[msg("Amount of asset to transfer overflows")]
    AssetAmountOverflow,
    #[msg("Invalid leg asset mint passed")]
    InvalidLegMint,
    #[msg("Invalid quote asset mint passed")]
    InvalidQuoteMint,
    #[msg("Invalid token account mint passed")]
    InvalidTokenAccountMint,
}
