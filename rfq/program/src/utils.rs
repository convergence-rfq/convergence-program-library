use anchor_lang::prelude::*;

use crate::errors::ProtocolError;

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

pub fn default_as_none<T: Default + PartialEq>(value: T) -> Option<T> {
    if value != Default::default() {
        Some(value)
    } else {
        None
    }
}

pub fn none_as_default<T: Default + PartialEq>(value: Option<T>) -> Result<T> {
    match value {
        Some(value) if value == Default::default() => {
            err!(ProtocolError::DefaultValueIsNotPermitted)
        }
        Some(value) => Ok(value),
        None => Ok(Default::default()),
    }
}
