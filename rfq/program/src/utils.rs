use anchor_lang::prelude::*;

pub trait ToAccountMeta {
    fn to_account_meta(&self) -> AccountMeta;
}

impl<'info> ToAccountMeta for AccountInfo<'info> {
    fn to_account_meta(&self) -> AccountMeta {
        match self.is_writable {
            false => AccountMeta::new_readonly(*self.key, self.is_signer),
            true => AccountMeta::new(*self.key, self.is_signer),
        }
    }
}
