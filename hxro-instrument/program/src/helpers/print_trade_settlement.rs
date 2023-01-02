use anchor_lang::prelude::*;
use anchor_lang::solana_program;
use anchor_lang::solana_program::instruction::Instruction;
use anchor_lang::InstructionData;

use rfq::state::{AuthoritySide, Side};

use crate::SettlePrintTrade;

use crate::{
    state::ParsedLegData, MAX_PRODUCTS_PER_TRADE, OPERATOR_COUNTERPARTY_FEE_PROPORTION,
    OPERATOR_CREATE_FEE_PROPORTION,
};

pub fn update_mark_price(ctx: &Context<SettlePrintTrade>) -> Result<()> {
    let accounts_infos = &[
        ctx.accounts.creator.to_account_info(),
        ctx.accounts.mark_prices.to_account_info(),
        ctx.accounts.market_product_group.to_account_info(),
        ctx.accounts.system_clock.to_account_info(),
        ctx.accounts.btcusd_pyth_oracle.to_account_info(),
    ];

    let data = [50, 73, 243, 45, 10, 6, 220, 129].to_vec();

    solana_program::program::invoke(
        &Instruction {
            program_id: ctx.accounts.risk_engine_program.key(),
            accounts: vec![
                AccountMeta::new(ctx.accounts.creator.key(), true),
                AccountMeta::new(ctx.accounts.mark_prices.key(), false),
                AccountMeta::new_readonly(ctx.accounts.market_product_group.key(), false),
                AccountMeta::new_readonly(ctx.accounts.system_clock.key(), false),
                AccountMeta::new(ctx.accounts.btcusd_pyth_oracle.key(), false),
            ],
            data,
        },
        accounts_infos,
    )
    .unwrap();

    Ok(())
}

#[inline(never)]
pub fn sign_print_trade(ctx: &Context<SettlePrintTrade>) -> Result<()> {
    let accounts_infos = &[
        ctx.accounts.user.to_account_info().clone(),
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
        ctx.accounts
            .counterparty_trader_risk_state_acct
            .to_account_info()
            .clone(),
        ctx.accounts.s_account.to_account_info().clone(),
        ctx.accounts.r_account.to_account_info().clone(),
        ctx.accounts.mark_prices.to_account_info().clone(),
        ctx.accounts.btcusd_pyth_oracle.to_account_info().clone(),
    ];

    let response = &ctx.accounts.response;
    let rfq = &ctx.accounts.rfq;

    let authority_side = match response.print_trade_prepared_by.unwrap() {
        AuthoritySide::Taker => AuthoritySide::Maker,
        AuthoritySide::Maker => AuthoritySide::Taker,
    };

    // HXRO typed side
    let side = match response.confirmed.unwrap().side {
        Side::Bid => dex_cpi::typedefs::Side::Bid,
        Side::Ask => dex_cpi::typedefs::Side::Ask,
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
                product_index: leg_data.product_index,
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
        operator_creator_fee_proportion: OPERATOR_CREATE_FEE_PROPORTION,
        operator_counterparty_fee_proportion: OPERATOR_COUNTERPARTY_FEE_PROPORTION,
    };

    solana_program::program::invoke(
        &Instruction {
            program_id: ctx.accounts.dex.key(),
            accounts: vec![
                AccountMeta::new(ctx.accounts.user.key(), true),
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
                AccountMeta::new_readonly(ctx.accounts.system_clock.key(), false),
                AccountMeta::new(ctx.accounts.creator_trader_fee_state_acct.key(), false),
                AccountMeta::new(ctx.accounts.creator_trader_risk_state_acct.key(), false),
                AccountMeta::new(ctx.accounts.counterparty_trader_fee_state_acct.key(), false),
                AccountMeta::new(ctx.accounts.operator_owner.key(), true),
                AccountMeta::new(
                    ctx.accounts.counterparty_trader_risk_state_acct.key(),
                    false,
                ),
                AccountMeta::new(ctx.accounts.s_account.key(), false),
                AccountMeta::new(ctx.accounts.r_account.key(), false),
                AccountMeta::new(ctx.accounts.mark_prices.key(), false),
                AccountMeta::new(ctx.accounts.btcusd_pyth_oracle.key(), false),
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
