import { BN, Program, web3 } from "@project-serum/anchor";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { EuroPrimitive } from "../euro_primitive";
import { pdas } from "../";

export const initExpirationData = async (
  program: Program<EuroPrimitive>,
  underlyingMint: web3.PublicKey,
  expiration: BN,
  oracleAddress: web3.PublicKey,
  priceDecimals: number,
  oracleProviderId: number = 0
) => {
  const [expirationData] = await pdas.deriveExpirationData(
    program,
    underlyingMint,
    expiration,
    oracleAddress,
    priceDecimals
  );
  const instruction = program.instruction.initExpirationData(expiration, priceDecimals, oracleProviderId, {
    accounts: {
      payer: program.provider.publicKey,
      expirationData,
      underlyingMint,
      oracle: oracleAddress,
      tokenProgram: TOKEN_PROGRAM_ID,
      rent: web3.SYSVAR_RENT_PUBKEY,
      systemProgram: web3.SystemProgram.programId,
    },
  });

  return { instruction };
};
