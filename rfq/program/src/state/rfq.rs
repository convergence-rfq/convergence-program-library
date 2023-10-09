use anchor_lang::prelude::*;

use crate::errors::ProtocolError;

#[account]
pub struct Rfq {
    pub taker: Pubkey,

    pub order_type: OrderType,
    pub fixed_size: FixedSize,
    pub leg_asset: Pubkey,
    pub leg_asset_decimals: u8,
    pub quote_asset: Pubkey,

    pub creation_timestamp: i64,
    pub active_window: u32,

    pub state: StoredRfqState,

    pub total_responses: u32,
    pub settled_responses: u32,
    pub cleared_responses: u32,
}

impl Rfq {
    pub fn get_state(&self) -> Result<RfqState> {
        let state = match self.state {
            StoredRfqState::Active => {
                let current_time = Clock::get()?.unix_timestamp;
                if !self.active_window_ended(current_time) {
                    RfqState::Active
                } else if self.settled_responses == 0 {
                    RfqState::Expired
                } else {
                    RfqState::Settled
                }
            }
            StoredRfqState::Canceled => RfqState::Canceled,
        };
        Ok(state)
    }

    pub fn active_window_ended(&self, current_time: i64) -> bool {
        current_time >= self.creation_timestamp + self.active_window as i64
    }

    pub fn is_fixed_size(&self) -> bool {
        !matches!(self.fixed_size, FixedSize::None { padding: _ })
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Copy, Clone)]
pub enum FixedSize {
    None { padding: u64 }, // for consistent serialization purposes
    BaseAsset { leg_amount: u64 },
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
    Active,
    Canceled,
}

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum RfqState {
    Active,
    Canceled,
    Expired,
    Settled,
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
