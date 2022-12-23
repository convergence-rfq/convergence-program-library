use crate::{
    errors::ProtocolError,
    seeds::PROTOCOL_SEED,
    state::{PrintTradeProvider, ProtocolState},
};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct AddPrintTradeProviderAccounts<'info> {
    #[account(constraint = protocol.authority == authority.key() @ ProtocolError::NotAProtocolAuthority)]
    pub authority: Signer<'info>,
    #[account(mut, seeds = [PROTOCOL_SEED.as_bytes()], bump = protocol.bump)]
    pub protocol: Account<'info, ProtocolState>,
    /// CHECK: is a valid instrument program id
    #[account(executable)]
    pub print_trade_provider_program: UncheckedAccount<'info>,
}

fn validate(ctx: &Context<AddPrintTradeProviderAccounts>) -> Result<()> {
    let AddPrintTradeProviderAccounts {
        protocol,
        print_trade_provider_program,
        ..
    } = &ctx.accounts;

    require!(
        protocol
            .print_trade_providers
            .iter()
            .find(|x| x.program_key == print_trade_provider_program.key())
            .is_none(),
        ProtocolError::AlreadyAdded
    );

    require!(
        protocol.print_trade_providers.len() < ProtocolState::MAX_PRINT_TRADE_PROVIDERS,
        ProtocolError::CannotAddBecauseOfMaxAmountLimit
    );

    Ok(())
}

pub fn add_print_trade_provider_instruction(
    ctx: Context<AddPrintTradeProviderAccounts>,
    validate_data_accounts: u8,
) -> Result<()> {
    validate(&ctx)?;

    let AddPrintTradeProviderAccounts {
        protocol,
        print_trade_provider_program: instrument_program,
        ..
    } = ctx.accounts;

    protocol.print_trade_providers.push(PrintTradeProvider {
        program_key: instrument_program.key(),
        validate_data_accounts,
    });

    Ok(())
}
