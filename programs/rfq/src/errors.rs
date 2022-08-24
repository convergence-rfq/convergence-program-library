//! Error handling
use anchor_lang::prelude::*;

/// Error codes.
#[error_code]
pub enum ProtocolError {
    #[msg("Require protocol authority")]
    NotAProtocolAuthority,
    #[msg("Instrument already added")]
    InstrumentAlreadyAdded,
    #[msg("Invalid risk engine register")]
    InvalidRiskEngineRegister,
    #[msg("Passed mint is not a collateral mint")]
    NotACollateralMint,
    #[msg("Passed token account does not belong to collateral mint")]
    NotACollateralTokenAccount,
    #[msg("Passed account is not a risk engine in the protocol")]
    NotARiskEngine,
    #[msg("An Rfq without legs is not supported")]
    EmptyLegsNotSupported,
    #[msg("Not enough tokens")]
    NotEnoughTokens,
    #[msg("Not enough collateral")]
    NotEnoughCollateral,
    #[msg("Not a whitelisted instrument")]
    NotAWhitelistedInstrument,
    #[msg("Not enough accounts")]
    NotEnoughAccounts,
    #[msg("Passed program id differs from an instrument")]
    PassedProgramIdDiffersFromAnInstrument,
    #[msg("Rfq is not in required state")]
    RfqIsNotInRequiredState,
    #[msg("Response does not match order type")]
    ResponseDoesNotMatchOrderType,
    #[msg("Invalid quote type")]
    InvalidQuoteType,
    #[msg("Response is for another Rfq")]
    ResponseForAnotherRfq,
    #[msg("Caller is not a taker")]
    NotATaker,
    #[msg("Response is not required state")]
    ResponseIsNotInRequiredState,
    #[msg("Confirmed side is missing in a response")]
    ConfirmedSideMissing,
    #[msg("Caller is not a authority passed in parameters")]
    NotAPassedAuthority,
    #[msg("Taker can not respond to rfq he had created")]
    TakerCanNotRespond,
    #[msg("Not a quote mint")]
    NotAQuoteMint,
    #[msg("Quote receiver account is not a receiver associated token account")]
    WrongQuoteReceiver,
}
