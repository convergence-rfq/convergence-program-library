import { BN, Program, web3 } from "@project-serum/anchor";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { EuroMeta, OptionType } from "../types";
import { EuroPrimitive } from "../euro_primitive";
import { pdas } from "..";

/**
 * After the option's have expired option holders need to settle the options to get their payoff.
 * This instruction will burn option tokens and return the cash payout in the underlying asset.
 *
 * @param program - The Tokenized Euros anchor program
 * @param euroMetaKey - The address for the EuroMeta data
 * @param euroMeta - The deserialized EuroMeta data
 * @param collateralDestination - The TokenAccount where the payout will be sent
 * @param optionSource - The TokenAccount that holds the options to burn
 * @param amount - The amount of options to settle
 * @param optionType - CALL or PUT
 * @returns
 */
export const settleExpiredOptionsInstruction = async (
  program: Program<EuroPrimitive>,
  euroMetaKey: web3.PublicKey,
  euroMeta: EuroMeta,
  collateralDestination: web3.PublicKey,
  optionSource: web3.PublicKey,
  amount: BN,
  optionType: OptionType
) => {
  const [poolAuthority] = await pdas.derivePoolAuthority(program);
  const instruction = program.instruction.settleExpiredOptions(amount, optionType, {
    accounts: {
      payer: program.provider.publicKey,
      poolAuthority,
      euroMeta: euroMetaKey,
      expirationData: euroMeta.expirationData,
      optionMint: optionType === OptionType.CALL ? euroMeta.callOptionMint : euroMeta.putOptionMint,
      collateralMint: optionType === OptionType.CALL ? euroMeta.underlyingMint : euroMeta.stableMint,
      collateralPool: optionType === OptionType.CALL ? euroMeta.underlyingPool : euroMeta.stablePool,
      optionSource,
      collateralDestination,

      tokenProgram: TOKEN_PROGRAM_ID,
    },
  });

  return { instruction };
};
