import { Program, web3 } from "@project-serum/anchor";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { EuroPrimitive } from "../euro_primitive";
import { pdas } from "../";

export const initializeUnderlyingPoolIx = (
  program: Program<EuroPrimitive>,
  underlyingMint: web3.PublicKey,
  poolAuthority: web3.PublicKey,
  underlyingPool: web3.PublicKey
) => {
  return program.instruction.initializeUnderlyingPool({
    accounts: {
      payer: program.provider.publicKey,
      underlyingMint,
      underlyingPool,
      poolAuthority,

      tokenProgram: TOKEN_PROGRAM_ID,
      rent: web3.SYSVAR_RENT_PUBKEY,
      systemProgram: web3.SystemProgram.programId,
    },
  });
};

export const initializeUnderlyingPool = async (program: Program<EuroPrimitive>, underlyingMint: web3.PublicKey) => {
  const [poolAuthority] = await pdas.derivePoolAuthority(program);
  const [underlyingPool] = await pdas.deriveUnderlyingPoolKey(program, underlyingMint);
  const instruction = initializeUnderlyingPoolIx(program, underlyingMint, poolAuthority, underlyingPool);

  return { instruction };
};
