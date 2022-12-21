use anchor_lang::prelude::*;
mod state;
use anchor_spl::associated_token::get_associated_token_address;
use anchor_spl::token::{close_account, transfer, CloseAccount, Token, TokenAccount, Transfer};
use psy_american::OptionMarket;
mod instructions;
use instructions::*;
use state::{AuthoritySideDuplicate, OptionType};
mod errors;
use errors::PsyoptionsAmericanError;
use rfq::states::AuthoritySide;

declare_id!("ATtEpDQ6smvJnMSJvhLc21DBCTBKutih7KBf9Qd5b8xy");
const ESCROW_SEED: &str = "psyescrow";
#[program]
pub mod psyoptions_american_instrument {

    use state::OptionType;

    use super::*;

    pub fn validate_data(
        ctx: Context<ValidateData>,
        data_size: u32,
        option_mint: Pubkey,
        american_meta: Pubkey,
        option_type: OptionType,
    ) -> Result<()> {
        let american_meta_account = &ctx.accounts.american_meta;
        // require!(
        //     american_meta_account.underlying_asset_mint == ctx.accounts.underlying_asset_mint.key(),
        //     PsyoptionsAmericanError::PassedMintDoesNotMatch
        // );
        require!(
            american_meta == ctx.accounts.american_meta.key(),
            PsyoptionsAmericanError::PassedAmericanMetaDoesNotMatch
        );
        require!(
            american_meta_account.option_mint == option_mint,
            PsyoptionsAmericanError::PassedAmericanMetaDoesNotMatch
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
            caller_token_account,
            rfq,
            response,
            mint,
            escrow,
            token_program,
            ..
        } = &ctx.accounts;
        msg!("escrow pubkey");
        msg!(ctx.accounts.escrow.key().to_string().as_str());
        let leg_data = &rfq.legs[leg_index as usize].instrument_data;
        let expected_mint: Pubkey = AnchorDeserialize::try_from_slice(&leg_data[..32])?;
        require!(
            expected_mint == mint.key(),
            PsyoptionsAmericanError::PassedMintDoesNotMatch
        );
        require!(
            caller_token_account.mint == mint.key(),
            PsyoptionsAmericanError::PassedMintDoesNotMatch
        );

        let token_amount = response.get_leg_amount_to_transfer(rfq, leg_index, side.into());
        let bal = caller_token_account.amount;
        let caller_pub = caller_token_account.owner.key();
        msg!("token balance :{}", bal.to_string().as_str());
        msg!("token accont owner  :{}", caller_pub.to_string().as_str());
        msg!(
            "token account address:{}",
            caller_token_account.key().to_string().as_str()
        );

        msg!(
            "token amount to transfer :{}",
            token_amount.to_string().as_str()
        );

        if token_amount > 0 {
            let transfer_accounts = Transfer {
                from: caller_token_account.to_account_info(),
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
            receiver_token_account,
            token_program,
            ..
        } = &ctx.accounts;

        response
            .get_leg_assets_receiver(rfq, leg_index)
            .validate_is_associated_token_account(
                rfq,
                response,
                escrow.mint,
                receiver_token_account.key(),
            )?;

        transfer_from_an_escrow(
            escrow,
            receiver_token_account,
            response.key(),
            leg_index,
            *ctx.bumps.get("escrow").unwrap(),
            token_program,
        )?;

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
            transfer_from_an_escrow(
                escrow,
                tokens,
                response.key(),
                leg_index,
                *ctx.bumps.get("escrow").unwrap(),
                token_program,
            )?;
        }

        Ok(())
    }

    pub fn clean_up(ctx: Context<CleanUp>, leg_index: u8) -> Result<()> {
        let CleanUp {
            protocol,
            rfq,
            response,
            first_to_prepare,
            escrow,
            backup_receiver,
            token_program,
            ..
        } = &ctx.accounts;

        require!(
            get_associated_token_address(&protocol.authority, &escrow.mint)
                == backup_receiver.key(),
            PsyoptionsAmericanError::InvalidBackupAddress
        );

        let expected_first_to_prepare = response.leg_preparations_initialized_by
            [leg_index as usize]
            .to_public_key(rfq, response);
        require!(
            first_to_prepare.key() == expected_first_to_prepare,
            PsyoptionsAmericanError::NotFirstToPrepare
        );

        transfer_from_an_escrow(
            escrow,
            backup_receiver,
            response.key(),
            leg_index,
            *ctx.bumps.get("escrow").unwrap(),
            token_program,
        )?;

        close_escrow_account(
            escrow,
            first_to_prepare,
            response.key(),
            leg_index,
            *ctx.bumps.get("escrow").unwrap(),
            token_program,
        )?;

        Ok(())
    }
}

fn transfer_from_an_escrow<'info>(
    escrow_token_account: &Account<'info, TokenAccount>,
    receiver_token_account: &Account<'info, TokenAccount>,
    response: Pubkey,
    leg_index: u8,
    bump: u8,
    token_program: &Program<'info, Token>,
) -> Result<()> {
    let amount = escrow_token_account.amount;
    let transfer_accounts = Transfer {
        from: escrow_token_account.to_account_info(),
        to: receiver_token_account.to_account_info(),
        authority: escrow_token_account.to_account_info(),
    };
    let response_key = response.key();
    let leg_index_seed = [leg_index];
    let bump_seed = [bump];
    let escrow_seed = &[&[
        ESCROW_SEED.as_bytes(),
        response_key.as_ref(),
        &leg_index_seed,
        &bump_seed,
    ][..]];
    let transfer_ctx = CpiContext::new_with_signer(
        token_program.to_account_info(),
        transfer_accounts,
        escrow_seed,
    );
    transfer(transfer_ctx, amount)?;

    Ok(())
}

fn close_escrow_account<'info>(
    escrow_token_account: &Account<'info, TokenAccount>,
    sol_receiver: &UncheckedAccount<'info>,
    response: Pubkey,
    leg_index: u8,
    bump: u8,
    token_program: &Program<'info, Token>,
) -> Result<()> {
    let close_tokens_account = CloseAccount {
        account: escrow_token_account.to_account_info(),
        destination: sol_receiver.to_account_info(),
        authority: escrow_token_account.to_account_info(),
    };

    let response_key = response.key();
    let leg_index_seed = [leg_index];
    let bump_seed = [bump];
    let escrow_seed = &[&[
        ESCROW_SEED.as_bytes(),
        response_key.as_ref(),
        &leg_index_seed,
        &bump_seed,
    ][..]];

    let close_tokens_account_ctx = CpiContext::new_with_signer(
        token_program.to_account_info(),
        close_tokens_account,
        escrow_seed,
    );

    close_account(close_tokens_account_ctx)
}

impl From<AuthoritySideDuplicate> for AuthoritySide {
    fn from(value: AuthoritySideDuplicate) -> Self {
        match value {
            AuthoritySideDuplicate::Taker => AuthoritySide::Taker,
            AuthoritySideDuplicate::Maker => AuthoritySide::Maker,
        }
    }
}
