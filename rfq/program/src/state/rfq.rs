use anchor_lang::prelude::*;

use crate::errors::ProtocolError;

use super::protocol::BaseAssetIndex;

#[account]
pub struct Rfq {
    pub taker: Pubkey,

    pub order_type: OrderType,
    pub fixed_size: FixedSize,
    pub quote_asset: QuoteAsset,

    pub creation_timestamp: i64,
    pub active_window: u32,
    pub settling_window: u32,

    pub expected_legs_size: u16,
    pub expected_legs_hash: [u8; 32],
    pub state: StoredRfqState,
    pub non_response_taker_collateral_locked: u64,
    pub total_taker_collateral_locked: u64,
    pub total_responses: u32,
    pub cleared_responses: u32,
    pub confirmed_responses: u32,
    pub whitelist: Option<Pubkey>,

    pub reserved: [u8; 256],

    pub legs: Vec<Leg>, // TODO add limit for this size
}

impl Rfq {
    pub const MAX_LEGS_AMOUNT: u8 = 25;
    pub const MAX_LEGS_SIZE: u16 = 4096;

    pub fn get_state(&self) -> Result<RfqState> {
        let state = match self.state {
            StoredRfqState::Constructed => RfqState::Constructed,
            StoredRfqState::Active => {
                let current_time = Clock::get()?.unix_timestamp;
                if !self.active_window_ended(current_time) {
                    RfqState::Active
                } else if self.confirmed_responses == 0 {
                    RfqState::Expired
                } else if !self.settle_window_ended(current_time) {
                    RfqState::Settling
                } else {
                    RfqState::SettlingEnded
                }
            }
            StoredRfqState::Canceled => RfqState::Canceled,
        };
        Ok(state)
    }

    pub fn active_window_ended(&self, current_time: i64) -> bool {
        current_time >= self.creation_timestamp + self.active_window as i64
    }

    pub fn settle_window_ended(&self, current_time: i64) -> bool {
        current_time
            >= self.creation_timestamp + self.active_window as i64 + self.settling_window as i64
    }

    pub fn is_fixed_size(&self) -> bool {
        !matches!(self.fixed_size, FixedSize::None { padding: _ })
    }

    pub fn get_asset_instrument_data(&self, asset_identifier: AssetIdentifier) -> &Vec<u8> {
        match asset_identifier {
            AssetIdentifier::Leg { leg_index } => &self.legs[leg_index as usize].instrument_data,
            AssetIdentifier::Quote => &self.quote_asset.instrument_data,
        }
    }

    pub fn get_asset_instrument_program(&self, asset_identifier: AssetIdentifier) -> Pubkey {
        match asset_identifier {
            AssetIdentifier::Leg { leg_index } => self.legs[leg_index as usize].instrument_program,
            AssetIdentifier::Quote => self.quote_asset.instrument_program,
        }
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct QuoteAsset {
    pub instrument_program: Pubkey,
    pub instrument_data: Vec<u8>,
    pub instrument_decimals: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct Leg {
    pub instrument_program: Pubkey,
    pub base_asset_index: BaseAssetIndex,
    pub instrument_data: Vec<u8>,
    pub instrument_amount: u64,
    pub instrument_decimals: u8,
    pub side: LegSide,

    pub reserved: [u8; 64],
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ApiLeg {
    pub instrument_program: Pubkey,
    pub base_asset_index: BaseAssetIndex,
    pub instrument_data: Vec<u8>,
    pub instrument_amount: u64,
    pub instrument_decimals: u8,
    pub side: LegSide,
}

impl From<ApiLeg> for Leg {
    fn from(value: ApiLeg) -> Self {
        let ApiLeg {
            instrument_program,
            base_asset_index,
            instrument_data,
            instrument_amount,
            instrument_decimals,
            side,
        } = value;

        Self {
            instrument_program,
            base_asset_index,
            instrument_data,
            instrument_amount,
            instrument_decimals,
            side,
            reserved: [0; 64],
        }
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Copy, Clone)]
pub enum FixedSize {
    None { padding: u64 }, // for consistent serialization purposes
    BaseAsset { legs_multiplier_bps: u64 },
    QuoteAsset { quote_amount: u64 }, // only a positive quote amount allowed. If a negative one is required, the leg structure can be inversed in the RFQ
}

#[derive(AnchorSerialize, AnchorDeserialize, Copy, Clone)]
pub enum OrderType {
    Buy,
    Sell,
    TwoWay,
}

#[derive(AnchorSerialize, AnchorDeserialize, Copy, Clone)]
pub enum StoredRfqState {
    Constructed,
    Active,
    Canceled,
}

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum RfqState {
    Constructed,
    Active,
    Canceled,
    Expired,
    Settling,
    SettlingEnded,
}

impl RfqState {
    pub fn assert_state_in<const N: usize>(&self, expected_states: [Self; N]) -> Result<()> {
        if !expected_states.contains(self) {
            msg!(
                "Rfq state: {:?}, expected state: {:?}",
                self,
                expected_states
            );
            err!(ProtocolError::RfqIsNotInRequiredState)
        } else {
            Ok(())
        }
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Copy, Clone, PartialEq, Eq)]
pub enum LegSide {
    Long,
    Short,
}

#[derive(AnchorSerialize, AnchorDeserialize, Copy, Clone)]
pub enum AssetIdentifier {
    Leg { leg_index: u8 },
    Quote,
}

impl AssetIdentifier {
    pub fn to_seed_bytes(self) -> [u8; 2] {
        match self {
            AssetIdentifier::Leg { leg_index } => [0, leg_index],
            AssetIdentifier::Quote => [1, 0],
        }
    }
}
