import { BN, Program, web3 } from "@project-serum/anchor";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { EuroMeta, OptionType } from "../types";
import { EuroPrimitive } from "../euro_primitive";
import { pdas } from "..";

/**
 *
 * After the option's have expired writer token holders need to settle the writer tokens to unlock
 * their underlying collateral. This instruction will burn writer tokens and return the colletaral
 * less the pay out for the option holder.
 *
 * @param program - The Tokenized Euros anchor program
 * @param euroMetaKey - The address for the EuroMeta data
 * @param euroMeta - The deserialized EuroMeta data
 * @param collateralDestination - The TokenAccount where the payout will be sent
 * @param writerSource - The TokenAccount that holds the writer tokens to settle
 * @param amount - The amount of writer tokens to settle
 * @param optionType - CALL or PUT
 * @returns
 */
export const settleExpiredWritersInstruction = async (
  program: Program<EuroPrimitive>,
  euroMetaKey: web3.PublicKey,
  euroMeta: EuroMeta,
  collateralDestination: web3.PublicKey,
  writerSource: web3.PublicKey,
  amount: BN,
  optionType: OptionType
) => {
  const [poolAuthority] = await pdas.derivePoolAuthority(program);
  const instruction = program.instruction.settleExpiredWriters(
    amount,
    optionType,
    {
      accounts: {
        payer: program.provider.publicKey,
        poolAuthority,
        euroMeta: euroMetaKey,
        expirationData: euroMeta.expirationData,
        writerMint:
          optionType === OptionType.CALL
            ? euroMeta.callWriterMint
            : euroMeta.putWriterMint,
        collateralMint:
          optionType === OptionType.CALL
            ? euroMeta.underlyingMint
            : euroMeta.stableMint,
        collateralPool:
          optionType === OptionType.CALL
            ? euroMeta.underlyingPool
            : euroMeta.stablePool,
        writerSource,
        collateralDestination,

        tokenProgram: TOKEN_PROGRAM_ID,
      },
    }
  );

  return { instruction };
};
