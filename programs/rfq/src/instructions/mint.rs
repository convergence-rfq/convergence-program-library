
// use anchor_lang::InstructionData;
// use anchor_spl::token::{self, Mint, TokenAccount, Transfer};
// use psy_american::cpi::accounts::{ExerciseOption, MintOptionV2};
// use psy_american::OptionMarket;
// use std::num::NonZeroU64;
// use solana_program::msg;


// #[derive(Accounts)]
// pub struct MintCtx<'info> {
//     #[account(mut, signer)]
//     pub authority: AccountInfo<'info>,
//     pub psy_american_program: AccountInfo<'info>,
//     /// The vault where the underlying assets are held. This is the PsyAmerican 
//     /// `underlying_asset_src`
//     #[account(mut)]
//     pub vault: Box<Account<'info, TokenAccount>>,
//     #[account(mut)]
//     pub vault_authority: AccountInfo<'info>,

//     /// Mint CPI acounts
//     pub underlying_asset_mint: AccountInfo<'info>,
//     #[account(mut)]
//     pub underlying_asset_pool: Box<Account<'info, TokenAccount>>,
//     #[account(mut)]
//     pub option_mint: Box<Account<'info, Mint>>,
//     #[account(mut)]
//     pub minted_option_dest: Box<Account<'info, TokenAccount>>,
//     #[account(mut)]
//     pub writer_token_mint: Box<Account<'info, Mint>>,
//     #[account(mut)]
//     pub minted_writer_token_dest: Box<Account<'info, TokenAccount>>,
//     pub option_market: Box<Account<'info, OptionMarket>>,
//     #[account(mut)]
//     pub fee_owner: AccountInfo<'info>,


//     pub token_program: AccountInfo<'info>,
//     pub associated_token_program: AccountInfo<'info>,
//     pub clock: Sysvar<'info, Clock>,
//     pub rent: Sysvar<'info, Rent>,
//     pub system_program: AccountInfo<'info>,
// }




//     pub fn mint<'a, 'b, 'c, 'info>(ctx: Context<'a, 'b, 'c, 'info, MintCtx<'info>>, size: u64, vault_authority_bump: u8) -> ProgramResult {
//         let cpi_program = ctx.accounts.psy_american_program.clone();
//         let cpi_accounts = MintOptionV2 {
//             // The authority that has control over the underlying assets. In this case it's the 
//             // vault authority set in _init_mint_vault_
//             user_authority: ctx.accounts.vault_authority.to_account_info(),
//             // The Mint of the underlying asset for the contracts. Also the mint that is in the vault.
//             underlying_asset_mint: ctx.accounts.underlying_asset_mint.to_account_info(),
//             // The underlying asset pool for the OptionMarket
//             underlying_asset_pool: ctx.accounts.underlying_asset_pool.to_account_info(),
//             // The source account where the underlying assets are coming from. In this case it's the vault.
//             underlying_asset_src: ctx.accounts.vault.to_account_info(),
//             // The mint of the option
//             option_mint: ctx.accounts.option_mint.to_account_info(),
//             // The destination for the minted options
//             minted_option_dest: ctx.accounts.minted_option_dest.to_account_info(),
//             // The Mint of the writer token for the OptionMarket
//             writer_token_mint: ctx.accounts.writer_token_mint.to_account_info(),
//             // The destination for the minted WriterTokens
//             minted_writer_token_dest: ctx.accounts.minted_writer_token_dest.to_account_info(),
//             // The PsyOptions OptionMarket to mint from
//             option_market: ctx.accounts.option_market.to_account_info(),
//             // The rest are self explanatory, we can't spell everything out for you ;)
//             token_program: ctx.accounts.token_program.to_account_info(),
//         };
//         let key = ctx.accounts.underlying_asset_mint.key();

//         let seeds = &[
//             key.as_ref(),
//             b"vaultAuthority",
//             &[vault_authority_bump]
//         ];
//         let signer = &[&seeds[..]];
//         let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
//         psy_american::cpi::mint_option(cpi_ctx, size)
//     }