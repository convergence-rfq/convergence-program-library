//! Private module for program instructions.
use anchor_lang::prelude::*;
use num_traits::ToPrimitive;
use solana_program::sysvar::clock::Clock;
use psy_american::cpi::accounts::{ExerciseOption, MintOptionV2};
use psy_american::OptionMarket;
use anchor_lang::InstructionData;

use crate::access_controls::*;
use crate::constants::*;
use crate::contexts::*;
use crate::errors::*;
use crate::states::*;

/// Initializes.
///
/// Step 1: DAO initializes protocol.
///
/// ctx Accounts context
/// fee_denominator Fee denominator
/// fee_numerator Fee numerator
#[access_control(initialize_access_control(&ctx, fee_denominator))]
pub fn initialize(
    ctx: Context<Initialize>,
    fee_denominator: u64,
    fee_numerator: u64,
) -> Result<()> {
    let protocol = &mut ctx.accounts.protocol;
    protocol.access_manager_count = 0;
    protocol.authority = ctx.accounts.signer.key();
    protocol.bump = *ctx.bumps.get(PROTOCOL_SEED).unwrap();
    protocol.fee_denominator = fee_denominator;
    protocol.fee_numerator = fee_numerator;
    protocol.rfq_count = 0;

    Ok(())
}

/// Sets fee.
///
/// Optional: DAO sets fee.
///
/// ctx Accounts context
/// fee_denominator Fee denominator
/// fee_numerator Fee numerator
#[access_control(set_fee_access_control(&ctx, fee_denominator))]
pub fn set_fee(ctx: Context<SetFee>, fee_denominator: u64, fee_numerator: u64) -> Result<()> {
    let protocol = &mut ctx.accounts.protocol;
    protocol.fee_denominator = fee_denominator;
    protocol.fee_numerator = fee_numerator;

    Ok(())
}

/// Requests quote (RFQ).
///
/// Step 2: Taker request quote.
///
/// ctx Accounts context
/// expiry
/// last_look
/// legs
/// expiry
/// order_amount
/// order_type
#[access_control(request_access_control(&ctx, expiry, order_amount))]
pub fn request(
    ctx: Context<Request>,
    access_manager: Option<Pubkey>,
    expiry: i64,
    last_look: bool,
    legs: Vec<Leg>,
    order_amount: u64,
    order_type: Order,
) -> Result<()> {
    let protocol = &mut ctx.accounts.protocol;
    protocol.rfq_count = protocol
        .rfq_count
        .checked_add(1)
        .ok_or(ProtocolError::Math)?;

    let rfq = &mut ctx.accounts.rfq;
    rfq.access_manager = access_manager;
    rfq.asset_escrow_bump = *ctx.bumps.get(ASSET_ESCROW_SEED).unwrap();
    rfq.asset_mint = ctx.accounts.asset_mint.key();
    rfq.authority = ctx.accounts.signer.key();
    rfq.canceled = false;
    rfq.best_ask_address = None;
    rfq.best_ask_amount = None;
    rfq.best_bid_address = None;
    rfq.best_bid_amount = None;
    rfq.bump = *ctx.bumps.get(RFQ_SEED).unwrap();
    rfq.expiry = expiry;
    rfq.id = ctx.accounts.protocol.rfq_count;
    rfq.last_look = last_look;

    //check instrument type
    for leg in rfq.legs.iter() {
        match leg.instrument {
             Instrument::Spot => println!("Spot Stuff"),
             Instrument::Future => println!("Perp Stuff"),
             Instrument::Option => println!("Option Stuff"),

            // TODO ^ Try deleting the & and matching just "Ferris"
            _ => println!("Not possible"),
        }
    }
    


    //if options initialize options and save in legs vector
    // if spot default to legs


    rfq.legs = legs;
    rfq.order_amount = order_amount;
    rfq.quote_escrow_bump = *ctx.bumps.get(QUOTE_ESCROW_SEED).unwrap();
    rfq.quote_mint = ctx.accounts.quote_mint.key();
    rfq.order_type = order_type;
    rfq.response_count = 0;
    rfq.settled = false;
    rfq.unix_timestamp = Clock::get().unwrap().unix_timestamp;

    if rfq.last_look {
        rfq.approved = Some(false);
    }

    Ok(())
}

