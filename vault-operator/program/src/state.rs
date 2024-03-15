use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct VaultParams {
    pub creator: Pubkey,
    pub rfq: Pubkey,
    pub acceptable_price_limit: u128, // the same decimals as in Quote price_bps
    pub confirmed_response: Pubkey,   // default pubkey means no confirmation yet
}
