use anchor_lang::prelude::*;
#[derive(AnchorSerialize, AnchorDeserialize, Copy, Clone, PartialEq, Eq)]
pub enum AuthoritySideDuplicate {
    Taker,
    Maker,
}

#[derive(Debug, AnchorSerialize, AnchorDeserialize, PartialEq)]
#[repr(u8)]
pub enum OptionType {
    CALL = 0,
    PUT = 1,
}
