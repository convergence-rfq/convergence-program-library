use crate::state::AuthoritySideDuplicate;
use anchor_lang::prelude::*;
use anchor_lang::solana_program;
use anchor_lang::solana_program::instruction::Instruction;
use anchor_lang::InstructionData;
use anchor_spl::token::{
    transfer, Mint, Token, TokenAccount, Transfer,
};
use rfq::states::{AuthoritySide, ProtocolState, Response, Rfq};

use dex_cpi as dex;
use errors::HxroError;
use params::SettleParams;

mod custom_data_types;
mod errors;
mod params;
mod state;

declare_id!("5Vhsk4PT6MDMrGSsQoQGEHfakkntEYydRYTs14T1PooL");

const ESCROW_SEED: &str = "escrow";

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

    pub fn prepare_to_settle(
        ctx: Context<PrepareToSettle>,
        leg_index: u8,
        side: AuthoritySideDuplicate,
    ) -> Result<()> {
        let PrepareToSettle {
            caller,
            caller_tokens,
            rfq,
            response,
            mint,
            escrow,
            token_program,
            ..
        } = &ctx.accounts;

        let token_amount = response.get_leg_amount_to_transfer(rfq, leg_index, side.into());

        if token_amount > 0 {
            let transfer_accounts = Transfer {
                from: caller_tokens.to_account_info(),
                to: escrow.to_account_info(),
                authority: caller.to_account_info(),
            };
            let transfer_ctx = CpiContext::new(token_program.to_account_info(), transfer_accounts);
            transfer(transfer_ctx, token_amount as u64)?;
        }

        Ok(())
    }

    pub fn settle(ctx: Context<Settle>, data: SettleParams) -> Result<()> {
        call_initialize_print_trade(&ctx, &data)?;
        call_sign_print_trade(&ctx, &data)?;

        msg!("Sent!");

        Ok(())
    }

    pub fn revert_preparation(
        ctx: Context<RevertPreparation>,
        leg_index: u8,
        side: AuthoritySideDuplicate,
    ) -> Result<()> {
        let RevertPreparation {
            rfq,
            response,
            escrow,
            tokens,
            token_program,
            ..
        } = &ctx.accounts;

        let side: AuthoritySide = side.into();
        side.validate_is_associated_token_account(rfq, response, escrow.mint, tokens.key())?;

        if side == response.get_leg_assets_receiver(rfq, leg_index).revert() {
            transfer_from_an_escrow(
                escrow,
                tokens,
                response.key(),
                leg_index,
                *ctx.bumps.get("escrow").unwrap(),
                token_program,
            )?;
        }

        Ok(())
    }
    pub fn clean_up(_ctx: Context<CleanUp>) -> Result<()> {
        Ok(())
    }
}

fn call_initialize_print_trade(ctx: &Context<Settle>, data: &SettleParams) -> Result<()> {
    let cpi_accounts = dex_cpi::cpi::accounts::InitializePrintTrade {
        user: ctx.accounts.creator_owner.to_account_info(),
        creator: ctx.accounts.creator.to_account_info(),
        counterparty: ctx.accounts.counterparty.to_account_info(),
        operator: ctx.accounts.operator.to_account_info(),
        market_product_group: ctx.accounts.market_product_group.to_account_info(),
        product: ctx.accounts.product.to_account_info(),
        print_trade: ctx.accounts.print_trade.to_account_info(),
        system_program: ctx.accounts.system_program.to_account_info(),
    };

    let cpi_params = dex_cpi::typedefs::InitializePrintTradeParams {
        product_index: data.product_index,
        size: data.size.to_dex_fractional(),
        price: data.price.to_dex_fractional(),
        side: data.creator_side.to_dex_side(),
        operator_creator_fee_proportion: data.operator_creator_fee_proportion.to_dex_fractional(),
        operator_counterparty_fee_proportion: data
            .operator_counterparty_fee_proportion
            .to_dex_fractional(),
    };

    dex::cpi::initialize_print_trade(
        CpiContext::new(ctx.accounts.dex.to_account_info(), cpi_accounts),
        cpi_params,
    )
}

