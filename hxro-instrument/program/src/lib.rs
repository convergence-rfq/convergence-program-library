use anchor_lang::prelude::*;
use anchor_lang::solana_program;
use anchor_lang::solana_program::instruction::Instruction;
use anchor_lang::Id;
use anchor_lang::InstructionData;
use anchor_spl::associated_token::get_associated_token_address;
use anchor_spl::token::{
    close_account, transfer, CloseAccount, Mint, Token, TokenAccount, Transfer,
};
use std::str::FromStr;

use dex_cpi as dex;
use errors::HxroError;
use rfq::state::{AuthoritySide, ProtocolState, Response, Rfq};
use risk_cpi as risk;
use state::AuthoritySideDuplicate;

mod errors;
mod state;

declare_id!("5Vhsk4PT6MDMrGSsQoQGEHfakkntEYydRYTs14T1PooL");

#[derive(Debug, Clone)]
pub struct Dex;

impl Id for Dex {
    fn id() -> Pubkey {
        Pubkey::from_str("FUfpR31LmcP1VSbz5zDaM7nxnH55iBHkpwusgrnhaFjL").unwrap()
    }
}

#[program]
pub mod hxro_instrument {
    use super::*;

    pub fn validate_data(
        ctx: Context<ValidateData>,
        data_size: u32,
        dex: Pubkey,
        fee_model_program: Pubkey,
        risk_engine_program: Pubkey,
        fee_model_configuration_acct: Pubkey,
        risk_model_configuration_acct: Pubkey,
        fee_output_register: Pubkey,
        risk_output_register: Pubkey,
        risk_and_fee_signer: Pubkey,
    ) -> Result<()> {
        let legs = &ctx.accounts.rfq.legs;
        let quote = &ctx.accounts.rfq.quote_asset;
        require!(
            data_size as usize == std::mem::size_of::<Pubkey>() * 8,
            HxroError::InvalidDataSize
        );

        require!(dex == ctx.accounts.dex.key(), HxroError::InvalidDex);
        require!(
            fee_model_program == ctx.accounts.fee_model_program.key(),
            HxroError::InvalidFeeModelProgram
        );
        require!(
            risk_engine_program == ctx.accounts.risk_engine_program.key(),
            HxroError::InvalidRiskEngineProgram
        );
        require!(
            fee_model_configuration_acct == ctx.accounts.fee_model_configuration_acct.key(),
            HxroError::InvalidFeeModelConfigurationAcct
        );
        require!(
            risk_model_configuration_acct == ctx.accounts.risk_model_configuration_acct.key(),
            HxroError::InvalidRiskModelConfigurationAcct
        );
        require!(
            fee_output_register == ctx.accounts.fee_output_register.key(),
            HxroError::InvalidFeeOutputRegister
        );
        require!(
            risk_output_register == ctx.accounts.risk_output_register.key(),
            HxroError::InvalidRiskOutputRegister
        );
        require!(
            risk_and_fee_signer == ctx.accounts.risk_and_fee_signer.key(),
            HxroError::InvalidRiskAndFeeSigner
        );
        Ok(())
    }

    pub fn create_print_trade(ctx: Context<CreatePrintTrade>) -> Result<()> {
        Ok(())
    }

    pub fn settle_print_trade(ctx: Context<SettlePrintTrade>) -> Result<()> {
        Ok(())
    }

    pub fn clean_up(ctx: Context<CleanUp>, leg_index: u8) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct ValidateData<'info> {
    /// protocol provided
    #[account(signer)]
    pub protocol: Account<'info, ProtocolState>,

    pub rfq: Account<'info, Rfq>,

    /// CHECK:
    pub dex: AccountInfo<'info>,
    /// CHECK:
    pub fee_model_program: AccountInfo<'info>,
    /// CHECK:
    pub risk_engine_program: AccountInfo<'info>,
    /// CHECK:
    pub fee_model_configuration_acct: AccountInfo<'info>,
    /// CHECK:
    pub risk_model_configuration_acct: AccountInfo<'info>,
    /// CHECK:
    pub fee_output_register: AccountInfo<'info>,
    /// CHECK:
    pub risk_output_register: AccountInfo<'info>,
    /// CHECK:
    pub risk_and_fee_signer: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct CreatePrintTrade {}

#[derive(Accounts)]
pub struct SettlePrintTrade {}

#[derive(Accounts)]
#[instruction(leg_index: u8)]
pub struct CleanUp {}
