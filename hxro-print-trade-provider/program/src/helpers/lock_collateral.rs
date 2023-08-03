use anchor_lang::prelude::*;
use dex::cpi::accounts::LockCollateral;
use dex::cpi::lock_collateral as hxro_lock_collateral;
use dex::state::trader_risk_group::LockedCollateralProductIndex;
use dex::utils::numeric::ZERO_FRAC;
use dex::LockCollateralParams;

use crate::PreparePrintTradeAccounts;

use super::conversions::{to_hxro_product, ProductInfo};

pub fn lock_collateral<'info>(
    ctx: &Context<'_, '_, '_, 'info, PreparePrintTradeAccounts<'info>>,
) -> Result<()> {
    let PreparePrintTradeAccounts {
        rfq,
        response,
        dex,
        market_product_group,
        user,
        user_trg,
        fee_model_program,
        fee_model_configuration_acct,
        fee_output_register,
        risk_engine_program,
        risk_model_configuration_acct,
        risk_output_register,
        risk_and_fee_signer,
        fee_state_acct,
        risk_state_acct,
        ..
    } = &ctx.accounts;

    let mut products = [LockedCollateralProductIndex {
        product_index: 0,
        size: ZERO_FRAC,
    }; 6];
    for i in 0..rfq.legs.len() {
        let ProductInfo {
            product_index,
            size,
        } = to_hxro_product(rfq, response, i as u8)?;
        products[i] = LockedCollateralProductIndex {
            product_index: product_index as usize,
            size,
        };
    }
    let ix_params = LockCollateralParams {
        num_products: rfq.legs.len(),
        products,
    };

    let accounts = LockCollateral {
        user: user.to_account_info(),
        trader_risk_group: user_trg.to_account_info(),
        market_product_group: market_product_group.to_account_info(),
        fee_model_program: fee_model_program.to_account_info(),
        fee_model_configuration_acct: fee_model_configuration_acct.to_account_info(),
        fee_output_register: fee_output_register.to_account_info(),
        risk_engine_program: risk_engine_program.to_account_info(),
        risk_model_configuration_acct: risk_model_configuration_acct.to_account_info(),
        risk_output_register: risk_output_register.to_account_info(),
        risk_and_fee_signer: risk_and_fee_signer.to_account_info(),
        fee_state_acct: fee_state_acct.to_account_info(),
        risk_state_acct: risk_state_acct.to_account_info(),
    };

    let context = CpiContext {
        accounts,
        remaining_accounts: vec![],
        program: dex.to_account_info(),
        signer_seeds: &[],
    };

    hxro_lock_collateral(context, ix_params)
}
