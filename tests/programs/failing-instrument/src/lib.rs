use crate::errors::Error;
use crate::state::AuthoritySideDuplicate;
use anchor_lang::prelude::*;
use rfq::states::{AuthoritySide, ProtocolState, Response, Rfq};

mod errors;
mod state;

declare_id!("RvMZtmG8TaUcqZRxYBx1XpNzgWEewAMsiZbPTNxcz22");

#[program]
pub mod failing_instrument {
    use super::*;

    pub fn validate_data(
        _ctx: Context<ValidateData>,
        data_size: u32,
        _taker_fails: bool,
    ) -> Result<()> {
        require!(data_size as usize == 1, Error::InvalidDataSize);

        Ok(())
    }

    pub fn prepare_to_settle(
        _ctx: Context<PrepareToSettle>,
        _leg_index: u8,
        _side: AuthoritySideDuplicate,
    ) -> Result<()> {
        Ok(())
    }

    pub fn settle(ctx: Context<Settle>, leg_index: u8) -> Result<Option<DefaultingParty>> {
        let rfq = &ctx.accounts.rfq;
        let leg_data = &rfq.legs[leg_index as usize].instrument_data;
        let will_taker_fail: bool = AnchorDeserialize::try_from_slice(leg_data)?;

        if will_taker_fail {
            Ok(Some(DefaultingParty::Taker))
        } else {
            Ok(Some(DefaultingParty::Maker))
        }
    }

    pub fn revert_preparation(
        _ctx: Context<RevertPreparation>,
        _leg_index: u8,
        _side: AuthoritySideDuplicate,
    ) -> Result<()> {
        Ok(())
    }

    pub fn clean_up(_ctx: Context<CleanUp>, _leg_index: u8) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct ValidateData<'info> {
    /// protocol provided
    #[account(signer)]
    pub protocol: Account<'info, ProtocolState>,
}

#[derive(Accounts)]
#[instruction(leg_index: u8, side: AuthoritySide)]
pub struct PrepareToSettle<'info> {
    /// protocol provided
    #[account(signer)]
    pub protocol: Account<'info, ProtocolState>,
    pub rfq: Box<Account<'info, Rfq>>,
    pub response: Account<'info, Response>,
}

#[derive(Accounts)]
#[instruction(leg_index: u8)]
pub struct Settle<'info> {
    /// protocol provided
    #[account(signer)]
    pub protocol: Account<'info, ProtocolState>,
    pub rfq: Account<'info, Rfq>,
    pub response: Account<'info, Response>,
}

#[derive(Accounts)]
#[instruction(leg_index: u8)]
pub struct RevertPreparation<'info> {
    /// protocol provided
    #[account(signer)]
    pub protocol: Account<'info, ProtocolState>,
    pub rfq: Account<'info, Rfq>,
    pub response: Account<'info, Response>,
}

#[derive(Accounts)]
#[instruction(leg_index: u8)]
pub struct CleanUp<'info> {
    /// protocol provided
    #[account(signer)]
    pub protocol: Account<'info, ProtocolState>,
    pub rfq: Account<'info, Rfq>,
    pub response: Account<'info, Response>,
}