/// Cancels.
///
/// Optional: Taker cancels RFQ.
///
/// ctx Accounts context
#[access_control(cancel_access_control(&ctx))]
pub fn cancel(ctx: Context<Cancel>) -> Result<()> {
    let rfq = &mut ctx.accounts.rfq;
    rfq.canceled = true;

    Ok(())
}

/// Responds to RFQ.
///
/// Step 3: Maker responds with one or two-way quote.
///
/// ctx Accounts context
/// bid
/// ask
#[access_control(respond_access_control(&ctx, bid, ask))]
pub fn respond(ctx: Context<Respond>, bid: Option<u64>, ask: Option<u64>) -> Result<()> {
    let rfq = &mut ctx.accounts.rfq;
    rfq.response_count = rfq
        .response_count
        .checked_add(1)
        .ok_or(ProtocolError::Math)?;

    let order = &mut ctx.accounts.order;
    order.ask_confirmed = false;
    order.authority = ctx.accounts.signer.key();
    order.bid_confirmed = false;
    order.bump = *ctx.bumps.get(ORDER_SEED).unwrap();
    order.id = rfq.response_count;
    order.rfq = rfq.key();
    order.unix_timestamp = Clock::get().unwrap().unix_timestamp;

    if ask.is_some() {
        anchor_spl::token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::Transfer {
                    from: ctx.accounts.asset_wallet.to_account_info(),
                    to: ctx.accounts.asset_escrow.to_account_info(),
                    authority: ctx.accounts.signer.to_account_info(),
                },
            ),
            // Asset
            rfq.order_amount,
        )?;

        order.ask = ask;

        if rfq.best_ask_amount.is_none() || ask.unwrap() < rfq.best_ask_amount.unwrap() {
            rfq.best_ask_amount = ask;
            rfq.best_ask_address = Some(order.authority);
        }
    }

    if bid.is_some() {
        anchor_spl::token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::Transfer {
                    from: ctx.accounts.quote_wallet.to_account_info(),
                    to: ctx.accounts.quote_escrow.to_account_info(),
                    authority: ctx.accounts.signer.to_account_info(),
                },
            ),
            // Quote
            bid.unwrap(),
        )?;

        order.bid = bid;

        if rfq.best_bid_amount.is_none() || bid.unwrap() > rfq.best_bid_amount.unwrap() {
            rfq.best_bid_amount = bid;
            rfq.best_bid_address = Some(order.authority);
        }
    }

    Ok(())
}

/// Quote last look.
///
/// Optional: Maker confirmes if last look is set.
///
/// ctx Accounts context
#[access_control(last_look_access_control(&ctx))]
pub fn last_look(ctx: Context<LastLook>) -> Result<()> {
    let rfq = &mut ctx.accounts.rfq;
    rfq.approved = Some(true);

    Ok(())
}

/// Confirms quote.
///
/// Step 4: Taker confirms maker order.
///
/// ctx Accounts context
/// quote
#[access_control(confirm_access_control(&ctx, quote))]
pub fn confirm(ctx: Context<Confirm>, quote: Quote) -> Result<()> {
    let order = &mut ctx.accounts.order;
    order.confirmed_quote = Some(quote);

    let rfq = &mut ctx.accounts.rfq;

    let order_amount;
    let from;
    let to;

    match quote {
        Quote::Ask => {
            order.ask_confirmed = true;
            from = ctx.accounts.quote_wallet.to_account_info();
            to = ctx.accounts.quote_escrow.to_account_info();
            order_amount = rfq.best_ask_amount.unwrap();
        }
        Quote::Bid => {
            order.bid_confirmed = true;
            from = ctx.accounts.asset_wallet.to_account_info();
            to = ctx.accounts.asset_escrow.to_account_info();
            order_amount = rfq.order_amount;
        }
    };

    anchor_spl::token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            anchor_spl::token::Transfer {
                from,
                to,
                authority: ctx.accounts.signer.to_account_info(),
            },
        ),
        order_amount,
    )?;

    rfq.confirmed = true;

    Ok(())
}

