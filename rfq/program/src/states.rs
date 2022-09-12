use std::mem;

use anchor_lang::prelude::*;
use anchor_spl::{associated_token::get_associated_token_address, token::TokenAccount};

use crate::errors::ProtocolError;

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
    pub instruments: Vec<Instrument>,
}

impl ProtocolState {
    pub const INSTRUMENT_SIZE: usize = mem::size_of::<Pubkey>() + mem::size_of::<Instrument>();
    pub const MAX_INSTRUMENTS: usize = 50;

    pub fn get_instrument_parameters(&self, instrument_key: Pubkey) -> Result<&Instrument> {
        self.instruments
            .iter()
            .find(|x| x.program_key == instrument_key)
            .ok_or(error!(ProtocolError::NotAWhitelistedInstrument))
    }
}

#[account]
pub struct Rfq {
    pub taker: Pubkey,

    pub order_type: OrderType,
    pub last_look_enabled: bool,
    pub fixed_size: FixedSize,
    pub quote_mint: Pubkey,
    pub access_manager: Option<Pubkey>, // replase with nullable wrapper

    pub creation_timestamp: i64,
    pub active_window: u32,
    pub settling_window: u32,

    pub state: StoredRfqState,
    pub non_response_taker_collateral_locked: u64,
    pub total_taker_collateral_locked: u64,
    pub total_responses: u32,
    pub cleared_responses: u32,
    pub confirmed_responses: u32,

    pub legs: Vec<Leg>,
}

