import { Program, web3 } from "@project-serum/anchor";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { EuroPrimitive } from "../euro_primitive";
import { pdas } from "../";

export const initializeStablePool = async (program: Program<EuroPrimitive>, stableMint: web3.PublicKey) => {
  const [poolAuthority] = await pdas.derivePoolAuthority(program);
  const [stablePool] = await pdas.deriveStablePoolKey(program, stableMint);
  const instruction = program.instruction.initializeStablePool({
    accounts: {
      payer: program.provider.publicKey,
      stableMint,
      stablePool,
      poolAuthority,

      tokenProgram: TOKEN_PROGRAM_ID,
      rent: web3.SYSVAR_RENT_PUBKEY,
      systemProgram: web3.SystemProgram.programId,
    },
  });

  return { instruction };
};