/// Return quote.
///
/// Step 5: If order is unconfirmed, return maker collateral.
///
/// ctx Accounts context
#[access_control(return_collateral_access_control(&ctx))]
pub fn return_collateral(ctx: Context<ReturnCollateral>) -> Result<()> {
    let rfq = &ctx.accounts.rfq;
    let order = &mut ctx.accounts.order;

    if order.ask.is_some() && !order.ask_confirmed {
        anchor_spl::token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::Transfer {
                    from: ctx.accounts.asset_escrow.to_account_info(),
                    to: ctx.accounts.asset_wallet.to_account_info(),
                    authority: rfq.to_account_info(),
                },
                &[
                    &[
                        ASSET_ESCROW_SEED.as_bytes(),
                        rfq.id.to_string().as_bytes(),
                        &[rfq.asset_escrow_bump],
                    ][..],
                    &[
                        RFQ_SEED.as_bytes(),
                        rfq.id.to_string().as_bytes(),
                        &[rfq.bump],
                    ][..],
                ],
            ),
            rfq.order_amount,
        )?;
    }

    if order.bid.is_some() && !order.bid_confirmed {
        anchor_spl::token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::Transfer {
                    from: ctx.accounts.quote_escrow.to_account_info(),
                    to: ctx.accounts.quote_wallet.to_account_info(),
                    authority: rfq.to_account_info(),
                },
                &[
                    &[
                        QUOTE_ESCROW_SEED.as_bytes(),
                        rfq.id.to_string().as_bytes(),
                        &[rfq.quote_escrow_bump],
                    ][..],
                    &[
                        RFQ_SEED.as_bytes(),
                        rfq.id.to_string().as_bytes(),
                        &[rfq.bump],
                    ][..],
                ],
            ),
            order.bid.unwrap(),
        )?;
    }

    order.collateral_returned = true;

    Ok(())
}

