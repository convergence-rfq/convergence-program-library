use crate::{
    constants::PROTOCOL_SEED,
    errors::ProtocolError,
    states::{Instrument, ProtocolState},
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
    pub instrument_program: UncheckedAccount<'info>,
}

fn validate(ctx: &Context<AddInstrumentAccounts>) -> Result<()> {
    let AddInstrumentAccounts {
        protocol,
        instrument_program,
        ..
    } = &ctx.accounts;

    require!(
        protocol
            .instruments
            .iter()
            .find(|x| x.program_key == instrument_program.key())
            .is_none(),
        ProtocolError::InstrumentAlreadyAdded
    );

    Ok(())
}

pub fn add_instrument_instruction(
    ctx: Context<AddInstrumentAccounts>,
    validate_data_account_amount: u8,
    prepare_to_settle_account_amount: u8,
    settle_account_amount: u8,
    revert_preparation_account_amount: u8,
    clean_up_account_amount: u8,
) -> Result<()> {
    validate(&ctx)?;

    let AddInstrumentAccounts {
        protocol,
        instrument_program,
        ..
    } = ctx.accounts;

    protocol.instruments.push(Instrument {
        program_key: instrument_program.key(),
        validate_data_account_amount,
        prepare_to_settle_account_amount,
        settle_account_amount,
        revert_preparation_account_amount,
        clean_up_account_amount,
    });

    Ok(())
}