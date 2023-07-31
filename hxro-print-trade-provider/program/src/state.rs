use anchor_lang::prelude::*;
use rfq::state::AuthoritySide;

#[account]
#[derive(InitSpace)]
pub struct Config {
    pub valid_mpg: Pubkey,
}

// Duplicate required because anchor doesn't generate IDL for imported structs
#[derive(AnchorSerialize, AnchorDeserialize, Copy, Clone, PartialEq, Eq)]
pub enum AuthoritySideDuplicate {
    Taker,
    Maker,
}

impl From<AuthoritySideDuplicate> for AuthoritySide {
    fn from(value: AuthoritySideDuplicate) -> Self {
        match value {
            AuthoritySideDuplicate::Taker => AuthoritySide::Taker,
            AuthoritySideDuplicate::Maker => AuthoritySide::Maker,
        }
    }
}

#[derive(AnchorDeserialize)]
pub struct ParsedLegData {
    pub product_index: u8,
}
