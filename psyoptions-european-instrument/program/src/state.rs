use anchor_lang::prelude::*;
use rfq::state::{AssetIdentifier, AuthoritySide};
use risk_engine::state::OptionCommonData;

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

#[derive(AnchorDeserialize)]
pub struct ParsedLegData {
    pub option_common_data: OptionCommonData,
    pub mint_address: Pubkey,
    pub euro_meta_address: Pubkey,
}

impl ParsedLegData {
    pub const SERIALIZED_SIZE: usize = OptionCommonData::SERIALIZED_SIZE + 32 + 32;
}
