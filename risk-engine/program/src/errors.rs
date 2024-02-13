use anchor_lang::prelude::*;

#[error_code]
pub enum Error {
    #[msg("Overflow occured during calculations")]
    MathOverflow,
    #[msg("Can't convert value because it causes an overflow")]
    MathInvalidConversion,
    #[msg("Not enough accounts for collateral calculations")]
    NotEnoughAccounts,
    #[msg("Can't extract price because an oracle is stale")]
    StaleOracle,
    #[msg("Invalid oracle data")]
    InvalidOracleData,
    #[msg("Can't extract price because oracle confidence is out of bounds")]
    OracleConfidenceOutOfRange,
    #[msg("Base asset info account mismatch with rfq legs")]
    InvalidBaseAssetInfo,
    #[msg("Oracle account mismatch with rfq legs")]
    InvalidOracle,
    #[msg("Price for a base asset is missing")]
    MissingPriceForABaseAsset,
    #[msg("Require protocol authority")]
    NotAProtocolAuthority,
    #[msg("Instrument is not added to the risk engine")]
    MissingInstrument,
    #[msg("Missing instrument index")]
    MissingInstrumentIndex,
    #[msg("Failed to extract instrument type")]
    FailedToExtractInstrumentType,
}
