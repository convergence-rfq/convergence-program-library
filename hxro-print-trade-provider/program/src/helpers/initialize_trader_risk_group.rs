use anchor_lang::prelude::*;
use dex::cpi::accounts::InitializeTraderRiskGroup;
use dex::cpi::initialize_trader_risk_group as initialize_trader_risk_group_cpi;

use crate::constants::OPERATOR_SEED;
use crate::InitializeOperatorTraderRiskGroupAccounts;

pub fn initialize_trader_risk_group<'info>(
    ctx: Context<'_, '_, '_, 'info, InitializeOperatorTraderRiskGroupAccounts<'info>>,
) -> Result<()> {
    let InitializeOperatorTraderRiskGroupAccounts {
        operator,
        dex,
        operator_trg,
        market_product_group,
        risk_and_fee_signer,
        trader_risk_state_acct,
        trader_fee_state_acct,
        risk_engine_program,
        fee_model_config_acct,
        fee_model_program,
        system_program,
        ..
    } = &ctx.accounts;

    let accounts = InitializeTraderRiskGroup {
        owner: operator.to_account_info(),
        trader_risk_group: operator_trg.to_account_info(),
        market_product_group: market_product_group.to_account_info(),
        risk_signer: risk_and_fee_signer.to_account_info(),
        trader_risk_state_acct: trader_risk_state_acct.to_account_info(),
        trader_fee_state_acct: trader_fee_state_acct.to_account_info(),
        risk_engine_program: risk_engine_program.to_account_info(),
        fee_model_config_acct: fee_model_config_acct.to_account_info(),
        fee_model_program: fee_model_program.to_account_info(),
        system_program: system_program.to_account_info(),
    };

    let bump: u8 = *ctx.bumps.get("operator").unwrap();
    let context = CpiContext {
        accounts,
        remaining_accounts: ctx.remaining_accounts.to_vec(),
        program: dex.to_account_info(),
        signer_seeds: &[&[OPERATOR_SEED.as_bytes(), &[bump]]],
    };

    initialize_trader_risk_group_cpi(context)
}
