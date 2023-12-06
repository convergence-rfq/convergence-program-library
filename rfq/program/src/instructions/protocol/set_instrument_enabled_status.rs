use crate::{
    errors::ProtocolError,
    seeds::PROTOCOL_SEED,
    state::{Instrument, ProtocolState},
};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct SetInstrumentEnabledStatusAccounts<'info> {
    #[account(constraint = protocol.authority == authority.key() @ ProtocolError::NotAProtocolAuthority)]
    pub authority: Signer<'info>,
    #[account(mut, seeds = [PROTOCOL_SEED.as_bytes()], bump = protocol.bump)]
    pub protocol: Box<Account<'info, ProtocolState>>,
}

fn validate(instrument: &Instrument, enabled_status_to_set: bool) -> Result<()> {
    require!(
        instrument.enabled != enabled_status_to_set,
        ProtocolError::AlreadyHasAStatusToSet
    );

    Ok(())
}

pub fn set_instrument_enabled_status_instruction(
    ctx: Context<SetInstrumentEnabledStatusAccounts>,
    instrument_key: Pubkey,
    enabled_status_to_set: bool,
) -> Result<()> {
    let SetInstrumentEnabledStatusAccounts { protocol, .. } = ctx.accounts;
    let instrument = protocol.get_instrument_parameters_mut(instrument_key)?;

    validate(instrument, enabled_status_to_set)?;

    instrument.enabled = enabled_status_to_set;

    Ok(())
}
