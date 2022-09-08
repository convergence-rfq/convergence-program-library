use crate::errors::PsyOptionsAmericanError;
use crate::state::AuthoritySideDuplicate;
use anchor_lang::prelude::*;
use anchor_spl::token::{transfer, Mint, Token, TokenAccount, Transfer};
use rfq::states::{AuthoritySide, ProtocolState, Response, Rfq};

mod errors;
mod state;

declare_id!("B5mS5KjyhgZ5yP9ff3psQb7KsQfBJYTfiwGczE2kVNMM");

const ESCROW_SEED: &str = "escrow";

#[program]
pub mod psyoptions_american_instrument {
    use super::*;

    pub fn validate_data(
        ctx: Context<ValidateData>,
        data_size: u32,
        mint_address: Pubkey,
    ) -> Result<()> {
        require!(
            data_size as usize == std::mem::size_of::<Pubkey>(),
            PsyOptionsAmericanError::InvalidDataSize
        );
        require!(
            mint_address == ctx.accounts.mint.key(),
            PsyOptionsAmericanError::PassedMintDoesNotMatch
        );
        Ok(())
    }

    pub fn prepare_to_settle(
        ctx: Context<PrepareToSettle>,
        leg_index: u8,
        side: AuthoritySideDuplicate,
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
            PsyOptionsAmericanError::PassedMintDoesNotMatch
        );

        let token_amount = response.get_leg_amount_to_transfer(rfq, leg_index, side.into());

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

    pub fn settle(ctx: Context<Settle>, leg_index: u8) -> Result<()> {
        let Settle {
            rfq,
            response,
            escrow,
            receiver_tokens,
            token_program,
            ..
        } = &ctx.accounts;

        response
            .get_leg_assets_receiver(rfq, leg_index)
            .validate_is_associated_token_account(
                rfq,
                response,
                escrow.mint,
                receiver_tokens.key(),
            )?;

        let amount = escrow.amount;
        let transfer_accounts = Transfer {
            from: escrow.to_account_info(),
            to: receiver_tokens.to_account_info(),
            authority: escrow.to_account_info(),
        };
        let response_key = response.key();
        let leg_index_seed = [leg_index];
        let bump_seed = [*ctx.bumps.get("escrow").unwrap()];
        let transfer_seed = &[&[
            ESCROW_SEED.as_bytes(),
            response_key.as_ref(),
            &leg_index_seed,
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

    pub fn revert_preparation(
        ctx: Context<RevertPreparation>,
        leg_index: u8,
        side: AuthoritySideDuplicate,
    ) -> Result<()> {
        let RevertPreparation {
            rfq,
            response,
            escrow,
            tokens,
            token_program,
            ..
        } = &ctx.accounts;

        let side: AuthoritySide = side.into();
        side.validate_is_associated_token_account(rfq, response, escrow.mint, tokens.key())?;

        if side == response.get_leg_assets_receiver(rfq, leg_index).revert() {
            let amount = escrow.amount;
            let transfer_accounts = Transfer {
                from: escrow.to_account_info(),
                to: tokens.to_account_info(),
                authority: escrow.to_account_info(),
            };
            let response_key = response.key();
            let leg_index_seed = [leg_index];
            let bump_seed = [*ctx.bumps.get("escrow").unwrap()];
            let transfer_seed = &[&[
                ESCROW_SEED.as_bytes(),
                response_key.as_ref(),
                &leg_index_seed,
                &bump_seed,
            ][..]];
            let transfer_ctx = CpiContext::new_with_signer(
                token_program.to_account_info(),
                transfer_accounts,
                transfer_seed,
            );
            transfer(transfer_ctx, amount)?;
        }

        Ok(())
    }
}

#[derive(Accounts)]
pub struct ValidateData<'info> {
    #[account(signer)]
    pub protocol: Account<'info, ProtocolState>,
    pub mint: Account<'info, Mint>,
}

#[derive(Accounts)]
#[instruction(leg_index: u8, side: AuthoritySide)]
pub struct PrepareToSettle<'info> {
    #[account(signer)]
    pub protocol: Account<'info, ProtocolState>,
    #[account(mut)]
    pub caller: Signer<'info>,
    #[account(mut, constraint = caller_tokens.mint == mint.key() @ PsyOptionsAmericanError::PassedMintDoesNotMatch)]
    pub caller_tokens: Account<'info, TokenAccount>,

    pub rfq: Box<Account<'info, Rfq>>,
    pub response: Account<'info, Response>,
    pub mint: Account<'info, Mint>,

    #[account(init_if_needed, payer = caller, token::mint = mint, token::authority = escrow,
        seeds = [ESCROW_SEED.as_bytes(), response.key().as_ref(), &[leg_index]], bump)]
    pub escrow: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
#[instruction(leg_index: u8)]
pub struct Settle<'info> {
    #[account(signer)]
    pub protocol: Account<'info, ProtocolState>,
    pub rfq: Account<'info, Rfq>,
    pub response: Account<'info, Response>,

    #[account(mut, seeds = [ESCROW_SEED.as_bytes(), response.key().as_ref(), &[leg_index]], bump)]
    pub escrow: Account<'info, TokenAccount>,
    #[account(mut, constraint = receiver_tokens.mint == escrow.mint @ PsyOptionsAmericanError::PassedMintDoesNotMatch)]
    pub receiver_tokens: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
#[instruction(leg_index: u8)]
pub struct RevertPreparation<'info> {
    #[account(signer)]
    pub protocol: Account<'info, ProtocolState>,
    pub rfq: Account<'info, Rfq>,
    pub response: Account<'info, Response>,

    #[account(mut, seeds = [ESCROW_SEED.as_bytes(), response.key().as_ref(), &[leg_index]], bump)]
    pub escrow: Account<'info, TokenAccount>,
    #[account(mut, constraint = tokens.mint == escrow.mint @ PsyOptionsAmericanError::PassedMintDoesNotMatch)]
    pub tokens: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}