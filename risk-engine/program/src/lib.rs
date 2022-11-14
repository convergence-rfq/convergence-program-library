use std::mem;

use anchor_lang::prelude::*;
use rfq::state::{
    AuthoritySide, FixedSize, Leg, OrderType, ProtocolState, Quote, Response, Rfq, Side,
};

use base_asset_extractor::extract_base_assets;
use errors::Error;
use fraction::Fraction;
use price_extractor::extract_prices;
use risk_calculator::RiskCalculator;
use scenarios::select_scenarious;
use state::Config;

pub mod base_asset_extractor;
pub mod errors;
pub mod fraction;
pub mod price_extractor;
pub mod risk_calculator;
pub mod scenarios;
pub mod state;

declare_id!("7VfhLs4yNYbpWzH1n1g8myKX4KGJnujoLMUnAqsr3wth");

pub const CONFIG_SEED: &str = "config";

#[program]
pub mod risk_engine {
    use super::*;

    pub fn initialize_config(
        ctx: Context<InitializeConfigAccounts>,
        collateral_for_variable_size_rfq_creation: u64,
        collateral_for_fixed_quote_amount_rfq_creation: u64,
        collateral_mint_decimals: u8,
        safety_price_shift_factor: Fraction,
        overall_safety_factor: Fraction,
    ) -> Result<()> {
        let config = &mut ctx.accounts.config;

        config.set_inner(Config {
            bump: *ctx.bumps.get("config").unwrap(),
            collateral_for_variable_size_rfq_creation,
            collateral_for_fixed_quote_amount_rfq_creation,
            collateral_mint_decimals,
            safety_price_shift_factor,
            overall_safety_factor,
        });

        Ok(())
    }

    pub fn update_config(
        ctx: Context<UpdateConfigAccounts>,
        collateral_for_variable_size_rfq_creation: Option<u64>,
        collateral_for_fixed_quote_amount_rfq_creation: Option<u64>,
        collateral_mint_decimals: Option<u8>,
        safety_price_shift_factor: Option<Fraction>,
        overall_safety_factor: Option<Fraction>,
    ) -> Result<()> {
        let config = &mut ctx.accounts.config;

        if let Some(value) = collateral_for_variable_size_rfq_creation {
            config.collateral_for_variable_size_rfq_creation = value;
        }

        if let Some(value) = collateral_for_fixed_quote_amount_rfq_creation {
            config.collateral_for_fixed_quote_amount_rfq_creation = value;
        }

        if let Some(value) = collateral_mint_decimals {
            config.collateral_mint_decimals = value;
        }

        if let Some(value) = safety_price_shift_factor {
            config.safety_price_shift_factor = value;
        }

        if let Some(value) = overall_safety_factor {
            config.overall_safety_factor = value;
        }

        Ok(())
    }

    pub fn calculate_collateral_for_rfq(
        mut ctx: Context<CalculateRequiredCollateralForRfq>,
    ) -> Result<u64> {
        let CalculateRequiredCollateralForRfq { rfq, config } = &ctx.accounts;

        let required_collateral = match rfq.fixed_size {
            FixedSize::None { padding: _ } => config.collateral_for_variable_size_rfq_creation,
            FixedSize::BaseAsset {
                legs_multiplier_bps,
            } => {
                let risk_calculator = construct_risk_calculator(
                    ctx.accounts.rfq.legs.clone(),
                    config,
                    &mut ctx.remaining_accounts,
                )?;
                let leg_multiplier = Fraction::new(
                    legs_multiplier_bps.into(),
                    Quote::LEG_MULTIPLIER_DECIMALS as u8,
                );

                let calculate_collateral = |side| {
                    risk_calculator.calculate_risk(leg_multiplier, AuthoritySide::Taker, side)
                };

                match rfq.order_type {
                    OrderType::Buy => calculate_collateral(Side::Ask)?,
                    OrderType::Sell => calculate_collateral(Side::Bid)?,
                    OrderType::TwoWay => u64::max(
                        calculate_collateral(Side::Bid)?,
                        calculate_collateral(Side::Ask)?,
                    ),
                }
            }
            FixedSize::QuoteAsset { quote_amount: _ } => {
                config.collateral_for_fixed_quote_amount_rfq_creation
            }
        };

        msg!(
            "Required collateral: {} with {} decimals",
            required_collateral,
            config.collateral_mint_decimals
        );

        Ok(required_collateral)
    }

