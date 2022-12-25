use anchor_lang::prelude::*;
#[derive(AnchorSerialize, AnchorDeserialize, Copy, Clone, PartialEq, Eq)]
pub enum AuthoritySideDuplicate {
    Taker,
    Maker,
}

#[derive(Debug, AnchorSerialize, AnchorDeserialize, PartialEq)]
#[repr(u8)]
pub enum OptionType {
    CALL = 0,
    PUT = 1,
}

#[account]
pub struct OptionMarket {
    pub option_mint: Pubkey,
    pub writer_token_mint: Pubkey,
    pub underlying_asset_mint: Pubkey,
    pub quote_asset_mint: Pubkey,
    pub underlying_amount_per_contract: u64,
    pub quote_amount_per_contract: u64,
    pub expiration_unix_timestamp: i64,
    pub underlying_asset_pool: Pubkey,
    pub quote_asset_pool: Pubkey,
    pub mint_fee_account: Pubkey,
    pub exercise_fee_account: Pubkey,
    pub expired: bool,
    pub bump_seed: u8,
}
