use anchor_lang::prelude::*;
use rfq::state::{AssetIdentifier, AuthoritySide};

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

#[derive(AnchorSerialize, AnchorDeserialize, Copy, Clone)]
pub enum AssetIdentifierDuplicate {
    Leg { leg_index: u8 },
    Quote,
}

impl From<AssetIdentifierDuplicate> for AssetIdentifier {
    fn from(value: AssetIdentifierDuplicate) -> Self {
        match value {
            AssetIdentifierDuplicate::Leg { leg_index } => AssetIdentifier::Leg { leg_index },
            AssetIdentifierDuplicate::Quote => AssetIdentifier::Quote,
        }
    }
}
