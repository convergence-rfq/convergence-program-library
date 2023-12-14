use anchor_lang::prelude::*;
use dex::utils::numeric::Fractional;
use rfq::state::AuthoritySide;

#[account]
#[derive(InitSpace)]
pub struct Config {
    pub valid_mpg: Pubkey,
}

#[account]
#[derive(InitSpace)]
pub struct LockedCollateralRecord {
    pub user: Pubkey,
    pub response: Pubkey,
    pub trg: Pubkey,
    pub is_in_use: bool,
    pub locks: [ProductInfo; 6],
    pub reserved: [u8; 64],
}

#[derive(AnchorSerialize, AnchorDeserialize, Copy, Clone, PartialEq, Eq, Default, InitSpace)]
pub struct ProductInfo {
    pub product_index: u64,
    pub size: FractionalCopy,
}

#[repr(C)]
#[derive(AnchorSerialize, AnchorDeserialize, Copy, Clone, PartialEq, Eq, Default, InitSpace)]
pub struct FractionalCopy {
    pub m: i64,
    pub exp: u64,
}

impl From<FractionalCopy> for Fractional {
    fn from(value: FractionalCopy) -> Self {
        Self {
            m: value.m,
            exp: value.exp,
        }
    }
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
