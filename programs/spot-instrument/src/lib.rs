use crate::errors::SpotError;
use anchor_lang::prelude::*;
use anchor_spl::token::{transfer, Mint, Token, TokenAccount, Transfer};
use rfq::states::{AuthoritySide, Response, Rfq};

mod errors;

declare_id!("A5mS5KjyhgZ5yP9ff3psQb7KsQfBJYTfiwGczE2kVNMM");

const ESCROW_SEED: &str = "escrow";

#[program]
pub mod spot_instrument {

    use super::*;

    pub fn validate_data(ctx: Context<ValidateData>, mint_address: Pubkey) -> Result<()> {
        require!(
            mint_address == ctx.accounts.mint.key(),
            SpotError::PassedMintDoesNotMatch
        );
        Ok(())
    }

    pub fn prepare_to_settle(
        ctx: Context<PrepareToSettle>,
        leg_index: u8,
        side: AuthoritySide,
    ) -> Result<()> {
        let PrepareToSettle {
            caller,
            caller_tokens,
            rfq,
            response,
            mint,
            escrow,
            token_program,
            ..
        } = &ctx.accounts;
        let leg_data = &rfq.legs[leg_index as usize].instrument_data;
        let expected_mint: Pubkey = AnchorDeserialize::try_from_slice(leg_data)?;
        require!(
            expected_mint == mint.key(),
            SpotError::PassedMintDoesNotMatch
        );

        let token_amount = response.get_leg_amount_to_transfer(rfq, leg_index, side);

        if token_amount > 0 {
            let transfer_accounts = Transfer {
                from: caller_tokens.to_account_info(),
                to: escrow.to_account_info(),
                authority: caller.to_account_info(),
            };
            let transfer_ctx = CpiContext::new(token_program.to_account_info(), transfer_accounts);
            transfer(transfer_ctx, token_amount as u64)?;
        }

        Ok(())
    }
}

#[derive(Accounts)]
pub struct ValidateData<'info> {
    pub mint: Account<'info, Mint>,
}

#[derive(Accounts)]
#[instruction(leg_index: u8, side: AuthoritySide)]
pub struct PrepareToSettle<'info> {
    #[account(mut)]
    pub caller: Signer<'info>,
    #[account(mut, constraint = caller_tokens.mint == mint.key() @ SpotError::PassedMintDoesNotMatch)]
    pub caller_tokens: Account<'info, TokenAccount>,

    pub rfq: Account<'info, Rfq>,
    pub response: Account<'info, Response>,
    pub mint: Account<'info, Mint>,

    #[account(init, payer = caller, token::mint = mint, token::authority = escrow,
        seeds = [ESCROW_SEED.as_bytes(), response.key().as_ref(), &[side as u8], &[leg_index]], bump)]
    pub escrow: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}
