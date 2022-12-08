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
}