// Settles RFQ.
//
// Step 6: Taker and maker receive asset or quote.
///
/// ctx Accounts context
#[access_control(settle_access_control(&ctx))]
pub fn settle(ctx: Context<Settle>) -> Result<()> {
    let protocol = &mut ctx.accounts.protocol;
    let order = &mut ctx.accounts.order;
    let rfq = &mut ctx.accounts.rfq;

    let signer = ctx.accounts.signer.key();
    let taker = rfq.authority.key();
    let maker = order.authority.key();

    let mut quote_amount = 0;
    let mut asset_amount = 0;
    let mut fee_amount = 0;

    match order.confirmed_quote.unwrap() {
        Quote::Ask => {
            if signer == taker {
                fee_amount = (rfq.order_amount as u128)
                    .checked_div(protocol.fee_denominator as u128)
                    .ok_or(ProtocolError::Math)?
                    .checked_mul(protocol.fee_numerator as u128)
                    .ok_or(ProtocolError::Math)?
                    .to_u64()
                    .ok_or(ProtocolError::Math)?;
                asset_amount = rfq
                    .order_amount
                    .checked_sub(fee_amount)
                    .ok_or(ProtocolError::Math)?;
            } else if signer == maker {
                quote_amount = rfq.best_ask_amount.unwrap();
            } else {
                return Err(error!(ProtocolError::InvalidAuthority));
            }
        }
        Quote::Bid => {
            if signer == taker {
                fee_amount = (rfq.best_bid_amount.unwrap() as u128)
                    .checked_div(protocol.fee_denominator as u128)
                    .ok_or(ProtocolError::Math)?
                    .checked_mul(protocol.fee_numerator as u128)
                    .ok_or(ProtocolError::Math)?
                    .to_u64()
                    .ok_or(ProtocolError::Math)?;
                quote_amount = rfq
                    .best_bid_amount
                    .unwrap()
                    .checked_sub(fee_amount)
                    .ok_or(ProtocolError::Math)?;
            } else if signer == maker {
                asset_amount = rfq.order_amount;
            } else {
                return Err(error!(ProtocolError::InvalidAuthority));
            }
        }
    }

    if asset_amount > 0 {
        anchor_spl::token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::Transfer {
                    from: ctx.accounts.asset_escrow.to_account_info(),
                    to: ctx.accounts.asset_wallet.to_account_info(),
                    authority: rfq.to_account_info(),
                },
                &[
                    &[
                        ASSET_ESCROW_SEED.as_bytes(),
                        rfq.id.to_string().as_bytes(),
                        &[rfq.asset_escrow_bump],
                    ][..],
                    &[
                        RFQ_SEED.as_bytes(),
                        rfq.id.to_string().as_bytes(),
                        &[rfq.bump],
                    ][..],
                ],
            ),
            asset_amount,
        )?;

        if fee_amount > 0 {
            msg!("ASSET");
            anchor_spl::token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    anchor_spl::token::Transfer {
                        from: ctx.accounts.asset_escrow.to_account_info(),
                        to: ctx.accounts.treasury_wallet.to_account_info(),
                        authority: rfq.to_account_info(),
                    },
                    &[
                        &[
                            ASSET_ESCROW_SEED.as_bytes(),
                            rfq.id.to_string().as_bytes(),
                            &[rfq.asset_escrow_bump],
                        ][..],
                        &[
                            RFQ_SEED.as_bytes(),
                            rfq.id.to_string().as_bytes(),
                            &[rfq.bump],
                        ][..],
                    ],
                ),
                fee_amount,
            )?;
        }
    }

    if quote_amount > 0 {
        anchor_spl::token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::Transfer {
                    from: ctx.accounts.quote_escrow.to_account_info(),
                    to: ctx.accounts.quote_wallet.to_account_info(),
                    authority: rfq.to_account_info(),
                },
                &[
                    &[
                        QUOTE_ESCROW_SEED.as_bytes(),
                        rfq.id.to_string().as_bytes(),
                        &[rfq.quote_escrow_bump],
                    ][..],
                    &[
                        RFQ_SEED.as_bytes(),
                        rfq.id.to_string().as_bytes(),
                        &[rfq.bump],
                    ][..],
                ],
            ),
            quote_amount,
        )?;

        if fee_amount > 0 {
            anchor_spl::token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    anchor_spl::token::Transfer {
                        from: ctx.accounts.quote_escrow.to_account_info(),
                        to: ctx.accounts.treasury_wallet.to_account_info(),
                        authority: rfq.to_account_info(),
                    },
                    &[
                        &[
                            QUOTE_ESCROW_SEED.as_bytes(),
                            rfq.id.to_string().as_bytes(),
                            &[rfq.quote_escrow_bump],
                        ][..],
                        &[
                            RFQ_SEED.as_bytes(),
                            rfq.id.to_string().as_bytes(),
                            &[rfq.bump],
                        ][..],
                    ],
                ),
                fee_amount,
            )?;
        }
    }

    if signer == taker {
        rfq.settled = true;
    }

    if signer == maker {
        order.settled = true;
    }

    // TODO: PsyOptions CPI integration if venue if multi-leg
    // check if option market exists
    // if no option market mint option market
    // initialize instrument.


    Ok(())
}


