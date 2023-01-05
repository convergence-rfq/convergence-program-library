use anchor_lang::prelude::*;
use anchor_lang::Id;
use std::str::FromStr;

use anchor_lang::solana_program;
use anchor_lang::solana_program::instruction::Instruction;
use anchor_lang::InstructionData;
use dex_cpi;
use errors::HxroError;
use rfq::state::{ProtocolState, Response, Rfq};
use risk_cpi;
use state::AuthoritySideDuplicate;

use crate::state::ParsedLegData;
use rfq::state::{AuthoritySide, Side};

mod errors;
mod helpers;
mod state;

declare_id!("fZ8jq8MYbf2a2Eu3rYFcFKmnxqvo8X9g5E8otAx48ZE");

const MAX_PRODUCTS_PER_TRADE: usize = 6;

const OPERATOR_CREATOR_FEE_PROPORTION: dex_cpi::typedefs::Fractional =
    dex_cpi::typedefs::Fractional { m: 0, exp: 0 };
const OPERATOR_COUNTERPARTY_FEE_PROPORTION: dex_cpi::typedefs::Fractional =
    dex_cpi::typedefs::Fractional { m: 0, exp: 0 };

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

    pub fn validate_data(ctx: Context<ValidateData>) -> Result<()> {
        require!(ctx.accounts.rfq.legs.len() <= 6, HxroError::TooManyLegs);

        for leg in ctx.accounts.rfq.legs.clone() {
            helpers::validate_leg_data(&ctx, &leg.instrument_data)?;
        }

        helpers::validate_quote_data(&ctx, &ctx.accounts.rfq.quote_asset.instrument_data)?;

        Ok(())
    }

    pub fn create_print_trade(
        ctx: Context<CreatePrintTrade>,
        authority_side: AuthoritySideDuplicate,
    ) -> Result<()> {
        helpers::create_print_trade(&ctx, authority_side)
    }

    pub fn settle_print_trade<'a, 'info: 'a>(
        ctx: Context<'_, '_, '_, 'info, SettlePrintTrade<'info>>,
    ) -> Result<()> {
        msg!("HERE");
        let accounts_infos = [
            ctx.accounts.user.to_account_info().clone(),
            ctx.remaining_accounts[0].clone(),
            ctx.accounts.market_product_group.to_account_info().clone(),
            ctx.accounts.system_clock.to_account_info().clone(),
            ctx.remaining_accounts[1].clone(),
        ];

        let data = [50, 73, 243, 45, 10, 6, 220, 129].to_vec();

        solana_program::program::invoke(
            &Instruction {
                program_id: ctx.accounts.risk_engine_program.key(),
                accounts: vec![
                    AccountMeta::new(ctx.accounts.user.key(), true),
                    AccountMeta::new(ctx.remaining_accounts[0].key(), false),
                    AccountMeta::new_readonly(ctx.accounts.market_product_group.key(), false),
                    AccountMeta::new_readonly(ctx.accounts.system_clock.key(), false),
                    AccountMeta::new_readonly(ctx.remaining_accounts[1].key(), false),
                ],
                data,
            },
            &accounts_infos,
        )
        .unwrap();

        drop(accounts_infos);

        let accounts_infos2 = [
            ctx.accounts.user.to_account_info().clone(),
            ctx.accounts.creator.to_account_info().clone(),
            ctx.accounts.counterparty.to_account_info().clone(),
            ctx.accounts.operator.to_account_info().clone(),
            ctx.accounts.market_product_group.to_account_info().clone(),
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
            ctx.accounts.system_clock.to_account_info().clone(),
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
            ctx.accounts.protocol.to_account_info().clone(),
            ctx.accounts.s_account.to_account_info().clone(),
            ctx.accounts.r_account.to_account_info().clone(),
        ];

        let response = &ctx.accounts.response;
        let rfq = &ctx.accounts.rfq;

        let authority_side = match response.print_trade_prepared_by.unwrap() {
            AuthoritySide::Taker => AuthoritySide::Taker,
            AuthoritySide::Maker => AuthoritySide::Maker,
        };

        // HXRO typed side
        // print trade signer takes the other side
        let side = match response.confirmed.unwrap().side {
            Side::Bid => dex_cpi::typedefs::Side::Ask,
            Side::Ask => dex_cpi::typedefs::Side::Bid,
        };

        // create vec of PrintTradeProductIndex
        let product_vec: Vec<dex_cpi::typedefs::PrintTradeProductIndex> = rfq
            .legs
            .iter()
            .enumerate()
            .map(|(i, leg)| {
                let leg_data: ParsedLegData =
                    AnchorDeserialize::try_from_slice(&leg.instrument_data).unwrap();

                dex_cpi::typedefs::PrintTradeProductIndex {
                    product_index: leg_data.product_index as u64,
                    size: dex_cpi::typedefs::Fractional {
                        m: response.get_leg_amount_to_transfer(&rfq, i as u8, authority_side),
                        exp: leg.instrument_decimals as u64,
                    },
                }
            })
            .collect();

        // we need to pass an array with fixed size to HXRO
        let mut products =
            [dex_cpi::typedefs::PrintTradeProductIndex::default(); MAX_PRODUCTS_PER_TRADE];
        for i in 0..product_vec.len() {
            products[i] = product_vec[i];
        }

        let abs_price = response.get_quote_amount_to_transfer(&rfq, authority_side);
        let price = dex_cpi::typedefs::Fractional {
            m: abs_price,
            exp: 1,
        };

        let cpi_params = dex_cpi::typedefs::SignPrintTradeParams {
            num_products: rfq.legs.len() as u64,
            products,
            price,
            side,
            operator_creator_fee_proportion: OPERATOR_CREATOR_FEE_PROPORTION,
            operator_counterparty_fee_proportion: OPERATOR_COUNTERPARTY_FEE_PROPORTION,
        };
        msg!("HERE1");


        solana_program::program::invoke(
            &Instruction {
                program_id: ctx.accounts.dex.key(),
                accounts: vec![
                    AccountMeta::new(ctx.accounts.user.key(), true),
                    AccountMeta::new(ctx.accounts.creator.key(), false),
                    AccountMeta::new(ctx.accounts.counterparty.key(), false),
                    AccountMeta::new(ctx.accounts.operator.key(), false),
                    AccountMeta::new(ctx.accounts.market_product_group.key(), false),
                    AccountMeta::new(ctx.accounts.print_trade.key(), false),
                    AccountMeta::new_readonly(ctx.accounts.system_program.key(), false),
                    AccountMeta::new_readonly(ctx.accounts.fee_model_program.key(), false),
                    AccountMeta::new_readonly(
                        ctx.accounts.fee_model_configuration_acct.key(),
                        false,
                    ),
                    AccountMeta::new(ctx.accounts.fee_output_register.key(), false),
                    AccountMeta::new_readonly(ctx.accounts.risk_engine_program.key(), false),
                    AccountMeta::new_readonly(
                        ctx.accounts.risk_model_configuration_acct.key(),
                        false,
                    ),
                    AccountMeta::new(ctx.accounts.risk_output_register.key(), false),
                    AccountMeta::new_readonly(ctx.accounts.risk_and_fee_signer.key(), false),
                    AccountMeta::new_readonly(ctx.accounts.system_clock.key(), false),
                    AccountMeta::new(ctx.accounts.creator_trader_fee_state_acct.key(), false),
                    AccountMeta::new(ctx.accounts.creator_trader_risk_state_acct.key(), false),
                    AccountMeta::new(ctx.accounts.counterparty_trader_fee_state_acct.key(), false),
                    AccountMeta::new(
                        ctx.accounts.counterparty_trader_risk_state_acct.key(),
                        false,
                    ),
                    AccountMeta::new_readonly(ctx.accounts.protocol.key(), true),
                    AccountMeta::new(ctx.accounts.s_account.key(), false),
                    AccountMeta::new(ctx.accounts.r_account.key(), false),
                ],
                data: dex_cpi::instruction::SignPrintTrade {
                    _params: cpi_params,
                }
                .data(),
            },
            &accounts_infos2,
        )
        .unwrap();

        Ok(())
    }

    pub fn clean_up(_ctx: Context<CleanUp>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
pub struct ValidateData<'info> {
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
pub struct CreatePrintTrade<'info> {
    pub protocol: Account<'info, ProtocolState>,
    pub rfq: Account<'info, Rfq>,
    pub response: Account<'info, Response>,

    /// CHECK:
    pub dex: Program<'info, Dex>,

    #[account(mut)]
    pub creator_owner: Signer<'info>,
    /// CHECK:
    pub operator_owner: AccountInfo<'info>,
    /// CHECK:
    pub creator: AccountInfo<'info>,
    /// CHECK:
    pub counterparty: AccountInfo<'info>,
    /// CHECK:
    pub operator: AccountInfo<'info>,

    /// CHECK:
    #[account(mut)]
    pub market_product_group: AccountInfo<'info>,

    /// CHECK:
    #[account(mut)]
    pub print_trade: AccountInfo<'info>,
    /// CHECK:
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SettlePrintTrade<'info> {
    pub protocol: Box<Account<'info, ProtocolState>>,
    pub rfq: Box<Account<'info, Rfq>>,
    pub response: Box<Account<'info, Response>>,

    /// CHECK:
    pub dex: Program<'info, Dex>,
    #[account(mut)]
    pub user: Signer<'info>,
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

    #[account(mut)]
    pub print_trade: Box<Account<'info, dex_cpi::state::PrintTrade>>,
    /// CHECK:
    pub system_program: Program<'info, System>,
    pub system_clock: Sysvar<'info, Clock>,

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
    pub r_account: Box<Account<'info, risk_cpi::state::CorrelationMatrix>>,
}

#[derive(Accounts)]
#[instruction(leg_index: u8)]
pub struct CleanUp<'info> {
    pub protocol: Box<Account<'info, ProtocolState>>,
    pub rfq: Box<Account<'info, Rfq>>,
    pub response: Box<Account<'info, Response>>,

    #[account(mut, close = receiver)]
    pub print_trade: Box<Account<'info, dex_cpi::state::PrintTrade>>,
    /// CHECK:
    #[account(mut)]
    pub receiver: AccountInfo<'info>,
}
