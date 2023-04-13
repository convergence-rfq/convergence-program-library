use std::iter;

use anchor_lang::prelude::*;
use anchor_spl::token::{transfer, Token, TokenAccount, Transfer};

use crate::{
    errors::ProtocolError,
    interfaces::instrument::validate_leg_instrument_data,
    seeds::COLLATERAL_SEED,
    state::{
        rfq::SettlementTypeMetadata, AuthoritySide, BaseAssetInfo, CollateralInfo, Leg,
        ProtocolState, Response, Rfq, StoredResponseState,
    },
};

pub fn unlock_response_collateral(
    rfq: &mut Rfq,
    response: &mut Response,
    taker_collateral_info: &mut CollateralInfo,
    maker_collateral_info: &mut CollateralInfo,
) {
    let taker_collateral = response.taker_collateral_locked;
    if taker_collateral > 0 {
        taker_collateral_info.unlock_collateral(taker_collateral);
        response.taker_collateral_locked = 0;
        rfq.total_taker_collateral_locked -= taker_collateral;
    }

    let maker_collateral = response.maker_collateral_locked;
    if maker_collateral > 0 {
        maker_collateral_info.unlock_collateral(maker_collateral);
        response.maker_collateral_locked = 0;
    }
}

pub fn transfer_collateral_token<'info>(
    amount: u64,
    from: &Account<'info, TokenAccount>,
    to: &Account<'info, TokenAccount>,
    authority: &Account<'info, CollateralInfo>,
    token_program: &Program<'info, Token>,
) -> Result<()> {
    let transfer_accounts = Transfer {
        from: from.to_account_info(),
        to: to.to_account_info(),
        authority: authority.to_account_info(),
    };
    let bump_seed = [authority.bump];
    let transfer_seed = &[&[
        COLLATERAL_SEED.as_bytes(),
        authority.user.as_ref(),
        &bump_seed,
    ][..]];
    let transfer_ctx = CpiContext::new_with_signer(
        token_program.to_account_info(),
        transfer_accounts,
        transfer_seed,
    );
    transfer(transfer_ctx, amount)?;

    Ok(())
}

pub fn update_state_after_escrow_preparation(
    side: AuthoritySide,
    legs_prepared: u8,
    rfq: &mut Rfq,
    response: &mut Response,
) {
    let state_legs_prepared = response.get_prepared_legs_mut(side);
    *state_legs_prepared += legs_prepared;

    let state_legs_prepared = response.get_prepared_legs(side);
    if state_legs_prepared > response.escrow_leg_preparations_initialized_by.len() as u8 {
        let additional_entries =
            state_legs_prepared - response.escrow_leg_preparations_initialized_by.len() as u8;
        let items = iter::repeat(side).take(additional_entries as usize);
        response
            .escrow_leg_preparations_initialized_by
            .extend(items);
    }

    if response.is_prepared(AuthoritySide::Taker, rfq)
        && response.is_prepared(AuthoritySide::Maker, rfq)
    {
        response.state = StoredResponseState::ReadyForSettling;
    }
}

pub fn validate_legs<'a, 'info: 'a>(
    legs: &[Leg],
    protocol: &Account<'info, ProtocolState>,
    remaining_accounts: &mut impl Iterator<Item = &'a AccountInfo<'info>>,
    is_settled_as_print_trade: bool,
) -> Result<()> {
    validate_legs_base_asset(legs, remaining_accounts)?;
    validate_legs_settlement_type(legs, is_settled_as_print_trade)?;

    if !is_settled_as_print_trade {
        validate_instrument_legs(legs, protocol, remaining_accounts)?;
    }

    Ok(())
}

fn validate_legs_base_asset<'a, 'info: 'a>(
    legs: &[Leg],
    remaining_accounts: &mut impl Iterator<Item = &'a AccountInfo<'info>>,
) -> Result<()> {
    for leg in legs.iter() {
        let base_asset_account = remaining_accounts
            .next()
            .ok_or_else(|| error!(ProtocolError::NotEnoughAccounts))?;
        let base_asset = Account::<BaseAssetInfo>::try_from(base_asset_account)?;
        require!(
            leg.base_asset_index == base_asset.index,
            ProtocolError::BaseAssetIsDisabled
        );
        require!(base_asset.enabled, ProtocolError::BaseAssetIsDisabled);
    }

    Ok(())
}

fn validate_legs_settlement_type(legs: &[Leg], is_settled_as_print_trade: bool) -> Result<()> {
    for leg in legs.iter() {
        validate_settlement_type_metadata(
            &leg.settlement_type_metadata,
            is_settled_as_print_trade,
        )?;
    }

    Ok(())
}

pub fn validate_settlement_type_metadata(
    value: &SettlementTypeMetadata,
    is_settled_as_print_trade: bool,
) -> Result<()> {
    if is_settled_as_print_trade {
        require!(
            matches!(
                value,
                SettlementTypeMetadata::PrintTrade { instrument_type: _ }
            ),
            ProtocolError::SettlementInfoDoesNotMatchRfqType
        );
    } else {
        require!(
            matches!(
                value,
                SettlementTypeMetadata::Instrument {
                    instrument_index: _
                }
            ),
            ProtocolError::SettlementInfoDoesNotMatchRfqType
        );
    };

    Ok(())
}

fn validate_instrument_legs<'a, 'info: 'a>(
    legs: &[Leg],
    protocol: &Account<'info, ProtocolState>,
    remaining_accounts: &mut impl Iterator<Item = &'a AccountInfo<'info>>,
) -> Result<()> {
    for leg in legs.iter() {
        let instrument_index = leg.settlement_type_metadata.get_instrument_index().unwrap();
        let instrument = protocol.get_instrument_parameters(instrument_index)?;
        require!(instrument.enabled, ProtocolError::InstrumentIsDisabled);
    }

    for leg in legs.iter() {
        validate_leg_instrument_data(leg, protocol, remaining_accounts)?;
    }

    Ok(())
}
