use anchor_lang::prelude::*;

use dex::cpi::{accounts::SignPrintTrade, sign_print_trade as sign_print_trade_cpi};
use dex::state::print_trade::PrintTradeProductIndex;
use dex::utils::numeric::ZERO_FRAC;
use dex::SignPrintTradeParams;
use rfq::state::AuthoritySide;

use super::conversions::{to_hxro_price, to_hxro_product, to_hxro_side, ProductInfo};
use crate::constants::{
    OPERATOR_COUNTERPARTY_FEE_PROPORTION, OPERATOR_CREATOR_FEE_PROPORTION, OPERATOR_SEED,
};
use crate::PreparePrintTradeAccounts;

#[inline(never)]
pub fn sign_print_trade<'info>(
    ctx: &Context<'_, '_, '_, 'info, PreparePrintTradeAccounts<'info>>,
    authority_side: AuthoritySide,
) -> Result<()> {
    let PreparePrintTradeAccounts {
        rfq,
        response,
        dex,
        market_product_group,
        user,
        user_trg,
        counterparty_trg,
        operator,
        operator_trg,
        print_trade,
        fee_model_program,
        fee_model_configuration_acct,
        fee_output_register,
        risk_engine_program,
        risk_model_configuration_acct,
        risk_output_register,
        risk_and_fee_signer,
        user_fee_state_acct,
        user_risk_state_acct,
        counterparty_fee_state_acct,
        counterparty_risk_state_acct,
        system_program,
        ..
    } = &ctx.accounts;

    let mut products = [PrintTradeProductIndex {
        product_index: 0,
        size: ZERO_FRAC,
    }; 6];
    for i in 0..rfq.legs.len() {
        let ProductInfo {
            product_index,
            size,
        } = to_hxro_product(rfq, response, i as u8)?;
        products[i] = PrintTradeProductIndex {
            product_index: product_index as usize,
            size,
        };
    }
    let price = to_hxro_price(rfq, response);
    let params = SignPrintTradeParams {
        num_products: rfq.legs.len(),
        products,
        side: to_hxro_side(authority_side),
        use_locked_collateral: true,
        price,
        operator_creator_fee_proportion: OPERATOR_CREATOR_FEE_PROPORTION,
        operator_counterparty_fee_proportion: OPERATOR_COUNTERPARTY_FEE_PROPORTION,
    };

    let accounts = SignPrintTrade {
        user: user.to_account_info(),
        creator: counterparty_trg.to_account_info(),
        counterparty: user_trg.to_account_info(),
        operator: operator_trg.to_account_info(),
        market_product_group: market_product_group.to_account_info(),
        print_trade: print_trade.to_account_info(),
        system_program: system_program.to_account_info(),
        operator_owner: operator.to_account_info(),
        fee_model_program: fee_model_program.to_account_info(),
        fee_model_configuration_acct: fee_model_configuration_acct.to_account_info(),
        fee_output_register: fee_output_register.to_account_info(),
        risk_engine_program: risk_engine_program.to_account_info(),
        risk_model_configuration_acct: risk_model_configuration_acct.to_account_info(),
        risk_output_register: risk_output_register.to_account_info(),
        risk_and_fee_signer: risk_and_fee_signer.to_account_info(),
        creator_trader_fee_state_acct: counterparty_fee_state_acct.to_account_info(),
        creator_trader_risk_state_acct: counterparty_risk_state_acct.to_account_info(),
        counterparty_trader_fee_state_acct: user_fee_state_acct.to_account_info(),
        counterparty_trader_risk_state_acct: user_risk_state_acct.to_account_info(),
    };

    let bump: u8 = *ctx.bumps.get("operator").unwrap();
    let context = CpiContext {
        accounts,
        remaining_accounts: vec![],
        program: dex.to_account_info(),
        signer_seeds: &[&[OPERATOR_SEED.as_bytes(), &[bump]]],
    };

    sign_print_trade_cpi(context, params)
}
