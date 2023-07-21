use std::convert::TryInto;

use anchor_lang::prelude::*;
use anchor_spl::associated_token::get_associated_token_address;

use crate::errors::ProtocolError;

use super::{
    rfq::{FixedSize, Rfq},
    AssetIdentifier, LegSide,
};

#[account]
pub struct Response {
    pub maker: Pubkey,
    pub rfq: Pubkey,

    pub creation_timestamp: i64,
    pub maker_collateral_locked: u64,
    pub taker_collateral_locked: u64,
    pub state: StoredResponseState,

    // counter is an amount of prepared legs for escrow settlement and 1 if prepared for print trade settlement
    pub taker_prepared_counter: u8,
    pub maker_prepared_counter: u8,

    pub settled_escrow_legs: u8,

    pub confirmed: Option<Confirmation>,
    pub defaulting_party: Option<DefaultingParty>,
    pub print_trade_initialized_by: Option<AuthoritySide>,
    pub escrow_leg_preparations_initialized_by: Vec<AuthoritySide>,
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
            StoredResponseState::SettlementExpired => ResponseState::SettlementExpired,
            StoredResponseState::Defaulted => ResponseState::Defaulted,
        };
        Ok(state)
    }

    pub fn get_asset_amount_to_transfer(
        &self,
        rfq: &Rfq,
        asset_identifier: AssetIdentifier,
    ) -> u64 {
        match asset_identifier {
            AssetIdentifier::Leg { leg_index } => self.get_leg_amount_to_transfer(rfq, leg_index),
            AssetIdentifier::Quote => self.get_quote_amount_to_transfer(rfq),
        }
    }

    pub fn get_leg_amount_to_transfer(&self, rfq: &Rfq, leg_index: u8) -> u64 {
        let leg = &rfq.legs[leg_index as usize];
        let leg_multiplier_bps = self.calculate_confirmed_legs_multiplier_bps(rfq);

        let result_with_more_decimals = leg.amount as u128 * leg_multiplier_bps as u128;

        let decimals_factor = Quote::LEG_MULTIPLIER_FACTOR;
        let mut result = result_with_more_decimals / decimals_factor;

        // if a maker receives assets, we round additinal decimals up
        // to prevent taker from leg multiplier manipulation attack by a taker
        let receiver = self.get_leg_assets_receiver(rfq, leg_index);
        if receiver == AuthoritySide::Maker && result_with_more_decimals % decimals_factor > 0 {
            result += 1;
        }

        result
            .try_into()
            .map_err(|_| error!(ProtocolError::AssetAmountOverflow))
            .unwrap()
    }

    pub fn calculate_confirmed_legs_multiplier_bps(&self, rfq: &Rfq) -> u64 {
        let quote = self.get_confirmed_quote().unwrap();

        self.calculate_legs_multiplier_bps_for_quote(rfq, quote)
    }

    pub fn calculate_legs_multiplier_bps_for_quote(&self, rfq: &Rfq, quote: Quote) -> u64 {
        match quote {
            Quote::Standard {
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
                    // only positive prices allowed for fixed quote asset rfqs
                    let price_bps = price_bps as u128;

                    // quote multiplied by leg decimals divided by the price
                    let leg_multiplier_bps = quote_amount as u128
                        * 10_u128.pow(Quote::LEG_MULTIPLIER_DECIMALS)
                        * 10_u128.pow(PriceQuote::ABSOLUTE_PRICE_DECIMALS)
                        / price_bps;

                    leg_multiplier_bps
                        .try_into()
                        .map_err(|_| error!(ProtocolError::AssetAmountOverflow))
                        .unwrap()
                }
            },
        }
    }

    pub fn get_quote_amount_to_transfer(&self, rfq: &Rfq) -> u64 {
        // if an rfq is with fixed quote amount, just return it
        if let FixedSize::QuoteAsset { quote_amount } = rfq.fixed_size {
            return quote_amount;
        }

        let quote = self.get_confirmed_quote().unwrap();
        let legs_multiplier_bps = match quote {
            Quote::Standard {
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

        let price_bps = quote.get_price_bps();
        let positive_price_bps = price_bps.unsigned_abs(); // negative price is handled in get_quote_tokens_receiver

        let result_with_more_decimals = legs_multiplier_bps as u128 * positive_price_bps
            / 10_u128.pow(PriceQuote::ABSOLUTE_PRICE_DECIMALS);

        let decimals_factor = Quote::LEG_MULTIPLIER_FACTOR;
        let mut result = result_with_more_decimals / decimals_factor;

        // if a maker receives a quote, we round additinal decimals up
        // to prevent taker from leg multiplier manipulation attack by a taker
        let receiver = self.get_quote_tokens_receiver();
        if receiver == AuthoritySide::Maker && result_with_more_decimals % decimals_factor > 0 {
            result += 1;
        }

        result
            .try_into()
            .map_err(|_| error!(ProtocolError::AssetAmountOverflow))
            .unwrap()
    }

    pub fn get_assets_receiver(
        &self,
        rfq: &Rfq,
        asset_identifier: AssetIdentifier,
    ) -> AuthoritySide {
        match asset_identifier {
            AssetIdentifier::Leg { leg_index } => self.get_leg_assets_receiver(rfq, leg_index),
            AssetIdentifier::Quote => self.get_quote_tokens_receiver(),
        }
    }

    pub fn get_leg_assets_receiver(&self, rfq: &Rfq, leg_index: u8) -> AuthoritySide {
        let leg = &rfq.legs[leg_index as usize];
        let confirmation = self.confirmed.unwrap();

        // leg assets receiver for a long leg and with the ask response from maker is a taker
        let mut receiver = AuthoritySide::Taker;

        if let LegSide::Short = leg.side {
            receiver = receiver.inverse();
        }
        if let QuoteSide::Bid = confirmation.side {
            receiver = receiver.inverse();
        }

        receiver
    }

    pub fn get_quote_tokens_receiver(&self) -> AuthoritySide {
        let confirmation = self.confirmed.unwrap();
        let quote = self.get_confirmed_quote().unwrap();
        let price_bps = quote.get_price_bps();

        // quote assets receiver for the ask response from maker is a maker
        let mut receiver = AuthoritySide::Maker;

        if let QuoteSide::Bid = confirmation.side {
            receiver = receiver.inverse();
        }

        if price_bps < 0 {
            receiver = receiver.inverse();
        }

        receiver
    }

    pub fn get_confirmed_quote(&self) -> Option<Quote> {
        match self.confirmed {
            Some(confirmation) => {
                let mut quote = match confirmation.side {
                    QuoteSide::Bid => self.bid,
                    QuoteSide::Ask => self.ask,
                }
                .unwrap();

                // apply overriden leg multiplier
                if let Some(override_leg_multiplier_bps) = confirmation.override_leg_multiplier_bps
                {
                    match &mut quote {
                        Quote::Standard {
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
        if rfq.is_settled_as_print_trade() {
            self.get_prepared_counter(side) as usize == 1
        } else {
            self.get_prepared_counter(side) as usize == rfq.legs.len()
        }
    }

    pub fn get_prepared_counter(&self, side: AuthoritySide) -> u8 {
        match side {
            AuthoritySide::Taker => self.taker_prepared_counter,
            AuthoritySide::Maker => self.maker_prepared_counter,
        }
    }

    pub fn get_prepared_counter_mut(&mut self, side: AuthoritySide) -> &mut u8 {
        match side {
            AuthoritySide::Taker => &mut self.taker_prepared_counter,
            AuthoritySide::Maker => &mut self.maker_prepared_counter,
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
                .escrow_leg_preparations_initialized_by
                .get(leg_index as usize)
                .cloned(),
            AssetIdentifier::Quote => self.escrow_leg_preparations_initialized_by.get(0).cloned(),
        }
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Copy, Clone, PartialEq, Eq)]
pub enum QuoteSide {
    Bid,
    Ask,
}

#[derive(AnchorSerialize, AnchorDeserialize, Copy, Clone, PartialEq, Eq)]
pub enum StoredResponseState {
    Active,
    Canceled,
    WaitingForLastLook,
    SettlingPreparations,
    ReadyForSettling,
    Settled,
    SettlementExpired,
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
    SettlementExpired,
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

#[derive(AnchorSerialize, AnchorDeserialize, Copy, Clone, PartialEq, Eq)]
pub enum QuoteSide {
    Bid,
    Ask,
}

impl AuthoritySide {
    pub fn inverse(self) -> Self {
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
    Standard {
        price_quote: PriceQuote,
        legs_multiplier_bps: u64,
    },
    FixedSize {
        price_quote: PriceQuote,
    },
}

impl Quote {
    pub const LEG_MULTIPLIER_DECIMALS: u32 = 9;
    pub const LEG_MULTIPLIER_FACTOR: u128 = 10_u128.pow(Quote::LEG_MULTIPLIER_DECIMALS);

    pub fn get_price_bps(&self) -> i128 {
        match self {
            Quote::Standard {
                price_quote: PriceQuote::AbsolutePrice { amount_bps },
                legs_multiplier_bps: _,
            } => *amount_bps,
            Quote::FixedSize {
                price_quote: PriceQuote::AbsolutePrice { amount_bps },
            } => *amount_bps,
        }
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Copy, Clone)]
pub enum PriceQuote {
    AbsolutePrice { amount_bps: i128 }, // this value have ABSOLUTE_PRICE_DECIMALS + quote asset mint decimals
}

impl PriceQuote {
    pub const ABSOLUTE_PRICE_DECIMALS: u32 = 9;
}

#[derive(AnchorSerialize, AnchorDeserialize, Copy, Clone)]
pub struct Confirmation {
    pub side: QuoteSide,
    pub override_leg_multiplier_bps: Option<u64>,
}
