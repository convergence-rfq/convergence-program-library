import { BN } from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";
import { ASSET_ESCROW_SEED, ORDER_SEED, PROTOCOL_SEED, QUOTE_ESCROW_SEED, RFQ_SEED } from "../../lib/helpers";

export async function getProtocolPda(programId: PublicKey) {
  const [pda] = await PublicKey.findProgramAddress([Buffer.from(PROTOCOL_SEED)], programId);
  return pda;
}

export async function getRfqPda(
  programId: PublicKey,
  taker: PublicKey,
  assetMint: PublicKey,
  quoteMint: PublicKey,
  orderAmount: number,
  expiry: number
) {
  const [pda] = await PublicKey.findProgramAddress(
    [
      Buffer.from(RFQ_SEED),
      taker.toBuffer(),
      assetMint.toBuffer(),
      quoteMint.toBuffer(),
      new BN(orderAmount).toArrayLike(Buffer, "le", 8),
      new BN(expiry).toArrayLike(Buffer, "le", 8),
    ],
    programId
  );

  return pda;
}

export async function getAssetEscrowPda(programId: PublicKey, rfqPda: PublicKey) {
  const [pda] = await PublicKey.findProgramAddress([Buffer.from(ASSET_ESCROW_SEED), rfqPda.toBuffer()], programId);
  return pda;
}

export async function getQuoteEscrowPda(programId: PublicKey, rfqPda: PublicKey) {
  const [pda] = await PublicKey.findProgramAddress([Buffer.from(QUOTE_ESCROW_SEED), rfqPda.toBuffer()], programId);
  return pda;
}

export async function getOrderPda(programId: PublicKey, maker: PublicKey, rfqPda: PublicKey, bid: number, ask: number) {
  const [pda] = await PublicKey.findProgramAddress(
    [
      Buffer.from(ORDER_SEED),
      rfqPda.toBuffer(),
      maker.toBuffer(),
      new BN(bid ? bid : 0).toArrayLike(Buffer, "le", 8),
      new BN(ask ? ask : 0).toArrayLike(Buffer, "le", 8),
    ],
    programId
  );
  return pda;
}