use anchor_lang::prelude::*;

#[account]
pub struct Whitelist {
    pub creator: Pubkey,
    pub capacity: u8,
    pub whitelist: Vec<Pubkey>,
}

impl Whitelist {
    pub fn is_whitelisted(&self, pubkey: &Pubkey) -> bool {
        self.whitelist.contains(pubkey)
    }
}
