use anchor_lang::prelude::*;

#[error_code]
pub enum PsyoptionsAmericanError {
    #[msg("Invalid data size")]
    InvalidDataSize,
    #[msg("Passed mint account does not match")]
    PassedMintDoesNotMatch,
    #[msg("Passed account is not an associated token account of a receiver")]
    InvalidReceiver,
    #[msg("Passed backup address should be an associated account of protocol owner")]
    InvalidBackupAddress,
    #[msg("Passed address is not of a party first to prepare for settlement")]
    NotFirstToPrepare,
    #[msg("Passed metadata account does not match")]
    PassedAmericanMetaDoesNotMatch,
    #[msg("Passed underlying ammount does not match")]
    PassedUnderlyingAmountPerContractDoesNotMatch,
    #[msg("Passed strike price does not match")]
    PassedStrikePriceDoesNotMatch,
    #[msg("Passed expiration timestamp does not match")]
    PassedExpirationTimestampDoesNotMatch,
    #[msg("Stablecoin as base asset is not supported")]
    StablecoinAsBaseAssetIsNotSupported,
    #[msg("Passed decimals does not match")]
    DecimalsAmountDoesNotMatch,
    #[msg("Base Asset doesnt match")]
    BaseAssetDoesNotMatch,
}