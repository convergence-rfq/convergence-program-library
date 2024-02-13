use anchor_lang::prelude::*;
use risk_engine::state::OptionCommonData;

#[derive(AnchorDeserialize)]
pub struct ParsedLegData {
    pub option_common_data: OptionCommonData,
    pub mint_address: Pubkey,
    pub euro_meta_address: Pubkey,
}

impl ParsedLegData {
    pub const SERIALIZED_SIZE: usize = OptionCommonData::SERIALIZED_SIZE + 32 + 32;
}
