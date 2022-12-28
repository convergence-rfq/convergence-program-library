use anchor_lang::prelude::*;
use rfq::state::{AssetIdentifier, AuthoritySide};
use risk_engine::state::OptionCommonData;

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

impl From<AssetIdentifierDuplicate> for AssetIdentifier {
    fn from(value: AssetIdentifierDuplicate) -> Self {
        match value {
            AssetIdentifierDuplicate::Leg { leg_index } => AssetIdentifier::Leg { leg_index },
            AssetIdentifierDuplicate::Quote => AssetIdentifier::Quote,
        }
    }
}
#[derive(Debug, AnchorSerialize, AnchorDeserialize, PartialEq)]
#[repr(u8)]
pub enum OptionType {
    CALL = 0,
    PUT = 1,
}

#[derive(AnchorSerialize, AnchorDeserialize, Copy, Clone)]
pub enum AssetIdentifierDuplicate {
    Leg { leg_index: u8 },
    Quote,
}
// #[account]
// pub struct OptionMarket {
//     pub option_mint: Pubkey,
//     pub writer_token_mint: Pubkey,
//     pub underlying_asset_mint: Pubkey,
//     pub quote_asset_mint: Pubkey,
//     pub underlying_amount_per_contract: u64,
//     pub quote_amount_per_contract: u64,
//     pub expiration_unix_timestamp: i64,
//     pub underlying_asset_pool: Pubkey,
//     pub quote_asset_pool: Pubkey,
//     pub mint_fee_account: Pubkey,
//     pub exercise_fee_account: Pubkey,
//     pub expired: bool,
//     pub bump_seed: u8,
// }

#[derive(AnchorDeserialize)]
pub struct ParsedLegData {
    pub option_common_data: OptionCommonData,
    pub mint_address: Pubkey,
    pub american_meta_address: Pubkey,
}

impl ParsedLegData {
    pub const SERIALIZED_SIZE: usize = OptionCommonData::SERIALIZED_SIZE + 32 + 32;
}