fn call_sign_print_trade(ctx: &Context<Settle>, data: &SettleParams) -> Result<()> {
    let cpi_params = dex_cpi::typedefs::SignPrintTradeParams {
        product_index: data.product_index,
        size: data.size.to_dex_fractional(),
        price: data.price.to_dex_fractional(),
        side: data.counterparty_side.to_dex_side(),
        operator_creator_fee_proportion: data.operator_creator_fee_proportion.to_dex_fractional(),
        operator_counterparty_fee_proportion: data
            .operator_counterparty_fee_proportion
            .to_dex_fractional(),
    };

    let accounts_infos = &[
        ctx.accounts.counterparty_owner.to_account_info().clone(),
        ctx.accounts.creator.to_account_info().clone(),
        ctx.accounts.counterparty.to_account_info().clone(),
        ctx.accounts.operator.to_account_info().clone(),
        ctx.accounts.market_product_group.to_account_info().clone(),
        ctx.accounts.product.to_account_info().clone(),
        ctx.accounts.print_trade.to_account_info().clone(),
        ctx.accounts.system_program.to_account_info().clone(),
        ctx.accounts.fee_model_program.to_account_info().clone(),
        ctx.accounts
            .fee_model_configuration_acct
            .to_account_info()
            .clone(),
        ctx.accounts.fee_output_register.to_account_info().clone(),
        ctx.accounts.risk_engine_program.to_account_info().clone(),
        ctx.accounts
            .risk_model_configuration_acct
            .to_account_info()
            .clone(),
        ctx.accounts.risk_output_register.to_account_info().clone(),
        ctx.accounts.risk_and_fee_signer.to_account_info().clone(),
        ctx.accounts
            .creator_trader_fee_state_acct
            .to_account_info()
            .clone(),
        ctx.accounts
            .creator_trader_risk_state_acct
            .to_account_info()
            .clone(),
        ctx.accounts
            .counterparty_trader_fee_state_acct
            .to_account_info()
            .clone(),
        ctx.accounts
            .counterparty_trader_risk_state_acct
            .to_account_info()
            .clone(),
        ctx.accounts
            .counterparty_trader_risk_state_acct
            .to_account_info()
            .clone(),
        ctx.accounts.s_account.to_account_info().clone(),
        ctx.accounts.r_account.to_account_info().clone(),
    ];

    solana_program::program::invoke(
        &Instruction {
            program_id: ctx.accounts.dex.key(),
            accounts: vec![
                AccountMeta::new(ctx.accounts.counterparty_owner.key(), true),
                AccountMeta::new(ctx.accounts.creator.key(), false),
                AccountMeta::new(ctx.accounts.counterparty.key(), false),
                AccountMeta::new(ctx.accounts.operator.key(), false),
                AccountMeta::new(ctx.accounts.market_product_group.key(), false),
                AccountMeta::new(ctx.accounts.product.key(), false),
                AccountMeta::new(ctx.accounts.print_trade.key(), false),
                AccountMeta::new_readonly(ctx.accounts.system_program.key(), false),
                AccountMeta::new_readonly(ctx.accounts.fee_model_program.key(), false),
                AccountMeta::new_readonly(ctx.accounts.fee_model_configuration_acct.key(), false),
                AccountMeta::new(ctx.accounts.fee_output_register.key(), false),
                AccountMeta::new_readonly(ctx.accounts.risk_engine_program.key(), false),
                AccountMeta::new_readonly(ctx.accounts.risk_model_configuration_acct.key(), false),
                AccountMeta::new(ctx.accounts.risk_output_register.key(), false),
                AccountMeta::new_readonly(ctx.accounts.risk_and_fee_signer.key(), false),
                AccountMeta::new(ctx.accounts.creator_trader_fee_state_acct.key(), false),
                AccountMeta::new(ctx.accounts.creator_trader_risk_state_acct.key(), false),
                AccountMeta::new(ctx.accounts.counterparty_trader_fee_state_acct.key(), false),
                AccountMeta::new(
                    ctx.accounts.counterparty_trader_risk_state_acct.key(),
                    false,
                ),
                AccountMeta::new(
                    ctx.accounts.counterparty_trader_risk_state_acct.key(),
                    false,
                ),
                AccountMeta::new(ctx.accounts.s_account.key(), false),
                AccountMeta::new(ctx.accounts.r_account.key(), false),
            ],
            data: dex_cpi::instruction::SignPrintTrade {
                _params: cpi_params,
            }
            .data(),
        },
        accounts_infos,
    )
    .unwrap();

    Ok(())
}

