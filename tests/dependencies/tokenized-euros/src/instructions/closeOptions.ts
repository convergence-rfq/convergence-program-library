import { BN, Program, web3 } from "@project-serum/anchor";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { EuroMeta, OptionType } from "../types";
import { EuroPrimitive } from "../euro_primitive";
import { pdas } from "..";

/**
 * Close options by burning a option and writer tokens. This instruction can be used
 * to retrieve the underlying from the option before or after expiration.
 *
 * @param program - Tokenized Euros anchor Program
 * @param euroMetaKey - address for the EuroMeta data structure
 * @param euroMeta - The deserialized EuroMeta data
 * @param collateralDestination - Where the underlying collateral of the option should be returned
 * @param optionSource - The TokenAccount that holds the option tokens
 * @param writerSource - The TokenAccount that holds the writer tokens
 * @param amount - The amount of options to close
 * @param optionType - Whether the option is a CALL or a PUT.
 * @returns
 */
export const closeOptionsInstruction = async (
  program: Program<EuroPrimitive>,
  euroMetaKey: web3.PublicKey,
  euroMeta: EuroMeta,
  collateralDestination: web3.PublicKey,
  optionSource: web3.PublicKey,
  writerSource: web3.PublicKey,
  amount: BN,
  optionType: OptionType
) => {
  const [poolAuthority] = await pdas.derivePoolAuthority(program);
  const instruction = program.instruction.closeOptions(amount, optionType, {
    accounts: {
      payer: program.provider.publicKey,
      euroMeta: euroMetaKey,
      poolAuthority,
      optionMint: optionType === OptionType.CALL ? euroMeta.callOptionMint : euroMeta.putOptionMint,
      writerMint: optionType === OptionType.CALL ? euroMeta.callWriterMint : euroMeta.putWriterMint,
      collateralPool: optionType === OptionType.CALL ? euroMeta.underlyingPool : euroMeta.stablePool,
      optionSource,
      writerSource,
      collateralDestination,

      tokenProgram: TOKEN_PROGRAM_ID,
    },
  });

  return { instruction };
};
