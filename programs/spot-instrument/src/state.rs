use anchor_lang::prelude::*;
use rfq::states::AuthoritySide;

// Duplicate required because anchor doesn't generate IDL for imported structs
#[derive(AnchorSerialize, AnchorDeserialize, Copy, Clone, PartialEq, Eq)]
pub enum AuthoritySideDuplicate {
    Taker,
    Maker,
}

impl Into<AuthoritySide> for AuthoritySideDuplicate {
    fn into(self) -> AuthoritySide {
        match self {
            AuthoritySideDuplicate::Taker => AuthoritySide::Taker,
            AuthoritySideDuplicate::Maker => AuthoritySide::Maker,
        }
    }
}
