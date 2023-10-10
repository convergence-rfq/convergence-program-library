use std::convert::TryInto;

use anchor_lang::prelude::*;
use anchor_spl::associated_token::get_associated_token_address;

use crate::errors::ProtocolError;

use super::rfq::{FixedSize, Rfq};

#[account]
pub struct Response {
    pub maker: Pubkey,
    pub rfq: Pubkey,

    pub creation_timestamp: i64,
    pub state: StoredResponseState,

    pub confirmed: Option<Confirmation>,
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
        let state = match self.state {
            StoredResponseState::Active => {
                if !active_window_ended {
                    ResponseState::Active
                } else {
                    ResponseState::Expired
                }
            }
            StoredResponseState::Confirmed => {
                if !active_window_ended {
                    ResponseState::Confirmed
                } else {
                    ResponseState::ConfirmedExpired
                }
            }
            StoredResponseState::Canceled => ResponseState::Canceled,
            StoredResponseState::Settled => ResponseState::Settled,
        };
        Ok(state)
    }

    pub fn get_leg_amount_to_transfer(&self, rfq: &Rfq) -> u64 {
        self.calculate_confirmed_leg_amount(rfq)
    }

    pub fn calculate_confirmed_leg_amount(&self, rfq: &Rfq) -> u64 {
        let quote = self.get_confirmed_quote().unwrap();

        self.calculate_leg_amount_for_quote(rfq, quote)
    }

    pub fn calculate_leg_amount_for_quote(&self, rfq: &Rfq, quote: Quote) -> u64 {
        match quote {
            Quote::Standard {
                price_quote: _,
                leg_amount,
            } => leg_amount,
            Quote::FixedSize {
                price_quote:
                    PriceQuote::AbsolutePrice {
                        amount_bps: price_bps,
                    },
            } => match rfq.fixed_size {
                FixedSize::None { padding: _ } => unreachable!(),
                FixedSize::BaseAsset { leg_amount } => leg_amount,
                FixedSize::QuoteAsset { quote_amount } => {
                    let leg_amount = quote_amount as u128
                        * 10_u128.pow(rfq.leg_asset_decimals as u32)
                        * 10_u128.pow(PriceQuote::ABSOLUTE_PRICE_DECIMALS)
                        / price_bps;

                    leg_amount
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
        let leg_amount = match quote {
            Quote::Standard {
                price_quote: _,
                leg_amount,
            } => leg_amount,
            Quote::FixedSize {
                price_quote: PriceQuote::AbsolutePrice { amount_bps: _ },
            } => match rfq.fixed_size {
                FixedSize::BaseAsset { leg_amount } => leg_amount,
                FixedSize::None { padding: _ } => unreachable!(),
                FixedSize::QuoteAsset { quote_amount: _ } => unreachable!(),
            },
        };

        let price_bps = quote.get_price_bps();

        let result_with_more_decimals =
            leg_amount as u128 * price_bps / 10_u128.pow(PriceQuote::ABSOLUTE_PRICE_DECIMALS);

        let result = result_with_more_decimals / 10_u128.pow(rfq.leg_asset_decimals.into());

        result
            .try_into()
            .map_err(|_| error!(ProtocolError::AssetAmountOverflow))
            .unwrap()
    }

    pub fn get_leg_asset_receiver(&self) -> AuthoritySide {
        let confirmation = self.confirmed.unwrap();

        // leg assets receiver for a long leg and with the ask response from maker is a taker
        let mut receiver = AuthoritySide::Taker;

        if let QuoteSide::Bid = confirmation.side {
            receiver = receiver.inverse();
        }

        receiver
    }

    pub fn get_quote_asset_receiver(&self) -> AuthoritySide {
        let confirmation = self.confirmed.unwrap();

        // quote assets receiver for the ask response from maker is a maker
        let mut receiver = AuthoritySide::Maker;

        if let QuoteSide::Bid = confirmation.side {
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

                if let Some(override_leg_amount) = confirmation.override_leg_amount {
                    match &mut quote {
                        Quote::Standard {
                            price_quote: _,
                            leg_amount,
                        } => *leg_amount = override_leg_amount,
                        Quote::FixedSize { price_quote: _ } => unreachable!(),
                    }
                }

                Some(quote)
            }
            None => None,
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
    Confirmed,
    Settled,
}

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum ResponseState {
    Active,
    Canceled,
    Confirmed,
    Settled,
    Expired,
    ConfirmedExpired,
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
        leg_amount: u64,
    },
    FixedSize {
        price_quote: PriceQuote,
    },
}

impl Quote {
    pub fn get_price_bps(&self) -> u128 {
        match self {
            Quote::Standard {
                price_quote: PriceQuote::AbsolutePrice { amount_bps },
                leg_amount: _,
            } => *amount_bps,
            Quote::FixedSize {
                price_quote: PriceQuote::AbsolutePrice { amount_bps },
            } => *amount_bps,
        }
    }
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
    pub side: QuoteSide,
    pub override_leg_amount: Option<u64>,
}