impl Rfq {
    pub fn get_state(&self) -> Result<RfqState> {
        let state = match self.state {
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
}

#[account]
pub struct Response {
    pub maker: Pubkey,
    pub rfq: Pubkey,

    pub creation_timestamp: i64,
    pub maker_collateral_locked: u64,
    pub taker_collateral_locked: u64,
    pub state: StoredResponseState,
    pub taker_prepared_to_settle: bool,
    pub maker_prepared_to_settle: bool,

    pub confirmed: Option<Confirmation>,
    pub defaulting_party: Option<DefaultingParty>,
    pub first_to_prepare: Option<AuthoritySide>,
    pub bid: Option<Quote>,
    pub ask: Option<Quote>,
}

impl Response {
    pub fn get_authority_side(&self, rfq: &Rfq, caller: &Pubkey) -> Option<AuthoritySide> {
        if caller == &self.maker {
            Some(AuthoritySide::Maker)
        } else if caller == &rfq.taker {
            Some(AuthoritySide::Taker)
        } else {
            None
        }
    }

    pub fn get_state(&self, rfq: &Rfq) -> Result<ResponseState> {
        let current_time = Clock::get()?.unix_timestamp;
        let active_window_ended = rfq.active_window_ended(current_time);
        let settle_window_ended = rfq.settle_window_ended(current_time);
        let state = match self.state {
            StoredResponseState::Active => {
                if !active_window_ended {
                    ResponseState::Active
                } else {
                    ResponseState::Expired
                }
            }
            StoredResponseState::Canceled => ResponseState::Canceled,
            StoredResponseState::WaitingForLastLook => {
                if !active_window_ended {
                    ResponseState::WaitingForLastLook
                } else {
                    ResponseState::Expired
                }
            }
            StoredResponseState::SettlingPreparations => {
                if !settle_window_ended {
                    if self.taker_prepared_to_settle {
                        ResponseState::OnlyTakerPrepared
                    } else if self.maker_prepared_to_settle {
                        ResponseState::OnlyMakerPrepared
                    } else {
                        ResponseState::SettlingPreparations
                    }
                } else {
                    ResponseState::Defaulted
                }
            }
            StoredResponseState::ReadyForSettling => ResponseState::ReadyForSettling,
            StoredResponseState::Settled => ResponseState::Settled,
            StoredResponseState::Defaulted => ResponseState::Defaulted,
        };
        Ok(state)
    }

    pub fn get_leg_amount_to_transfer(&self, rfq: &Rfq, leg_index: u8, side: AuthoritySide) -> i64 {
        let leg = &rfq.legs[leg_index as usize];
        let confirmation = self.confirmed.unwrap();
        let quote = self.get_confirmed_quote().unwrap();

        let leg_multiplier_bps = match quote {
            Quote::Standart {
                price_quote: _,
                legs_multiplier_bps,
            } => legs_multiplier_bps,
            Quote::FixedSize {
                price_quote:
                    PriceQuote::AbsolutePrice {
                        amount_bps: price_bps,
                    },
            } => match rfq.fixed_size {
                FixedSize::None { padding: _ } => unreachable!(),
                FixedSize::BaseAsset {
                    legs_multiplier_bps,
                } => legs_multiplier_bps,
                FixedSize::QuoteAsset { quote_amount } => {
                    // quote multiplied by leg decimals divided by the price
                    let leg_multiplier_bps = quote_amount as u128
                        * 10_u128.pow(Quote::LEG_MULTIPLIER_DECIMALS)
                        * 10_u128.pow(PriceQuote::ABSOLUTE_PRICE_DECIMALS)
                        / price_bps;
                    leg_multiplier_bps as u64
                }
            },
        };

        let result = leg.instrument_amount as u128 * leg_multiplier_bps as u128
            / 10_u128.pow(Quote::LEG_MULTIPLIER_DECIMALS);
        let mut result = result as i64;

        if let Side::Ask = leg.side {
            result = -result;
        }
        if let Side::Bid = confirmation.side {
            result = -result;
        }
        if let AuthoritySide::Taker = side {
            result = -result;
        }

        result
    }

    pub fn get_quote_amount_to_transfer(&self, rfq: &Rfq, side: AuthoritySide) -> i64 {
        let confirmation = self.confirmed.unwrap();
        let quote = self.get_confirmed_quote().unwrap();

        let mut result = if let FixedSize::QuoteAsset { quote_amount } = rfq.fixed_size {
            quote_amount as i64
        } else {
            let legs_multiplier_bps = match quote {
                Quote::Standart {
                    price_quote: _,
                    legs_multiplier_bps,
                } => legs_multiplier_bps,
                Quote::FixedSize {
                    price_quote: PriceQuote::AbsolutePrice { amount_bps: _ },
                } => match rfq.fixed_size {
                    FixedSize::BaseAsset {
                        legs_multiplier_bps,
                    } => legs_multiplier_bps,
                    FixedSize::None { padding: _ } => unreachable!(),
                    FixedSize::QuoteAsset { quote_amount: _ } => unreachable!(),
                },
            };
            let price_bps = match quote {
                Quote::Standart {
                    price_quote: PriceQuote::AbsolutePrice { amount_bps },
                    legs_multiplier_bps: _,
                } => amount_bps,
                Quote::FixedSize {
                    price_quote: PriceQuote::AbsolutePrice { amount_bps },
                } => amount_bps,
            };

            let result = legs_multiplier_bps as u128 * price_bps
                / 10_u128.pow(Quote::LEG_MULTIPLIER_DECIMALS + PriceQuote::ABSOLUTE_PRICE_DECIMALS);
            result as i64
        };

        if let Side::Bid = confirmation.side {
            result = -result;
        }
        if let AuthoritySide::Maker = side {
            result = -result;
        }

        result
    }

    pub fn get_leg_assets_receiver(&self, rfq: &Rfq, leg_index: u8) -> AuthoritySide {
        let taker_amount = self.get_leg_amount_to_transfer(rfq, leg_index, AuthoritySide::Taker);
        if taker_amount > 0 {
            AuthoritySide::Maker
        } else {
            AuthoritySide::Taker
        }
    }

    pub fn get_quote_tokens_receiver(&self, rfq: &Rfq) -> AuthoritySide {
        let taker_amount = self.get_quote_amount_to_transfer(rfq, AuthoritySide::Taker);
        if taker_amount > 0 {
            AuthoritySide::Maker
        } else {
            AuthoritySide::Taker
        }
    }

    pub fn get_confirmed_quote(&self) -> Option<Quote> {
        match self.confirmed {
            Some(confirmation) => {
                let mut quote = match confirmation.side {
                    Side::Bid => self.bid,
                    Side::Ask => self.ask,
                }
                .unwrap()
                .clone();

                // apply overriden leg multiplier
                if let Some(override_leg_multiplier_bps) = confirmation.override_leg_multiplier_bps
                {
                    match &mut quote {
                        Quote::Standart {
                            price_quote: _,
                            legs_multiplier_bps,
                        } => *legs_multiplier_bps = override_leg_multiplier_bps,
                        Quote::FixedSize { price_quote: _ } => unreachable!(),
                    }
                }

                Some(quote)
            }
            None => None,
        }
    }

    pub fn default_by_time(&mut self) {
        self.state = StoredResponseState::Defaulted;
        let defaulting_party = match (self.taker_prepared_to_settle, self.maker_prepared_to_settle)
        {
            (false, false) => DefaultingParty::Both,
            (true, false) => DefaultingParty::Maker,
            (false, true) => DefaultingParty::Taker,
            _ => unreachable!(),
        };
        self.defaulting_party = Some(defaulting_party);
    }

    pub fn have_locked_collateral(&self) -> bool {
        self.taker_collateral_locked > 0 || self.maker_collateral_locked > 0
    }
}

#[account]
pub struct CollateralInfo {
    pub bump: u8,
    pub user: Pubkey,
    pub token_account_bump: u8,
    pub locked_tokens_amount: u64,
}

impl CollateralInfo {
    pub fn lock_collateral(&mut self, token_account: &TokenAccount, amount: u64) -> Result<()> {
        require!(
            amount <= token_account.amount - self.locked_tokens_amount,
            ProtocolError::NotEnoughCollateral
        );
        self.locked_tokens_amount += amount;
        Ok(())
    }

    pub fn unlock_collateral(&mut self, amount: u64) -> () {
        self.locked_tokens_amount -= amount;
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Copy, Clone)]
pub struct Instrument {
    pub program_key: Pubkey,
    pub validate_data_account_amount: u8,
    pub prepare_to_settle_account_amount: u8,
    pub settle_account_amount: u8,
    pub revert_preparation_account_amount: u8,
    pub clean_up_account_amount: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Copy, Clone)]
pub struct FeeParameters {
    taker_bps: u64,
    maker_bps: u64,
}

impl FeeParameters {
    pub const BPS_DECIMALS: usize = 9;
}

#[derive(AnchorSerialize, AnchorDeserialize, Copy, Clone)]
pub enum FixedSize {
    None { padding: u64 }, // for consistent serialization purposes
    BaseAsset { legs_multiplier_bps: u64 },
    QuoteAsset { quote_amount: u64 },
}

#[derive(AnchorSerialize, AnchorDeserialize, Copy, Clone)]
pub enum OrderType {
    Buy,
    Sell,
    TwoWay,
}

#[derive(AnchorSerialize, AnchorDeserialize, Copy, Clone)]
pub enum Quote {
    Standart {
        price_quote: PriceQuote,
        legs_multiplier_bps: u64,
    },
    FixedSize {
        price_quote: PriceQuote,
    },
}

impl Quote {
    const LEG_MULTIPLIER_DECIMALS: u32 = 9;
}

#[derive(AnchorSerialize, AnchorDeserialize, Copy, Clone)]
pub enum PriceQuote {
    AbsolutePrice { amount_bps: u128 },
}

impl PriceQuote {
    const ABSOLUTE_PRICE_DECIMALS: u32 = 9;
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

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct Leg {
    pub instrument: Pubkey,
    pub instrument_data: Vec<u8>,
    pub instrument_amount: u64,
    pub side: Side,
}

impl Leg {
    pub const EMPTY_SIZE: usize = 32 + 4 + 8 + 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Copy, Clone)]
pub enum Side {
    Bid,
    Ask,
}

#[derive(AnchorSerialize, AnchorDeserialize, Copy, Clone)]
pub struct Confirmation {
    pub side: Side,
    pub override_leg_multiplier_bps: Option<u64>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Copy, Clone, PartialEq, Eq)]