    pub fn calculate_collateral_for_response(
        mut ctx: Context<CalculateRequiredCollateralForResponse>,
    ) -> Result<u64> {
        let CalculateRequiredCollateralForResponse {
            rfq,
            response,
            config,
        } = ctx.accounts;

        let risk_calculator =
            construct_risk_calculator(rfq.legs.clone(), config, &mut ctx.remaining_accounts)?;

        let get_collateral_for_quote = |quote, side| {
            let legs_multiplier_bps = response.calculate_legs_multiplier_bps_for_quote(rfq, quote);
            risk_calculator.calculate_risk(
                Fraction::new(
                    legs_multiplier_bps.into(),
                    Quote::LEG_MULTIPLIER_DECIMALS as u8,
                ),
                AuthoritySide::Maker,
                side,
            )
        };

        let mut collateral = if let Some(quote) = response.bid {
            get_collateral_for_quote(quote, Side::Bid)?
        } else {
            0
        };

        if let Some(quote) = response.ask {
            collateral = u64::max(collateral, get_collateral_for_quote(quote, Side::Ask)?);
        }

        msg!(
            "Required collateral: {} with {} decimals",
            collateral,
            config.collateral_mint_decimals
        );

        Ok(collateral)
    }

    pub fn calculate_collateral_for_confirmation(
        mut ctx: Context<CalculateRequiredCollateralForConfirmation>,
    ) -> Result<(u64, u64)> {
        let CalculateRequiredCollateralForConfirmation {
            rfq,
            response,
            config,
        } = ctx.accounts;

        let risk_calculator =
            construct_risk_calculator(rfq.legs.clone(), config, &mut ctx.remaining_accounts)?;

        let legs_multiplier_bps = response.calculate_confirmed_legs_multiplier_bps(rfq);
        let legs_multiplier = Fraction::new(
            legs_multiplier_bps.into(),
            Quote::LEG_MULTIPLIER_DECIMALS as u8,
        );
        let confirmed_side = response.confirmed.unwrap().side;

        let taker_collateral = risk_calculator.calculate_risk(
            legs_multiplier.clone(),
            AuthoritySide::Taker,
            confirmed_side,
        )?;
        let maker_collateral = risk_calculator.calculate_risk(
            legs_multiplier,
            AuthoritySide::Maker,
            confirmed_side,
        )?;

        msg!(
            "Required collateral, taker: {}, maker: {}. With {} decimals",
            taker_collateral,
            maker_collateral,
            config.collateral_mint_decimals
        );

        Ok((taker_collateral, maker_collateral))
    }
}

fn construct_risk_calculator<'a>(
    legs: Vec<Leg>,
    config: &'a Config,
    remaining_accounts: &mut &[AccountInfo],
) -> Result<RiskCalculator<'a>> {
    let base_assets = extract_base_assets(&legs, remaining_accounts)?;
    let prices = extract_prices(&base_assets, remaining_accounts)?;
    Ok(RiskCalculator {
        legs,
        config,
        base_assets,
        prices,
        scenarios_selector: &select_scenarious,
    })
}

#[derive(Accounts)]
pub struct InitializeConfigAccounts<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(
        init,
        payer = signer,
        seeds = [CONFIG_SEED.as_bytes()],
        space = mem::size_of::<Config>(),
        bump
    )]
    pub config: Account<'info, Config>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateConfigAccounts<'info> {
    #[account(constraint = protocol.authority == authority.key() @ Error::NotAProtocolAuthority)]
    pub authority: Signer<'info>,
    pub protocol: Account<'info, ProtocolState>,
    #[account(mut, seeds = [CONFIG_SEED.as_bytes()], bump = config.bump)]
    pub config: Account<'info, Config>,
}

#[derive(Accounts)]
pub struct CalculateRequiredCollateralForRfq<'info> {
    pub rfq: Box<Account<'info, Rfq>>,
    #[account(seeds = [CONFIG_SEED.as_bytes()], bump = config.bump)]
    pub config: Account<'info, Config>,
}

#[derive(Accounts)]
pub struct CalculateRequiredCollateralForResponse<'info> {
    pub rfq: Box<Account<'info, Rfq>>,
    pub response: Account<'info, Response>,
    #[account(seeds = [CONFIG_SEED.as_bytes()], bump = config.bump)]
    pub config: Account<'info, Config>,
}

#[derive(Accounts)]
pub struct CalculateRequiredCollateralForConfirmation<'info> {
    pub rfq: Box<Account<'info, Rfq>>,
    pub response: Account<'info, Response>,
    #[account(seeds = [CONFIG_SEED.as_bytes()], bump = config.bump)]
    pub config: Account<'info, Config>,
}
