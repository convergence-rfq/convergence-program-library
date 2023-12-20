//! Error handling
use anchor_lang::prelude::*;

/// Error codes.
#[error_code]
pub enum ProtocolError {
    #[msg("Require protocol authority")]
    NotAProtocolAuthority,
    #[msg("Instrument already added")]
    InstrumentAlreadyAdded,
    #[msg("Fee can't be higher than 100%")]
    InvalidValueForAFee,
    #[msg("Invalid risk engine register")]
    InvalidRiskEngineRegister,
    #[msg("Passed mint is not a collateral mint")]
    NotACollateralMint,
    #[msg("Passed token account does not belong to collateral mint")]
    NotACollateralTokenAccount,
    #[msg("Passed account is not a risk engine in the protocol")]
    NotARiskEngine,
    #[msg("Recent timestamp is too different from on-chain time")]
    InvalidRecentTimestamp,
    #[msg("Expiration timestamp is invalid")]
    InvalidExpirationTimestamp,
    #[msg("An Rfq without legs is not supported")]
    EmptyLegsNotSupported,
    #[msg("Legs size does not match specified expected leg size")]
    LegsSizeDoesNotMatchExpectedSize,
    #[msg("Legs hash does not match specified expected leg hash")]
    LegsHashDoesNotMatchExpectedHash,
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
    #[msg("LegAmountExceedsMaximumLimit")]
    TooManyLegs,
    #[msg("LegsDataSizeExceedsMaximumLimit")]
    LegsDataTooBig,
    #[msg("Can't add new instrument because maximum amout of instruments already added")]
    MaxInstruments,
    #[msg("Current instrument cannot be used as a quote asset")]
    InvalidQuoteInstrument,
    #[msg("Amount of asset to transfer overflows")]
    AssetAmountOverflow,
    #[msg("Price should be positive for fixed quote asset amount RFQ")]
    PriceShouldBePositive,
    #[msg("Price cannot be negative for fixed quote asset amount RFQ")]
    PriceCannotBeNegative,
    #[msg("Already has a status to set")]
    AlreadyHasAStatusToSet,
    #[msg("Can't create an rfq using a disabled instrument")]
    InstrumentIsDisabled,
    #[msg("Can't create an rfq using a disabled base asset")]
    BaseAssetIsDisabled,
    #[msg("Can't accept default value in non-default field")]
    DefaultValueIsNotPermitted,
    #[msg("Specified oracle source is missing")]
    OracleSourceIsMissing,
    #[msg("Address Already Exists on Whitelist")]
    AddressAlreadyExistsOnWhitelist,
    #[msg("Whitelist Maximum Capacity Reached")]
    WhitelistMaximumCapacityReached,
    #[msg("Cannot Respond as Maker Address not Whitelisted")]
    MakerAddressNotWhitelisted,
    #[msg("Whitelist Creator Mismatch")]
    WhitelistCreatorMismatch,
    #[msg("Whitelist Empty")]
    WhitelistEmpty,
    #[msg("Address Does not Exist on Whitelist")]
    AddressDoesNotExistOnWhitelist,
}
