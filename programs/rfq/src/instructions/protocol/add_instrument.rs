use crate::{
    constants::PROTOCOL_SEED,
    errors::ProtocolError,
    states::{InstrumentParameters, ProtocolState},
};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct AddInstrumentAccounts<'info> {
    #[account(constraint = protocol.authority == authority.key() @ ProtocolError::NotAProtocolAuthority)]
    pub authority: Signer<'info>,
    #[account(mut, seeds = [PROTOCOL_SEED.as_bytes()], bump = protocol.bump)]
    pub protocol: Account<'info, ProtocolState>,
    /// CHECK: is a valid instrument program id
    #[account(executable)]
    pub instrument: UncheckedAccount<'info>,
}

fn validate(ctx: &Context<AddInstrumentAccounts>) -> Result<()> {
    let AddInstrumentAccounts {
        protocol,
        instrument,
        ..
    } = &ctx.accounts;

    require!(
        !protocol.instruments.contains_key(&instrument.key()),
        ProtocolError::InstrumentAlreadyAdded
    );

    Ok(())
}

pub fn add_instrument_instruction(
    ctx: Context<AddInstrumentAccounts>,
    parameters: InstrumentParameters,
) -> Result<()> {
    validate(&ctx)?;

    let AddInstrumentAccounts {
        protocol,
        instrument,
        ..
    } = ctx.accounts;

    protocol.instruments.insert(instrument.key(), parameters);

    Ok(())
}
