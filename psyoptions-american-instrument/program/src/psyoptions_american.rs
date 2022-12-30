use anchor_lang::prelude::*;

declare_id!("R2y9ip6mxmWUj4pt54jP2hz2dgvMozy9VTSwMWE7evs");
#[derive(AnchorDeserialize, AnchorSerialize, Clone)]
pub struct OptionMarket {
    pub option_mint: Pubkey,
    pub writer_token_mint: Pubkey,
    pub underlying_asset_mint: Pubkey,
    pub quote_asset_mint: Pubkey,
    pub underlying_amount_per_contract: u64,
    pub quote_amount_per_contract: u64,
    pub expiration_unix_timestamp: i64,
    pub underlying_asset_pool: Pubkey,
    pub quote_asset_pool: Pubkey,
    pub mint_fee_account: Pubkey,
    pub exercise_fee_account: Pubkey,
    pub expired: bool,
    pub bump_seed: u8,
}

impl AccountSerialize for OptionMarket {
    fn try_serialize<W: std::io::Write>(&self, writer: &mut W) -> anchor_lang::Result<()> {
        if writer
            .write_all(&[175, 238, 162, 97, 53, 122, 16, 29])
            .is_err()
        {
            return Err(anchor_lang::error::ErrorCode::AccountDidNotSerialize.into());
        }
        if AnchorSerialize::serialize(self, writer).is_err() {
            return Err(anchor_lang::error::ErrorCode::AccountDidNotSerialize.into());
        }
        Ok(())
    }
}

impl AccountDeserialize for OptionMarket {
    fn try_deserialize(buf: &mut &[u8]) -> anchor_lang::Result<Self> {
        if buf.len() < [175, 238, 162, 97, 53, 122, 16, 29].len() {
            return Err(anchor_lang::error::ErrorCode::AccountDiscriminatorNotFound.into());
        }
        let given_disc = &buf[..8];
        if &[175, 238, 162, 97, 53, 122, 16, 29] != given_disc {
            return Err(anchor_lang::error::ErrorCode::AccountDiscriminatorMismatch.into());
        }
        Self::try_deserialize_unchecked(buf)
    }
    fn try_deserialize_unchecked(buf: &mut &[u8]) -> anchor_lang::Result<Self> {
        let mut data: &[u8] = &buf[8..];
        AnchorDeserialize::deserialize(&mut data)
            .map_err(|_| anchor_lang::error::ErrorCode::AccountDidNotDeserialize.into())
    }
}

impl anchor_lang::Discriminator for OptionMarket {
    fn discriminator() -> [u8; 8] {
        [175, 238, 162, 97, 53, 122, 16, 29]
    }
}
impl Owner for OptionMarket {
    fn owner() -> Pubkey {
        ID
    }
}
