use anchor_lang::prelude::*;
use rfq::state::{
    AuthoritySide, FixedSize, Leg, OrderType, ProtocolState, Quote, Response, Rfq, Side,
};

use base_asset_extractor::extract_base_assets;
use errors::Error;
use fraction::Fraction;
use price_extractor::extract_prices;
use risk_calculator::RiskCalculator;
use scenarios::ScenarioSelector;
use state::{Config, InstrumentInfo, InstrumentType, RiskCategoryInfo};

pub mod base_asset_extractor;
pub mod black_scholes;
pub mod errors;
pub mod fraction;
pub mod price_extractor;
pub mod risk_calculator;
pub mod scenarios;
pub mod state;

declare_id!("76TdqS9cEb8tYKUWKMzXBMwgCtXJiYMcrHxmzrYthjUm");

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
        let mut config = ctx.accounts.config.load_init()?;

        config.collateral_for_variable_size_rfq_creation =
            collateral_for_variable_size_rfq_creation;
        config.collateral_for_fixed_quote_amount_rfq_creation =
            collateral_for_fixed_quote_amount_rfq_creation;
        config.collateral_mint_decimals = collateral_mint_decimals;
        config.safety_price_shift_factor = safety_price_shift_factor;
        config.overall_safety_factor = overall_safety_factor;

        Ok(())
    }

    // used only for passing data in the set_risk_category_info instruction
    #[derive(AnchorSerialize, AnchorDeserialize)]
    pub struct RiskCategoryChange {
        risk_category_index: u8,
        new_value: RiskCategoryInfo,
    }

    // risk categories size is too large to fully fit in one transaction, so this instruction is used to set them partially
    pub fn set_risk_categories_info(
        ctx: Context<SetRiskCategoryInfo>,
        changes: Vec<RiskCategoryChange>,
    ) -> Result<()> {
        let mut config = ctx.accounts.config.load_mut()?;

        for change in changes.into_iter() {
            config.risk_categories_info[change.risk_category_index as usize] = change.new_value;
        }

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
        let mut config = ctx.accounts.config.load_mut()?;

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

    pub fn set_instrument_type(
        ctx: Context<SetInstrumentTypeAccounts>,
        instrument_program: Pubkey,
        instrument_type: Option<InstrumentType>,
    ) -> Result<()> {
        let SetInstrumentTypeAccounts {
            protocol, config, ..
        } = ctx.accounts;
        let mut config = config.load_mut()?;

        let types_list = &mut config.instrument_types;
        let index_in_list = types_list
            .iter()
            .position(|x| x.program == instrument_program);
        let exists_in_protocol = protocol
            .instruments
            .iter()
            .any(|x| x.program_key == instrument_program);

        if let Some(instrument_type) = instrument_type {
            let instrument_info = InstrumentInfo {
                program: instrument_program,
                r#type: instrument_type,
            };

            if let Some(index_in_list) = index_in_list {
                require!(exists_in_protocol, Error::CannotChangeInstrument);

                types_list[index_in_list] = instrument_info;
                msg!(
                    "{} instrument type is changed to {:?}",
                    instrument_program,
                    instrument_type
                );
            } else {
                let empty_element_index = types_list.iter().position(|x| !x.is_initialized());

                require!(
                    exists_in_protocol && empty_element_index.is_some(),
                    Error::CannotAddInstrument
                );

                types_list[empty_element_index.unwrap()] = instrument_info;
                msg!(
                    "{} instrument type is set to {:?}",
                    instrument_program,
                    instrument_type
                );
            }
        } else {
            require!(
                index_in_list.is_some() && !exists_in_protocol,
                Error::CannotRemoveInstrument
            );

            types_list[index_in_list.unwrap()] = Default::default();
            msg!("{} instrument type is removed", instrument_program);
        }

        Ok(())
    }

    pub fn calculate_collateral_for_rfq(
        mut ctx: Context<CalculateRequiredCollateralForRfq>,
    ) -> Result<u64> {
        let CalculateRequiredCollateralForRfq { rfq, config } = &ctx.accounts;
        let config = config.load()?;

        let required_collateral = match rfq.fixed_size {
            FixedSize::None { padding: _ } => config.collateral_for_variable_size_rfq_creation,
            FixedSize::BaseAsset {
                legs_multiplier_bps,
            } => {
                let risk_calculator = construct_risk_calculator(
                    &ctx.accounts.rfq,
                    &config,
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
        let config = config.load()?;

        let risk_calculator = construct_risk_calculator(rfq, &config, &mut ctx.remaining_accounts)?;

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
        let config = config.load()?;

        let risk_calculator = construct_risk_calculator(rfq, &config, &mut ctx.remaining_accounts)?;

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

#[derive(Clone)]
pub struct LegWithMetadata<'a> {
    leg: &'a Leg,
    instrument_type: InstrumentType,
}

fn construct_risk_calculator<'a>(
    rfq: &'a Rfq,
    config: &'a Config,
    remaining_accounts: &mut &[AccountInfo],
) -> Result<RiskCalculator<'a>> {
    let base_assets = extract_base_assets(&rfq.legs, remaining_accounts)?;
    let prices = extract_prices(&base_assets, remaining_accounts)?;
    let instrument_types = config.get_instrument_types_map();
    let current_timestamp = Clock::get()?.unix_timestamp;
    let scenarios_selector = ScenarioSelector {
        config,
        settlement_period: rfq.settling_window,
    };
    let legs_with_meta = rfq
        .legs
        .iter()
        .map(|leg| -> Result<LegWithMetadata> {
            let instrument_type = instrument_types
                .get(&leg.instrument_program)
                .ok_or_else(|| error!(Error::MissingInstrument))?
                .clone();
            Ok(LegWithMetadata {
                leg: &leg,
                instrument_type,
            })
        })
        .collect::<Result<Vec<_>>>()?;

    Ok(RiskCalculator {
        legs_with_meta,
        config,
        base_assets,
        prices,
        scenarios_selector: Box::new(move |legs, risk_category| {
            scenarios_selector.select_scenarious(legs, risk_category)
        }),
        current_timestamp,
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
        space = Config::get_allocated_size(),
        bump
    )]
    pub config: AccountLoader<'info, Config>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SetRiskCategoryInfo<'info> {
    #[account(constraint = protocol.authority == authority.key() @ Error::NotAProtocolAuthority)]
    pub authority: Signer<'info>,
    pub protocol: Account<'info, ProtocolState>,
    #[account(mut, seeds = [CONFIG_SEED.as_bytes()], bump)]
    pub config: AccountLoader<'info, Config>,
}

#[derive(Accounts)]
pub struct UpdateConfigAccounts<'info> {
    #[account(constraint = protocol.authority == authority.key() @ Error::NotAProtocolAuthority)]
    pub authority: Signer<'info>,
    pub protocol: Account<'info, ProtocolState>,
    #[account(mut, seeds = [CONFIG_SEED.as_bytes()], bump)]
    pub config: AccountLoader<'info, Config>,
}

#[derive(Accounts)]
pub struct SetInstrumentTypeAccounts<'info> {
    #[account(constraint = protocol.authority == authority.key() @ Error::NotAProtocolAuthority)]
    pub authority: Signer<'info>,
    pub protocol: Account<'info, ProtocolState>,
    #[account(mut, seeds = [CONFIG_SEED.as_bytes()], bump)]
    pub config: AccountLoader<'info, Config>,
}

#[derive(Accounts)]
pub struct CalculateRequiredCollateralForRfq<'info> {
    pub rfq: Box<Account<'info, Rfq>>,
    #[account(seeds = [CONFIG_SEED.as_bytes()], bump)]
    pub config: AccountLoader<'info, Config>,
}

#[derive(Accounts)]
pub struct CalculateRequiredCollateralForResponse<'info> {
    pub rfq: Box<Account<'info, Rfq>>,
    pub response: Account<'info, Response>,
    #[account(seeds = [CONFIG_SEED.as_bytes()], bump)]
    pub config: AccountLoader<'info, Config>,
}

#[derive(Accounts)]
pub struct CalculateRequiredCollateralForConfirmation<'info> {
    pub rfq: Box<Account<'info, Rfq>>,
    pub response: Account<'info, Response>,
    #[account(seeds = [CONFIG_SEED.as_bytes()], bump)]
    pub config: AccountLoader<'info, Config>,
}
