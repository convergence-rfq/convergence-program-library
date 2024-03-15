use anchor_lang::prelude::*;

#[error_code]
pub enum VaultError {
    #[msg("Spot Instrument not found in protocol account")]
    SpotInstrumentNotFound,
    #[msg("Vault should be an associated token account for send token")]
    WrongVaultAddress,
    #[msg("Mint does not match")]
    MintDoesNotMatch,
    #[msg("Vault operator only supports fixed base sell or fixed quote buy rfqs")]
    UnsupportedRfqType,
    #[msg("Rfq account does not match this vault")]
    InvalidRfq,
    #[msg("Another response has already been confirmed")]
    AlreadyConfirmed,
    #[msg("Price is worse than the specified limit")]
    PriceWorseThanLimit,
    #[msg("Response does not match previously confirmed")]
    WrongResponse,
    #[msg("Creator address does not match this vault's creator")]
    WrongCreatorAddress,
}
