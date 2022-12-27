use anchor_lang::prelude::*;
use rfq::state::AuthoritySide;

use dex_cpi as dex;

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
    pub dex: Pubkey,
    pub fee_model_program: Pubkey,
    pub risk_engine_program: Pubkey,
    pub fee_model_configuration_acct: Pubkey,
    pub risk_model_configuration_acct: Pubkey,
    pub fee_output_register: Pubkey,
    pub risk_output_register: Pubkey,
    pub risk_and_fee_signer: Pubkey,
    pub product_index: u64,
}

#[derive(AnchorDeserialize)]
pub struct ParsedQuoteData {
    pub operator_counterparty_fee_proportion: dex::typedefs::Fractional,
    pub operator_creator_fee_proportion: dex::typedefs::Fractional,
}
