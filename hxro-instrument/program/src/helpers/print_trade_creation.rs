use anchor_lang::prelude::*;
use anchor_lang::solana_program;
use anchor_lang::solana_program::instruction::Instruction;
use anchor_lang::InstructionData;
use std::ops::Deref;

use dex_cpi;
use rfq::state::{AuthoritySide, Side};

use crate::{
    state::{AuthoritySideDuplicate, ParsedLegData},
    CreatePrintTrade, MAX_PRODUCTS_PER_TRADE, OPERATOR_COUNTERPARTY_FEE_PROPORTION,
    OPERATOR_CREATOR_FEE_PROPORTION,
};

pub fn create_print_trade(
    ctx: &Context<CreatePrintTrade>,
    authority_side_duplicate: AuthoritySideDuplicate,
) -> Result<()> {
    let cpi_accounts = Box::new([
        ctx.accounts.creator_owner.to_account_info(),
        ctx.accounts.creator.to_account_info(),
        ctx.accounts.counterparty.to_account_info(),
        ctx.accounts.operator.to_account_info(),
        ctx.accounts.market_product_group.to_account_info(),
        ctx.accounts.print_trade.to_account_info(),
        ctx.accounts.system_program.to_account_info(),
        ctx.accounts.operator_owner.to_account_info(),
        ctx.accounts.fee_model_program.to_account_info(),
        ctx.accounts.fee_model_configuration_acct.to_account_info(),
        ctx.accounts.fee_output_register.to_account_info(),
        ctx.accounts.risk_engine_program.to_account_info(),
        ctx.accounts.risk_model_configuration_acct.to_account_info(),
        ctx.accounts.risk_output_register.to_account_info(),
        ctx.accounts.risk_and_fee_signer.to_account_info(),
        ctx.accounts.creator_trader_fee_state_acct.to_account_info(),
        ctx.accounts
            .creator_trader_risk_state_acct
            .to_account_info(),
    ]);

    msg!("ACCOUNTS:");
    for acc in cpi_accounts.iter() {
        msg!("{}", acc.key());
    }

    let response = &ctx.accounts.response;
    let rfq = &ctx.accounts.rfq;

    let authority_side = match authority_side_duplicate {
        AuthoritySideDuplicate::Taker => AuthoritySide::Taker,
        AuthoritySideDuplicate::Maker => AuthoritySide::Maker,
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

            let mut amount = response.get_leg_amount_to_transfer(&rfq, i as u8) as i64;
            if authority_side != response.get_leg_assets_receiver(&rfq, i as u8) {
                amount = -amount;
            }

            dex_cpi::typedefs::PrintTradeProductIndex {
                product_index: leg_data.product_index as u64,
                size: dex_cpi::typedefs::Fractional {
                    m: amount,
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

    let abs_price = response.get_quote_amount_to_transfer(&rfq);
    let price = dex_cpi::typedefs::Fractional {
        m: abs_price as i64,
        exp: 1,
    };

    let cpi_params = dex_cpi::typedefs::InitializePrintTradeParams {
        num_products: rfq.legs.len() as u64,
        products,
        price,
        side,
        operator_creator_fee_proportion: OPERATOR_CREATOR_FEE_PROPORTION,
        operator_counterparty_fee_proportion: OPERATOR_COUNTERPARTY_FEE_PROPORTION,
        is_operator_signer: false,
        is_collateral_locked: true,
    };

    solana_program::program::invoke(
        &Instruction {
            program_id: ctx.accounts.dex.key(),
            accounts: vec![
                AccountMeta::new(ctx.accounts.creator_owner.key(), true),
                AccountMeta::new_readonly(ctx.accounts.creator.key.key(), false),
                AccountMeta::new_readonly(ctx.accounts.counterparty.key.key(), false),
                AccountMeta::new_readonly(ctx.accounts.operator.key.key(), false),
                AccountMeta::new(ctx.accounts.market_product_group.key.key(), false),
                AccountMeta::new(ctx.accounts.print_trade.key.key(), false),
                AccountMeta::new_readonly(ctx.accounts.system_program.key.key(), false),
                AccountMeta::new_readonly(ctx.accounts.operator_owner.key.key(), false),
                AccountMeta::new_readonly(ctx.accounts.fee_model_program.key.key(), false),
                AccountMeta::new_readonly(
                    ctx.accounts.fee_model_configuration_acct.key.key(),
                    false,
                ),
                AccountMeta::new(ctx.accounts.fee_output_register.key.key(), false),
                AccountMeta::new_readonly(ctx.accounts.risk_engine_program.key.key(), false),
                AccountMeta::new_readonly(
                    ctx.accounts.risk_model_configuration_acct.key.key(),
                    false,
                ),
                AccountMeta::new(ctx.accounts.risk_output_register.key.key(), false),
                AccountMeta::new_readonly(ctx.accounts.risk_and_fee_signer.key.key(), false),
                AccountMeta::new(ctx.accounts.creator_trader_fee_state_acct.key.key(), false),
                AccountMeta::new(ctx.accounts.creator_trader_risk_state_acct.key.key(), false),
            ],
            data: dex_cpi::instruction::InitializePrintTrade {
                _params: cpi_params,
            }
            .data(),
        },
        cpi_accounts.deref(),
    )
    .unwrap();

    Ok(())
}
