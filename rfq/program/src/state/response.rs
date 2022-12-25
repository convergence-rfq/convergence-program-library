use anchor_lang::prelude::*;
use anchor_spl::associated_token::get_associated_token_address;

use crate::errors::ProtocolError;

use super::{
    rfq::{FixedSize, Rfq, Side},
    AssetIdentifier,
};

#[account]
pub struct Response {
    pub maker: Pubkey,
    pub rfq: Pubkey,

    pub creation_timestamp: i64,
    pub maker_collateral_locked: u64,
    pub taker_collateral_locked: u64,
    pub state: StoredResponseState,
    pub taker_prepared_legs: u8,
    pub maker_prepared_legs: u8,
    pub settled_legs: u8,

    pub confirmed: Option<Confirmation>,
    pub defaulting_party: Option<DefaultingParty>,
    pub leg_preparations_initialized_by: Vec<AuthoritySide>,
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
                    if self.is_prepared(AuthoritySide::Taker, rfq) {
                        ResponseState::OnlyTakerPrepared
                    } else if self.is_prepared(AuthoritySide::Maker, rfq) {
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

    pub fn get_asset_amount_to_transfer(
        &self,
        rfq: &Rfq,
        asset_identifier: AssetIdentifier,
        side: AuthoritySide,
    ) -> i64 {
        match asset_identifier {
            AssetIdentifier::Leg { leg_index } => {
                self.get_leg_amount_to_transfer(rfq, leg_index, side)
            }
            AssetIdentifier::Quote => self.get_quote_amount_to_transfer(rfq, side),
        }
    }

    pub fn get_leg_amount_to_transfer(&self, rfq: &Rfq, leg_index: u8, side: AuthoritySide) -> i64 {
        let leg = &rfq.legs[leg_index as usize];
        let confirmation = self.confirmed.unwrap();
        let leg_multiplier_bps = self.calculate_confirmed_legs_multiplier_bps(rfq);

        let result = leg.instrument_amount as u128 * leg_multiplier_bps as u128
            / 10_u128.pow(Quote::LEG_MULTIPLIER_DECIMALS);
        let mut result = result as i64;

        if let Side::Ask = leg.side {
            result = -result;
        }
        if let AuthoritySide::Taker = side {
            result = -result;
        }
        if let Side::Bid = confirmation.side {
            result = -result;
        }

        result
    }

    pub fn calculate_confirmed_legs_multiplier_bps(&self, rfq: &Rfq) -> u64 {
        let quote = self.get_confirmed_quote().unwrap();

        self.calculate_legs_multiplier_bps_for_quote(rfq, quote)
    }

    pub fn calculate_legs_multiplier_bps_for_quote(&self, rfq: &Rfq, quote: Quote) -> u64 {
        match quote {
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
        }
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

    pub fn get_assets_receiver(
        &self,
        rfq: &Rfq,
        asset_identifier: AssetIdentifier,
    ) -> AuthoritySide {
        match asset_identifier {
            AssetIdentifier::Leg { leg_index } => self.get_leg_assets_receiver(rfq, leg_index),
            AssetIdentifier::Quote => self.get_quote_tokens_receiver(rfq),
        }
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

    pub fn default_by_time(&mut self, rfq: &Rfq) {
        self.state = StoredResponseState::Defaulted;
        let defaulting_party = match (
            self.is_prepared(AuthoritySide::Taker, rfq),
            self.is_prepared(AuthoritySide::Maker, rfq),
        ) {
            (false, false) => DefaultingParty::Both,
            (true, false) => DefaultingParty::Maker,
            (false, true) => DefaultingParty::Taker,
            _ => unreachable!(),
        };
        self.defaulting_party = Some(defaulting_party);
    }

    pub fn is_prepared(&self, side: AuthoritySide, rfq: &Rfq) -> bool {
        self.get_prepared_legs(side) as usize == rfq.legs.len()
    }

    pub fn get_prepared_legs(&self, side: AuthoritySide) -> u8 {
        match side {
            AuthoritySide::Taker => self.taker_prepared_legs,
            AuthoritySide::Maker => self.maker_prepared_legs,
        }
    }

    pub fn get_prepared_legs_mut(&mut self, side: AuthoritySide) -> &mut u8 {
        match side {
            AuthoritySide::Taker => &mut self.taker_prepared_legs,
            AuthoritySide::Maker => &mut self.maker_prepared_legs,
        }
    }

    pub fn have_locked_collateral(&self) -> bool {
        self.taker_collateral_locked > 0 || self.maker_collateral_locked > 0
    }

    pub fn get_preparation_initialized_by(
        &self,
        asset_identifier: AssetIdentifier,
    ) -> Option<AuthoritySide> {
        match asset_identifier {
            AssetIdentifier::Leg { leg_index } => self
                .leg_preparations_initialized_by
                .get(leg_index as usize)
                .cloned(),
            AssetIdentifier::Quote => self.leg_preparations_initialized_by.get(0).cloned(),
        }
    }
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
pub enum DefaultingParty {
    Taker,
    Maker,
    Both,
}

#[derive(AnchorSerialize, AnchorDeserialize, Copy, Clone, PartialEq, Eq)]
pub enum AuthoritySide {
    Taker,
    Maker,
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
    pub const LEG_MULTIPLIER_DECIMALS: u32 = 9;
}

#[derive(AnchorSerialize, AnchorDeserialize, Copy, Clone)]
pub enum PriceQuote {
    AbsolutePrice { amount_bps: u128 },
}

impl PriceQuote {
    const ABSOLUTE_PRICE_DECIMALS: u32 = 9;
}

#[derive(AnchorSerialize, AnchorDeserialize, Copy, Clone)]
pub struct Confirmation {
    pub side: Side,
    pub override_leg_multiplier_bps: Option<u64>,
}
