use anchor_lang::prelude::*;

use rfq::state::AuthoritySide;

use crate::SettlePrintTrade;

use crate::{OPERATOR_COUNTERPARTY_FEE_PROPORTION, OPERATOR_CREATOR_FEE_PROPORTION};

use super::conversions::to_hxro_side;
use super::conversions::{to_hxro_price, to_hxro_product};

#[inline(never)]
pub fn sign_print_trade<'info>(
    ctx: &Context<'_, '_, '_, 'info, SettlePrintTrade<'info>>,
    authority_side: AuthoritySide,
) -> Result<()> {
    let SettlePrintTrade { rfq, response, .. } = &ctx.accounts;

    let side = to_hxro_side(authority_side);
    let product = to_hxro_product(rfq, response, 0);
    let price = to_hxro_price(rfq, response);

    let params = dex_cpi::typedefs::SignPrintTradeParams {
        product_index: product.product_index,
        size: product.size,
        price,
        side,
        operator_creator_fee_proportion: OPERATOR_CREATOR_FEE_PROPORTION,
        operator_counterparty_fee_proportion: OPERATOR_COUNTERPARTY_FEE_PROPORTION,
    };

    let accounts = dex_cpi::cpi::accounts::SignPrintTrade {
        user: ctx.accounts.user.to_account_info(),
        creator: ctx.accounts.creator.to_account_info(),
        counterparty: ctx.accounts.counterparty.to_account_info(),
        operator: ctx.accounts.operator.to_account_info(),
        market_product_group: ctx.accounts.market_product_group.to_account_info(),
        product: ctx.accounts.product.to_account_info(),
        print_trade: ctx.accounts.print_trade.to_account_info(),
        system_program: ctx.accounts.system_program.to_account_info(),
        fee_model_program: ctx.accounts.fee_model_program.to_account_info(),
        fee_model_configuration_acct: ctx.accounts.fee_model_configuration_acct.to_account_info(),
        fee_output_register: ctx.accounts.fee_output_register.to_account_info(),
        risk_engine_program: ctx.accounts.risk_engine_program.to_account_info(),
        risk_model_configuration_acct: ctx.accounts.risk_model_configuration_acct.to_account_info(),
        risk_output_register: ctx.accounts.risk_output_register.to_account_info(),
        risk_and_fee_signer: ctx.accounts.risk_and_fee_signer.to_account_info(),
        creator_trader_fee_state_acct: ctx.accounts.creator_trader_fee_state_acct.to_account_info(),
        creator_trader_risk_state_acct: ctx
            .accounts
            .creator_trader_risk_state_acct
            .to_account_info(),
        counterparty_trader_fee_state_acct: ctx
            .accounts
            .counterparty_trader_fee_state_acct
            .to_account_info(),
        counterparty_trader_risk_state_acct: ctx
            .accounts
            .counterparty_trader_risk_state_acct
            .to_account_info(),
    };

    let context = CpiContext {
        accounts,
        remaining_accounts: ctx.remaining_accounts.to_vec(),
        program: ctx.accounts.dex.to_account_info(),
        signer_seeds: &[],
    };

    dex_cpi::cpi::sign_print_trade(context, params)
}