pub enum StoredResponseState {
    Active,
    Canceled,
    WaitingForLastLook,
    SettlingPreparations,
    ReadyForSettling,
    Settled,
    Defaulted,
}

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum ResponseState {
    Active,
    Canceled,
    WaitingForLastLook,
    SettlingPreparations,
    OnlyMakerPrepared,
    OnlyTakerPrepared,
    ReadyForSettling,
    Settled,
    Defaulted,
    Expired,
}

impl ResponseState {
    pub fn assert_state_in<const N: usize>(&self, expected_states: [Self; N]) -> Result<()> {
        if !expected_states.contains(self) {
            msg!(
                "Rfq state: {:?}, expected states: {:?}",
                self,
                expected_states
            );
            err!(ProtocolError::ResponseIsNotInRequiredState)
        } else {
            Ok(())
        }
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Copy, Clone, PartialEq, Eq)]
pub enum AuthoritySide {
    Taker,
    Maker,
}

#[derive(AnchorSerialize, AnchorDeserialize, Copy, Clone, PartialEq, Eq)]
pub enum DefaultingParty {
    Taker,
    Maker,
    Both,
}

impl AuthoritySide {
    pub fn revert(self) -> Self {
        match self {
            AuthoritySide::Taker => AuthoritySide::Maker,
            AuthoritySide::Maker => AuthoritySide::Taker,
        }
    }

    pub fn to_public_key(&self, rfq: &Rfq, response: &Response) -> Pubkey {
        match self {
            AuthoritySide::Taker => rfq.taker,
            AuthoritySide::Maker => response.maker,
        }
    }

    pub fn validate_is_associated_token_account(
        &self,
        rfq: &Rfq,
        response: &Response,
        mint: Pubkey,
        token_account: Pubkey,
    ) -> Result<()> {
        let receiver = self.to_public_key(rfq, response);
        require!(
            get_associated_token_address(&receiver, &mint) == token_account.key(),
            ProtocolError::WrongQuoteReceiver
        );

        Ok(())
    }
}