import { Program, BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { Rfq as RfqIdl } from "../../target/types/rfq";
import { LEG_ESCROW_SEED, PROTOCOL_SEED, QUOTE_ESCROW_SEED, RESPONSE_SEED, RFQ_SEED } from "./constants";
import { toLittleEndian } from "./helpers";
import { FixedSize, OrderType } from "./types";
import { Mint } from "./wrappers";

export async function getProtocolPda(programId: PublicKey) {
  const [pda] = await PublicKey.findProgramAddress([Buffer.from(PROTOCOL_SEED)], programId);
  return pda;
}

export function getRfqPda(
  taker: PublicKey,
  orderType: OrderType,
  fixedSize: FixedSize,
  legMint: Mint,
  quoteMint: Mint,
  activeWindow: number,
  currentTimestamp: BN,
  program: Program<RfqIdl>
) {
  const orderTypeBuffer = program.coder.types.encode("OrderType", orderType);
  const fixedSizeSerialized = program.coder.types.encode("FixedSize", fixedSize);

  const [pda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from(RFQ_SEED),
      taker.toBuffer(),
      orderTypeBuffer,
      fixedSizeSerialized,
      legMint.publicKey.toBuffer(),
      quoteMint.publicKey.toBuffer(),
      toLittleEndian(activeWindow, 4),
      currentTimestamp.toBuffer("le", 8),
    ],
    program.programId
  );
  return pda;
}

export async function getResponsePda(
  rfq: PublicKey,
  maker: PublicKey,
  programId: PublicKey,
  bidBuffer: Buffer,
  askBuffer: Buffer,
  pdaDistinguisher: number
) {
  const [pda] = await PublicKey.findProgramAddress(
    [
      Buffer.from(RESPONSE_SEED),
      rfq.toBuffer(),
      maker.toBuffer(),
      bidBuffer,
      askBuffer,
      toLittleEndian(pdaDistinguisher, 2),
    ],
    programId
  );
  return pda;
}

export function getLegEscrowPda(response: PublicKey, programId: PublicKey) {
  const [pda] = PublicKey.findProgramAddressSync([Buffer.from(LEG_ESCROW_SEED), response.toBuffer()], programId);
  return pda;
}

export function getQuoteEscrowPda(response: PublicKey, programId: PublicKey) {
  const [pda] = PublicKey.findProgramAddressSync([Buffer.from(QUOTE_ESCROW_SEED), response.toBuffer()], programId);
  return pda;
}
