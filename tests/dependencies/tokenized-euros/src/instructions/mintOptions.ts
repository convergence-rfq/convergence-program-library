import { BN, Program, web3 } from "@project-serum/anchor";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { EuroMeta, OptionType } from "../types";
import { EuroPrimitive } from "../euro_primitive";

/**
 *
 * Generate an instruction to take collateral and mint options.
 *
 * @param program - The Tokenized Euros anchor program
 * @param euroMetaKey - The address for the EuroMeta data
 * @param euroMeta - The deserialized EuroMeta data
 * @param minterCollateralKey - The address of the TokenAccount that holds the collateral for the option
 * @param optionDestination - The address of the TokenAccount where minted option tokens will be transferred to.
 * @param writerDestination - The address of the TokenAccount where minted writer tokens will be transferred to.
 * @param amount - The amount of options to mint
 * @param optionType - CALL or PUT options
 * @returns
 */
export const mintOptions = (
  program: Program<EuroPrimitive>,
  euroMetaKey: web3.PublicKey,
  euroMeta: EuroMeta,
  minterCollateralKey: web3.PublicKey,
  optionDestination: web3.PublicKey,
  writerDestination: web3.PublicKey,
  amount: BN,
  optionType: OptionType
) => {
  const instruction = program.instruction.mintOptions(amount, optionType, {
    accounts: {
      payer: program.provider.publicKey,
      euroMeta: euroMetaKey,
      collateralPool:
        optionType === OptionType.CALL
          ? euroMeta.underlyingPool
          : euroMeta.stablePool,
      optionMint:
        optionType === OptionType.CALL
          ? euroMeta.callOptionMint
          : euroMeta.putOptionMint,
      writerMint:
        optionType === OptionType.CALL
          ? euroMeta.callWriterMint
          : euroMeta.putWriterMint,
      minterCollateral: minterCollateralKey,
      optionDestination,
      writerDestination,

      tokenProgram: TOKEN_PROGRAM_ID,
    },
  });

  return { instruction };
};
