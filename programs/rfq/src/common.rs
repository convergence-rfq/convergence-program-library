use anchor_lang::prelude::*;
use anchor_spl::token::{transfer, Token, TokenAccount, Transfer};

use crate::{
    constants::COLLATERAL_SEED,
    states::{CollateralInfo, Response, Rfq},
};

pub fn unlock_response_collateral(
    rfq: &mut Rfq,
    response: &mut Response,
    taker_collateral_info: &mut CollateralInfo,
    maker_collateral_info: &mut CollateralInfo,
) {
    let taker_collateral = response.taker_collateral_locked;
    if taker_collateral > 0 {
        taker_collateral_info.unlock_collateral(taker_collateral);
        response.taker_collateral_locked = 0;
        rfq.total_taker_collateral_locked -= taker_collateral;
    }

    let maker_collateral = response.maker_collateral_locked;
    if maker_collateral > 0 {
        maker_collateral_info.unlock_collateral(maker_collateral);
        response.maker_collateral_locked = 0;
    }
}

pub fn transfer_collateral_token<'info>(
    amount: u64,
    from: &Account<'info, TokenAccount>,
    to: &Account<'info, TokenAccount>,
    authority: &Account<'info, CollateralInfo>,
    token_program: &Program<'info, Token>,
) -> Result<()> {
    let transfer_accounts = Transfer {
        from: from.to_account_info(),
        to: to.to_account_info(),
        authority: authority.to_account_info(),
    };
    let bump_seed = [authority.bump];
    let transfer_seed = &[&[
        COLLATERAL_SEED.as_bytes(),
        authority.user.as_ref(),
        &bump_seed,
    ][..]];
    let transfer_ctx = CpiContext::new_with_signer(
        token_program.to_account_info(),
        transfer_accounts,
        transfer_seed,
    );
    transfer(transfer_ctx, amount)?;

    Ok(())
}
