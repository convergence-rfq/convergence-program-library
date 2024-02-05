//! Error handling
use anchor_lang::prelude::*;

/// Error codes.
#[error_code]
pub enum HxroPrintTradeProviderError {
    #[msg("Require protocol authority")]
    NotAProtocolAuthority,
    #[msg("Invalid data size")]
    InvalidDataSize,
    #[msg("There are too many legs on the RFQ")]
    TooManyLegs,
    #[msg("Not a validated Market Product Group")]
    NotAValidatedMpg,
    #[msg("Combos are not supported")]
    CombosAreNotSupported,
    #[msg("Not enough accounts")]
    NotEnoughAccounts,
    #[msg("Invalid decimals amount")]
    InvalidDecimals,
    #[msg("Passed product account does not match the one in leg")]
    ProductAccountDoesNotMatch,
    #[msg("Invalid Hxro oracle type")]
    InvalidHxroOracleType,
    #[msg("The base asset doesn't have pyth oracle stored")]
    NoPythOracleForBaseAsset,
    #[msg("Oracle does not match with stored in the base asset")]
    OracleDoesNotMatchWithBaseAsset,
    #[msg("Base asset account index doesn't match with leg info")]
    InvalidBaseAssetAccountIndex,
    #[msg("Base asset is disabled")]
    DisabledBaseAsset,
    #[msg("Invalid leg instrument type")]
    InvalidLegInstrumentType,
    #[msg("Hxro product can expire earlier that settment would end")]
    ProductExpiresToEarly,
    #[msg("Instrument type does not match")]
    InstrumentTypeDoesNotMatch,
    #[msg("Leg data for risk engine does not match with hxro product")]
    RiskEngineDataMismatch,
    #[msg("Invalid user account passed")]
    InvalidUserAccount,
    #[msg("Invalid operator trader risk group")]
    InvalidOperatorTRG,
    #[msg("Invalid trader risk group address")]
    InvalidTRGAddress,
    #[msg("Invalid trader risk group owner")]
    InvalidTRGOwner,
    #[msg("Invalid trader risk group market")]
    InvalidTRGMarket,
    #[msg("Another TRG is expected for this operation")]
    UnexpectedTRG,
    #[msg("Print trade account expected to be signed by counterparty")]
    ExpectedSignedPrintTrade,
    #[msg("Invalid print trade address")]
    InvalidPrintTradeAddress,
    #[msg("Invalid print trade parameters")]
    InvalidPrintTradeParams,
    #[msg("Only a lock record creator can remove it")]
    NotALockCreator,
    #[msg("Not a valid taker account")]
    NotATaker,
    #[msg("Not a valid maker account")]
    NotAMaker,
    #[msg("Can't remove a collateral lock record for a live settlement")]
    RecordIsInUse,
    #[msg("Invalid collateral lock record address")]
    InvalidLockAddress,
}