//initialize option market if not there
pub fn initialize_option_market<'a, 'b, 'c, 'info>(
    ctx: Context<'a, 'b, 'c, 'info, InitOptionMarket<'info>>,
    underlying_amount_per_contract: u64,
    quote_amount_per_contract: u64,
    expiration_unix_timestamp: i64,
    bump_seed: u8
) -> Result<()> {
    let cpi_program = ctx.accounts.psy_american_program.clone();
    let init_market_args = psy_american::instruction::InitializeMarket {
        underlying_amount_per_contract,
        quote_amount_per_contract,
        expiration_unix_timestamp,
        bump_seed
    };
    let mut cpi_accounts = vec![
        ctx.accounts.user.to_account_metas(Some(true))[0].clone(),
        // The Mint of the underlying asset for the contracts. Also the mint that is in the vault.
        ctx.accounts.underlying_asset_mint.to_account_metas(Some(false))[0].clone(),
        ctx.accounts.quote_asset_mint.to_account_metas(Some(false))[0].clone(),
        // The mint of the option
        ctx.accounts.option_mint.to_account_metas(Some(false))[0].clone(),
        // The Mint of the writer token for the OptionMarket
        ctx.accounts.writer_token_mint.to_account_metas(Some(false))[0].clone(),
        ctx.accounts.quote_asset_pool.to_account_metas(Some(false))[0].clone(),
        // The underlying asset pool for the OptionMarket
        ctx.accounts.underlying_asset_pool.to_account_metas(Some(false))[0].clone(),
        // The PsyOptions OptionMarket to mint from
        ctx.accounts.option_market.to_account_metas(Some(false))[0].clone(),
        // The fee_owner that is a constant in the PsyAmerican contract
        ctx.accounts.fee_owner.to_account_metas(Some(false))[0].clone(),
        // The rest are self explanatory, we can't spell everything out for you ;)
        ctx.accounts.token_program.to_account_metas(Some(false))[0].clone(),
        ctx.accounts.associated_token_program.to_account_metas(Some(false))[0].clone(),
        ctx.accounts.rent.to_account_metas(Some(false))[0].clone(),
        ctx.accounts.system_program.to_account_metas(Some(false))[0].clone(),
        ctx.accounts.clock.to_account_metas(Some(false))[0].clone(),
    ];
    // msg!("cpi_accounts {:?}", cpi_accounts);
    let mut account_infos = vec![
        ctx.accounts.user.to_account_info().clone(),
        ctx.accounts.underlying_asset_mint.to_account_info().clone(),
        ctx.accounts.quote_asset_mint.to_account_info().clone(),
        ctx.accounts.option_mint.to_account_info().clone(),
        ctx.accounts.writer_token_mint.to_account_info().clone(),
        ctx.accounts.quote_asset_pool.to_account_info().clone(),
        ctx.accounts.underlying_asset_pool.to_account_info().clone(),
        ctx.accounts.option_market.to_account_info().clone(),
        ctx.accounts.fee_owner.to_account_info().clone(),
        ctx.accounts.token_program.to_account_info().clone(),
        ctx.accounts.associated_token_program.to_account_info().clone(),
        ctx.accounts.rent.to_account_info().clone(),
        ctx.accounts.system_program.to_account_info().clone(),
        ctx.accounts.clock.to_account_info().clone(),
    ];
    for remaining_account in ctx.remaining_accounts {
        cpi_accounts.push(remaining_account.to_account_metas(Some(false))[0].clone());
        account_infos.push(remaining_account.clone());
    }

    let ix = solana_program::instruction::Instruction {
        program_id: *cpi_program.key,
        accounts: cpi_accounts,
        data: init_market_args.data()
    };

    anchor_lang::solana_program::program::invoke(&ix, &account_infos).map_err(|_x| ProtocolError::DexIxError.into())
}


// cpi function
pub fn mint<'a, 'b, 'c, 'info>(ctx: Context<'a, 'b, 'c, 'info, AmericanOption<'info>>, size: u64, vault_authority_bump: u8) -> Result<()> {
    let cpi_program = ctx.accounts.psy_american_program.clone();
    let cpi_accounts = MintOptionV2 {
        // The authority that has control over the underlying assets. In this case it's the 
        // vault authority set in _init_mint_vault_
        user_authority: ctx.accounts.pool_authority.to_account_info(),
        // The Mint of the underlying asset for the contracts. Also the mint that is in the vault.
        underlying_asset_mint: ctx.accounts.underlying_asset_mint.to_account_info(),
        // The underlying asset pool for the OptionMarket
        underlying_asset_pool: ctx.accounts.underlying_asset_pool.to_account_info(),
        // The source account where the underlying assets are coming from. In this case it's the vault.
        underlying_asset_src: ctx.accounts.pool.to_account_info(),
        // The mint of the option
        option_mint: ctx.accounts.option_mint.to_account_info(),
        // The destination for the minted options
        minted_option_dest: ctx.accounts.minted_option_dest.to_account_info(),
        // The Mint of the writer token for the OptionMarket
        writer_token_mint: ctx.accounts.writer_token_mint.to_account_info(),
        // The destination for the minted WriterTokens
        minted_writer_token_dest: ctx.accounts.minted_writer_token_dest.to_account_info(),
        // The PsyOptions OptionMarket to mint from
        option_market: ctx.accounts.option_market.to_account_info(),
        // The rest are self explanatory, we can't spell everything out for you ;)
        token_program: ctx.accounts.token_program.to_account_info(),
    };
    let key = ctx.accounts.underlying_asset_mint.key();

    let seeds = &[
        key.as_ref(),
        b"vaultAuthority",
        &[vault_authority_bump]
    ];
    let signer = &[&seeds[..]];
    let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
    psy_american::cpi::mint_option_v2(cpi_ctx, size)
}
