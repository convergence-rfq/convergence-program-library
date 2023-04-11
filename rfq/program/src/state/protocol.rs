use std::mem;

use anchor_lang::prelude::*;

use crate::errors::ProtocolError;

use super::AuthoritySide;

#[account]
pub struct ProtocolState {
    // Protocol initiator
    pub authority: Pubkey,
    pub bump: u8,

    // Active protocol means all instructions are executable
    pub active: bool,

    pub settle_fees: FeeParameters,
    pub default_fees: FeeParameters,

    pub risk_engine: Pubkey,
    pub collateral_mint: Pubkey,
    pub print_trade_providers: Vec<PrintTradeProvider>,
    pub instruments: Vec<Instrument>,
}

impl ProtocolState {
    pub const MAX_PRINT_TRADE_PROVIDERS: usize = 5;
    pub const MAX_INSTRUMENTS: usize = 50;

    pub fn get_allocated_size() -> usize {
        // mem::size_of can include unwanted additional overhead padding
        // TODO: rework from pre-allocating to reallocating on new elements addition
        8 + mem::size_of::<Self>()
            + Self::MAX_INSTRUMENTS * mem::size_of::<Instrument>()
            + Self::MAX_PRINT_TRADE_PROVIDERS * mem::size_of::<PrintTradeProvider>()
    }

    pub fn get_instrument_parameters(&self, instrument_index: u8) -> Result<&Instrument> {
        self.instruments
            .get(instrument_index as usize)
            .ok_or_else(|| error!(ProtocolError::NotAWhitelistedInstrument))
    }

    pub fn get_instrument_parameters_mut(
        &mut self,
        instrument_key: Pubkey,
    ) -> Result<&mut Instrument> {
        self.instruments
            .iter_mut()
            .find(|x| x.program_key == instrument_key)
            .ok_or_else(|| error!(ProtocolError::NotAWhitelistedInstrument))
    }

    pub fn get_print_trade_provider_parameters(
        &self,
        print_trade_provider_key: Pubkey,
    ) -> Result<&PrintTradeProvider> {
        self.print_trade_providers
            .iter()
            .find(|x| x.program_key == print_trade_provider_key)
            .ok_or_else(|| error!(ProtocolError::NotAWhitelistedPrintTradeProvider))
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Copy, Clone)]
pub struct PrintTradeProvider {
    pub program_key: Pubkey,
    pub validate_data_accounts: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Copy, Clone)]
pub struct Instrument {
    pub program_key: Pubkey,
    pub enabled: bool,
    pub can_be_used_as_quote: bool,
    pub validate_data_account_amount: u8,
    pub prepare_to_settle_account_amount: u8,
    pub settle_account_amount: u8,
    pub revert_preparation_account_amount: u8,
    pub clean_up_account_amount: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Copy, Clone)]
pub struct FeeParameters {
    pub taker_bps: u64,
    pub maker_bps: u64,
}

impl FeeParameters {
    pub const BPS_DECIMALS: usize = 9;

    pub fn calculate_fees(&self, collateral_amount: u64, side: AuthoritySide) -> u64 {
        let fees_bps = match side {
            AuthoritySide::Taker => self.taker_bps,
            AuthoritySide::Maker => self.maker_bps,
        };

        let result = (collateral_amount as u128) * (fees_bps as u128)
            / 10_u128.pow(Self::BPS_DECIMALS as u32);

        result as u64
    }

    pub fn validate(&self) -> Result<()> {
        if self.taker_bps > 10_u64.pow(Self::BPS_DECIMALS as u32) {
            return err!(ProtocolError::InvalidValueForAFee);
        }
        if self.maker_bps > 10_u64.pow(Self::BPS_DECIMALS as u32) {
            return err!(ProtocolError::InvalidValueForAFee);
        }
        Ok(())
    }
}

#[account]
pub struct BaseAssetInfo {
    pub bump: u8,
    pub index: BaseAssetIndex,
    pub enabled: bool,
    pub risk_category: RiskCategory,
    pub price_oracle: PriceOracle,
    pub ticker: String,
}

#[derive(AnchorSerialize, AnchorDeserialize, Copy, Clone, PartialEq, Eq, Hash)]
pub struct BaseAssetIndex {
    value: u16,
}

impl BaseAssetIndex {
    pub const fn new(value: u16) -> Self {
        Self { value }
    }
}

impl From<BaseAssetIndex> for u16 {
    fn from(converted: BaseAssetIndex) -> Self {
        converted.value
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Copy, Clone, PartialEq, Eq, Debug)]
pub enum RiskCategory {
    VeryLow,
    Low,
    Medium,
    High,
    VeryHigh,
    Custom1,
    Custom2,
    Custom3,
}

#[derive(AnchorSerialize, AnchorDeserialize, Copy, Clone, Debug)]
pub enum PriceOracle {
    Switchboard { address: Pubkey },
}

#[account]
pub struct MintInfo {
    pub bump: u8,
    pub mint_address: Pubkey,
    pub decimals: u8,
    pub mint_type: MintType,
}

#[derive(AnchorSerialize, AnchorDeserialize, Copy, Clone)]
pub enum MintType {
    Stablecoin,
    AssetWithRisk { base_asset_index: BaseAssetIndex },
}
