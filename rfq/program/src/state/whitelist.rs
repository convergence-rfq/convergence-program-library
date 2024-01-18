use anchor_lang::prelude::*;

use crate::{errors::ProtocolError, Rfq};

#[account]
pub struct Whitelist {
    pub creator: Pubkey,
    pub associated_rfq: Pubkey,
    pub whitelist: Vec<Pubkey>,
}

impl Whitelist {
    pub const MAX_WHITELIST_SIZE: u8 = 20;
    pub fn is_whitelisted(&self, pubkey: &Pubkey) -> bool {
        self.whitelist.contains(pubkey)
    }
    pub fn validate<'info>(
        whitelist: &Option<Box<Account<'info, Whitelist>>>,
        rfq: &Account<'info, Rfq>,
    ) -> Result<()> {
        match whitelist {
            Some(whitelist) => {
                require_keys_eq!(
                    rfq.whitelist,
                    whitelist.key(),
                    ProtocolError::WhitelistAddressMismatch
                );
                require_keys_eq!(
                    whitelist.associated_rfq,
                    rfq.key(),
                    ProtocolError::WhitelistAssocaitionRFQMismatch
                );
            }
            None => {
                require_keys_eq!(
                    rfq.whitelist,
                    Pubkey::default(),
                    ProtocolError::WhitelistNotProvided
                );
            }
        }
        Ok(())
    }
}
