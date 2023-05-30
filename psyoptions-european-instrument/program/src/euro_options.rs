use anchor_lang::prelude::*;

// TODO: Import euro options crate instead of this file when it would be available

declare_id!("FASQhaZQT53W9eT9wWnPoBFw8xzZDey9TbMmJj6jCQTs");

pub const TOKEN_DECIMALS: u8 = 4;

#[derive(AnchorDeserialize, AnchorSerialize, Clone)]
pub struct EuroMeta {
    pub underlying_mint: Pubkey,
    pub underlying_decimals: u8,
    pub underlying_amount_per_contract: u64,
    pub stable_mint: Pubkey,
    pub stable_decimals: u8,
    pub stable_pool: Pubkey,
    pub oracle: Pubkey,
    pub strike_price: u64,
    pub price_decimals: u8,
    pub call_option_mint: Pubkey,
    pub call_writer_mint: Pubkey,
    pub put_option_mint: Pubkey,
    pub put_writer_mint: Pubkey,
    pub underlying_pool: Pubkey,
    pub expiration: i64,
    pub bump_seed: u8,
    pub expiration_data: Pubkey,
    pub oracle_provider_id: u8,
}

impl AccountSerialize for EuroMeta {
    fn try_serialize<W: std::io::Write>(&self, writer: &mut W) -> Result<()> {
        if writer
            .write_all(&[143, 142, 75, 68, 96, 251, 84, 36])
            .is_err()
        {
            return Err(error::ErrorCode::AccountDidNotSerialize.into());
        }
        if AnchorSerialize::serialize(self, writer).is_err() {
            return Err(error::ErrorCode::AccountDidNotSerialize.into());
        }
        Ok(())
    }
}

impl AccountDeserialize for EuroMeta {
    fn try_deserialize(buf: &mut &[u8]) -> Result<Self> {
        if buf.len() < [143, 142, 75, 68, 96, 251, 84, 36].len() {
            return Err(error::ErrorCode::AccountDiscriminatorNotFound.into());
        }
        let given_disc = &buf[..8];
        if [143, 142, 75, 68, 96, 251, 84, 36] != given_disc {
            return Err(error::ErrorCode::AccountDiscriminatorMismatch.into());
        }
        Self::try_deserialize_unchecked(buf)
    }
    fn try_deserialize_unchecked(buf: &mut &[u8]) -> Result<Self> {
        let mut data: &[u8] = &buf[8..];
        AnchorDeserialize::deserialize(&mut data)
            .map_err(|_| error::ErrorCode::AccountDidNotDeserialize.into())
    }
}

impl Owner for EuroMeta {
    fn owner() -> Pubkey {
        ID
    }
}
