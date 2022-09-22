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
    #[msg("Leg size does not match specified expected leg size")]
    LegSizeDoesNotMatchExpectedSize,
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
    #[msg("Passed address is not a rfq taker")]
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
    #[msg("Fixed size rfq doesn't support specifying legs multiplier")]
    NoLegMultiplierForFixedSize,
    #[msg("Leg multiplier can't be higher than which is specified in the quote")]
    LegMultiplierHigherThanInQuote,
    #[msg("Confirmation can't lock additional maker collateral")]
    CanNotLockAdditionalMakerCollateral,
    #[msg("This side of rfq either had not prepared or had already reverted")]
    NoPreparationToRevert,
    #[msg("No collateral locked")]
    NoCollateralLocked,
    #[msg("Invalid defaulting party")]
    InvalidDefaultingParty,
    #[msg("Can't clean up with collateral locked")]
    HaveCollateralLocked,
    #[msg("Can't clean up with pending settle preparations")]
    PendingPreparations,
    #[msg("Passed backup address should be an associated account of protocol owner")]
    InvalidBackupAddress,
    #[msg("Passed address is not a response maker")]
    NotAMaker,
    #[msg("Passed address is not of a party first to prepare for settlement")]
    NotFirstToPrepare,
    #[msg("Rfq have not cleared responses and can't be cleaned up")]
    HaveExistingResponses,
    #[msg("Can't cancel an rfq with existing responses")]
    HaveResponses,
    #[msg("Invalid specified leg amount")]
    InvalidSpecifiedLegAmount,
    #[msg("Already started to prepare to settle")]
    AlreadyStartedToPrepare,
    #[msg("Have not started to prepare to settle")]
    HaveNotStartedToPrepare,
}
