import { PublicKey } from "@solana/web3.js";
import {
  COLLATERAL_SEED,
  COLLATERAL_TOKEN_SEED,
  PROTOCOL_SEED,
  QUOTE_ESCROW_SEED,
  INSTRUMENT_ESCROW_SEED,
} from "./constants";

export async function getProtocolPda(programId: PublicKey) {
  const [pda] = await PublicKey.findProgramAddress([Buffer.from(PROTOCOL_SEED)], programId);
  return pda;
}

export async function getCollateralTokenPda(user: PublicKey, programId: PublicKey) {
  const [pda] = await PublicKey.findProgramAddress([Buffer.from(COLLATERAL_TOKEN_SEED), user.toBuffer()], programId);
  return pda;
}

export async function getCollateralInfoPda(user: PublicKey, programId: PublicKey) {
  const [pda] = await PublicKey.findProgramAddress([Buffer.from(COLLATERAL_SEED), user.toBuffer()], programId);
  return pda;
}

export async function getQuoteEscrowPda(response: PublicKey, programId: PublicKey) {
  const [pda] = await PublicKey.findProgramAddress([Buffer.from(QUOTE_ESCROW_SEED), response.toBuffer()], programId);
  return pda;
}

export async function getInstrumentEscrowPda(response: PublicKey, legIndex: number, programId: PublicKey) {
  const [pda] = await PublicKey.findProgramAddress(
    [Buffer.from(INSTRUMENT_ESCROW_SEED), response.toBuffer(), Buffer.from([legIndex])],
    programId
  );
  return pda;
}

export async function getPsyoptionsAmericanEscrowPda(response: PublicKey, legIndex: number, programId: PublicKey) {
  const [pda] = await PublicKey.findProgramAddress(
    [Buffer.from(INSTRUMENT_ESCROW_SEED), response.toBuffer(), Buffer.from([legIndex])],
    programId
  );
  return pda;
}