fn transfer_from_an_escrow<'info>(
    escrow: &Account<'info, TokenAccount>,
    receiver: &Account<'info, TokenAccount>,
    response: Pubkey,
    leg_index: u8,
    bump: u8,
    token_program: &Program<'info, Token>,
) -> Result<()> {
    let amount = escrow.amount;
    let transfer_accounts = Transfer {
        from: escrow.to_account_info(),
        to: receiver.to_account_info(),
        authority: escrow.to_account_info(),
    };
    let response_key = response.key();
    let leg_index_seed = [leg_index];
    let bump_seed = [bump];
    let escrow_seed = &[&[
        ESCROW_SEED.as_bytes(),
        response_key.as_ref(),
        &leg_index_seed,
        &bump_seed,
    ][..]];
    let transfer_ctx = CpiContext::new_with_signer(
        token_program.to_account_info(),
        transfer_accounts,
        escrow_seed,
    );
    transfer(transfer_ctx, amount)?;

    Ok(())
}

#[derive(Accounts)]
pub struct ValidateData<'info> {
    /// protocol provided
    #[account(signer)]
    pub protocol: Account<'info, ProtocolState>,

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
#[instruction(leg_index: u8, side: AuthoritySide)]
pub struct PrepareToSettle<'info> {
    /// protocol provided
    #[account(signer)]
    pub protocol: Account<'info, ProtocolState>,
    pub rfq: Box<Account<'info, Rfq>>,
    pub response: Account<'info, Response>,

    /// user provided
    #[account(mut)]
    pub caller: Signer<'info>,
    #[account(mut, constraint = caller_tokens.mint == mint.key() @ HxroError::PassedMintDoesNotMatch)]
    pub caller_tokens: Account<'info, TokenAccount>,

    pub mint: Account<'info, Mint>,

    #[account(init_if_needed, payer = caller, token::mint = mint, token::authority = escrow,
    seeds = [ESCROW_SEED.as_bytes(), response.key().as_ref(), &[leg_index]], bump)]
    pub escrow: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct Settle<'info> {
    /// CHECK:
    pub dex: AccountInfo<'info>,

    #[account(mut)]
    pub creator_owner: Signer<'info>,
    #[account(mut)]
    pub counterparty_owner: Signer<'info>,
    /// CHECK:
    #[account(mut)]
    pub creator: AccountInfo<'info>,
    /// CHECK:
    #[account(mut)]
    pub counterparty: AccountInfo<'info>,
    /// CHECK:
    #[account(mut)]
    pub operator: AccountInfo<'info>,

    /// CHECK:
    #[account(mut)]
    pub market_product_group: AccountInfo<'info>,
    /// CHECK:
    #[account(mut)]
    pub product: AccountInfo<'info>,

    /// CHECK:
    #[account(mut)]
    pub print_trade: AccountInfo<'info>,
    /// CHECK:
    pub system_program: Program<'info, System>,

    /// CHECK:
    pub fee_model_program: AccountInfo<'info>,
    /// CHECK:
    pub fee_model_configuration_acct: AccountInfo<'info>,
    /// CHECK:
    #[account(mut)]
    pub fee_output_register: AccountInfo<'info>,
    /// CHECK:
    #[account(executable)]
    pub risk_engine_program: AccountInfo<'info>,
    /// CHECK:
    pub risk_model_configuration_acct: AccountInfo<'info>,
    /// CHECK:
    #[account(mut)]
    pub risk_output_register: AccountInfo<'info>,
    /// CHECK:
    pub risk_and_fee_signer: AccountInfo<'info>,
    /// CHECK:
    #[account(mut)]
    pub creator_trader_fee_state_acct: AccountInfo<'info>,
    /// CHECK:
    #[account(mut)]
    pub creator_trader_risk_state_acct: AccountInfo<'info>,
    /// CHECK:
    #[account(mut)]
    pub counterparty_trader_fee_state_acct: AccountInfo<'info>,
    /// CHECK:
    #[account(mut)]
    pub counterparty_trader_risk_state_acct: AccountInfo<'info>,

    /// CHECK:
    #[account(mut)]
    pub s_account: AccountInfo<'info>,
    /// CHECK:
    #[account(mut)]
    pub r_account: AccountInfo<'info>,
}

#[derive(Accounts)]
#[instruction(leg_index: u8)]
pub struct RevertPreparation<'info> {
    /// protocol provided
    #[account(signer)]
    pub protocol: Account<'info, ProtocolState>,
    pub rfq: Box<Account<'info, Rfq>>,
    pub response: Account<'info, Response>,

    /// user provided
    #[account(mut, seeds = [ESCROW_SEED.as_bytes(), response.key().as_ref(), &[leg_index]], bump)]
    pub escrow: Account<'info, TokenAccount>,
    #[account(mut, constraint = tokens.mint == escrow.mint @ HxroError::PassedMintDoesNotMatch)]
    pub tokens: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct CleanUp {}
