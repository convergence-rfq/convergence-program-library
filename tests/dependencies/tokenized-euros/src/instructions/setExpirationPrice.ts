import { Program, web3 } from "@project-serum/anchor";
import { ExpirationData } from "../types";
import { EuroPrimitive } from "../euro_primitive";

/**
 *
 * Instruction that sets the ExpirationData and locks in the eindex price of
 * an underlying asset for a given expiration date.
 *
 * @param program
 * @param expirationDataKey
 * @param expirationData
 * @returns
 */
export const setExpirationPriceInstruction = (
  program: Program<EuroPrimitive>,
  expirationDataKey: web3.PublicKey,
  expirationData: ExpirationData
) => {
  const instruction = program.instruction.setExpirationPrice({
    accounts: {
      payer: program.provider.publicKey,
      expirationData: expirationDataKey,
      priceOracle: expirationData.oracle,
    },
  });
  return { instruction };
};
