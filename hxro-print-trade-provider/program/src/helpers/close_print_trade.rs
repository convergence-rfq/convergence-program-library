use anchor_lang::prelude::*;
use dex::cpi::accounts::ClosePrintTrade;
use dex::cpi::close_print_trade as close_print_trade_cpi;
use rfq::state::AuthoritySide;

use crate::constants::OPERATOR_SEED;
use crate::CleanUpPrintTradeAccounts;

pub fn close_print_trade<'info>(
    ctx: &Context<'_, '_, '_, 'info, CleanUpPrintTradeAccounts<'info>>,
) -> Result<()> {
    let CleanUpPrintTradeAccounts {
        response,
        operator,
        dex,
        market_product_group,
        taker_trg,
        maker_trg,
        operator_trg,
        print_trade,
        creator_wallet,
        system_program,
        ..
    } = &ctx.accounts;

    let (creator_trg, counterparty_trg) =
        if response.print_trade_initialized_by.unwrap() == AuthoritySide::Taker {
            (taker_trg, maker_trg)
        } else {
            (maker_trg, taker_trg)
        };

    let accounts = ClosePrintTrade {
        op: operator.to_account_info(),
        creator: creator_trg.to_account_info(),
        counterparty: counterparty_trg.to_account_info(),
        operator: operator_trg.to_account_info(),
        market_product_group: market_product_group.to_account_info(),
        print_trade: print_trade.to_account_info(),
        system_program: system_program.to_account_info(),
        seed: response.to_account_info(),
        creator_wallet: creator_wallet.to_account_info(),
    };

    let bump: u8 = *ctx.bumps.get("operator").unwrap();
    let context = CpiContext {
        accounts,
        remaining_accounts: vec![],
        program: dex.to_account_info(),
        signer_seeds: &[&[OPERATOR_SEED.as_bytes(), &[bump]]],
    };

    close_print_trade_cpi(context)?;

    Ok(())
}
