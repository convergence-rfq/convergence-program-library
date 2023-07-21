use anchor_lang::prelude::*;

// Imported from psy_american v0.2.7 package as it has outdated dependencies
// TODO: try to make project build using psy_american package and import from there

declare_id!("R2y9ip6mxmWUj4pt54jP2hz2dgvMozy9VTSwMWE7evs");

/// Data structure that contains all the information needed to maintain an open
/// option market.
#[derive(AnchorDeserialize, AnchorSerialize, Clone, Default)]
pub struct OptionMarket {
    /// The SPL Token mint address for the tokens that denote an option
    pub option_mint: Pubkey,
    /// The SPL Token mint address for Writer Tokens that denote a written option
    pub writer_token_mint: Pubkey,
    /// The SPL Token Address that is held in the program's pool when an option is written
    pub underlying_asset_mint: Pubkey,
    /// The SPL Token Address that denominates the strike price
    pub quote_asset_mint: Pubkey,
    /// The amount of the **underlying asset** that derives a single option
    pub underlying_amount_per_contract: u64,
    /// The amount of **quote asset** that must be transfered when an option is exercised
    pub quote_amount_per_contract: u64,
    /// The Unix timestamp at which the contracts in this market expire
    pub expiration_unix_timestamp: i64,
    /// Address for the liquidity pool that contains the underlying assset
    pub underlying_asset_pool: Pubkey,
    /// Address for the liquidity pool that contains the quote asset when
    /// options are exercised
    pub quote_asset_pool: Pubkey,
    /// The SPL Token account (from the Associated Token Program) that collects
    /// fees on mint.
    pub mint_fee_account: Pubkey,
    /// The SPL Token account (from the Associated Token Program) that collects
    /// fees on exercise.
    pub exercise_fee_account: Pubkey,
    /// A flag to set and use to when running a memcmp query.
    /// This will be set when Serum markets are closed and expiration is validated
    pub expired: bool,
    /// Bump seed for the market PDA
    pub bump_seed: u8,
}

#[automatically_derived]
impl anchor_lang::AccountSerialize for OptionMarket {
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
#[automatically_derived]
impl anchor_lang::AccountDeserialize for OptionMarket {
    fn try_deserialize(buf: &mut &[u8]) -> anchor_lang::Result<Self> {
        if buf.len() < [175, 238, 162, 97, 53, 122, 16, 29].len() {
            return Err(anchor_lang::error::ErrorCode::AccountDiscriminatorNotFound.into());
        }
        let given_disc = &buf[..8];
        if [175, 238, 162, 97, 53, 122, 16, 29] != given_disc {
            return Err(anchor_lang::error!(
                anchor_lang::error::ErrorCode::AccountDiscriminatorMismatch
            )
            .with_account_name("OptionMarket"));
        }
        Self::try_deserialize_unchecked(buf)
    }
    fn try_deserialize_unchecked(buf: &mut &[u8]) -> anchor_lang::Result<Self> {
        let mut data: &[u8] = &buf[8..];
        AnchorDeserialize::deserialize(&mut data)
            .map_err(|_| anchor_lang::error::ErrorCode::AccountDidNotDeserialize.into())
    }
}
#[automatically_derived]
impl anchor_lang::Discriminator for OptionMarket {
    const DISCRIMINATOR: [u8; 8] = [175, 238, 162, 97, 53, 122, 16, 29];
}
#[automatically_derived]
impl anchor_lang::Owner for OptionMarket {
    fn owner() -> Pubkey {
        ID
    }
}
