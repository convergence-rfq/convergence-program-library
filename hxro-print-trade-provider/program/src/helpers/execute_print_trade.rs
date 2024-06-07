use anchor_lang::prelude::*;
use dex::cpi::accounts::ExecutePrintTrade;
use dex::cpi::execute_print_trade as execute_print_trade_cpi;
use dex::state::print_trade::PrintTradeExecutionResult;
use rfq::interfaces::print_trade_provider::SettlementResult;
use rfq::state::AuthoritySide;

use crate::constants::OPERATOR_SEED;
use crate::SettlePrintTradeAccounts;

pub fn execute_print_trade<'info>(
    ctx: &Context<'_, '_, '_, 'info, SettlePrintTradeAccounts<'info>>,
) -> Result<SettlementResult> {
    let SettlePrintTradeAccounts {
        response,
        dex,
        operator,
        market_product_group,
        taker_trg,
        maker_trg,
        operator_trg,
        print_trade,
        execution_output,
        fee_model_program,
        fee_model_configuration_acct,
        fee_output_register,
        risk_engine_program,
        risk_model_configuration_acct,
        risk_output_register,
        risk_and_fee_signer,
        creator_fee_state_acct,
        creator_risk_state_acct,
        counterparty_fee_state_acct,
        counterparty_risk_state_acct,
        system_program,
        ..
    } = &ctx.accounts;

    let (creator_trg, counterparty_trg) =
        if response.print_trade_initialized_by.unwrap() == AuthoritySide::Taker {
            (taker_trg, maker_trg)
        } else {
            (maker_trg, taker_trg)
        };

    let accounts = ExecutePrintTrade {
        op: operator.to_account_info(),
        creator: creator_trg.to_account_info(),
        counterparty: counterparty_trg.to_account_info(),
        operator: operator_trg.to_account_info(),
        market_product_group: market_product_group.to_account_info(),
        print_trade: print_trade.to_account_info(),
        system_program: system_program.to_account_info(),
        fee_model_program: fee_model_program.to_account_info(),
        fee_model_configuration_acct: fee_model_configuration_acct.to_account_info(),
        fee_output_register: fee_output_register.to_account_info(),
        risk_engine_program: risk_engine_program.to_account_info(),
        risk_model_configuration_acct: risk_model_configuration_acct.to_account_info(),
        risk_output_register: risk_output_register.to_account_info(),
        risk_and_fee_signer: risk_and_fee_signer.to_account_info(),
        creator_trader_fee_state_acct: creator_fee_state_acct.to_account_info(),
        creator_trader_risk_state_acct: creator_risk_state_acct.to_account_info(),
        counterparty_trader_fee_state_acct: counterparty_fee_state_acct.to_account_info(),
        counterparty_trader_risk_state_acct: counterparty_risk_state_acct.to_account_info(),
        seed: response.to_account_info(),
        execution_output: execution_output.to_account_info(),
    };

    let bump: u8 = *ctx.bumps.get("operator").unwrap();
    let context = CpiContext {
        accounts,
        remaining_accounts: vec![],
        program: dex.to_account_info(),
        signer_seeds: &[&[OPERATOR_SEED.as_bytes(), &[bump]]],
    };

    execute_print_trade_cpi(context)?;

    let outcome_data = execution_output.load()?;

    let (creator_defaults, counterparty_defaults) = match response.print_trade_initialized_by {
        Some(AuthoritySide::Taker) => (
            SettlementResult::TakerDefaults,
            SettlementResult::MakerDefaults,
        ),
        Some(AuthoritySide::Maker) => (
            SettlementResult::MakerDefaults,
            SettlementResult::TakerDefaults,
        ),
        None => unreachable!(),
    };

    msg!("Outcome data: {:?}", outcome_data.result);

    Ok(match outcome_data.result {
        PrintTradeExecutionResult::CounterpartyHasntSigned => unreachable!(),
        PrintTradeExecutionResult::CreatorCancelled => creator_defaults,
        PrintTradeExecutionResult::CounterpartyCancelled => counterparty_defaults,
        PrintTradeExecutionResult::CreatorNotEnoughLockedCollateral => creator_defaults,
        PrintTradeExecutionResult::CounterpartyNotEnoughLockedCollateral => counterparty_defaults,
        PrintTradeExecutionResult::Success => SettlementResult::Success,
    })
}
