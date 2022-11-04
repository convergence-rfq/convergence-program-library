use anchor_lang::prelude::*;

#[error_code]
pub enum Error {
    #[msg("Overflow occured during calculations")]
    MathOverflow,
    #[msg("Can't convert value because it causes an overflow")]
    MathInvalidConversion,
    #[msg("Not enough accounts for collateral calculations")]
    NotEnoughAccounts,
    #[msg("Failed to extract price")]
    FailedToExtractPrice,
    #[msg("Base asset info account mismatch with rfq legs")]
    InvalidBaseAssetInfo,
    #[msg("Oracle account mismatch with rfq legs")]
    InvalidOracle,
    #[msg("Group max loss can't be negative")]
    RiskCanNotBeNegative,
    #[msg("Price for a base asset is missing")]
    MissingPriceForABaseAsset,
}
