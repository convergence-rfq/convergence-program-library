use anchor_lang::prelude::*;

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
}
