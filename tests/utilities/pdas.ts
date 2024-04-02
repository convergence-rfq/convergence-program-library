import { Program, BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { Rfq as RfqIdl } from "../../target/types/rfq";
import {
  BASE_ASSET_INFO_SEED,
  COLLATERAL_SEED,
  COLLATERAL_TOKEN_SEED,
  INSTRUMENT_ESCROW_SEED,
  MINT_INFO_SEED,
  PROTOCOL_SEED,
  QUOTE_ESCROW_SEED,
  RESPONSE_SEED,
  RFQ_SEED,
} from "./constants";
import { toLittleEndian } from "./helpers";
import { AssetIdentifier, assetIdentifierToSeedBytes, FixedSize, OrderType, QuoteData } from "./types";
import { sha256 } from "@noble/hashes/sha256";

export function getProtocolPda(programId: PublicKey) {
  const [pda] = PublicKey.findProgramAddressSync([Buffer.from(PROTOCOL_SEED)], programId);
  return pda;
}

export function getRfqPda(
  taker: PublicKey,
  legsHash: Uint8Array,
  printTradeProvider: PublicKey | null,
  orderType: OrderType,
  quoteData: QuoteData,
  fixedSize: FixedSize,
  activeWindow: number,
  settlingWindow: number,
  currentTimestamp: BN,
  program: Program<RfqIdl>
) {
  const orderTypeBuffer = program.coder.types.encode("OrderType", orderType);
  const quoteAssetDataSerialized = program.coder.types.encode("QuoteAsset", quoteData);
  const hashedQuoteAsset = sha256(quoteAssetDataSerialized);
  const fixedSizeSerialized = program.coder.types.encode("FixedSize", fixedSize);
  const [pda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from(RFQ_SEED),
      taker.toBuffer(),
      legsHash,
      (printTradeProvider || PublicKey.default).toBuffer(),
      orderTypeBuffer,
      hashedQuoteAsset,
      fixedSizeSerialized,
      toLittleEndian(activeWindow, 4),
      toLittleEndian(settlingWindow, 4),
      currentTimestamp.toBuffer("le", 8),
    ],
    program.programId
  );
  return pda;
}

export function getResponsePda(
  rfq: PublicKey,
  maker: PublicKey,
  programId: PublicKey,
  bidBuffer: Buffer,
  askBuffer: Buffer,
  pdaDistinguisher: number
) {
  const [pda] = PublicKey.findProgramAddressSync(
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

export function getBaseAssetPda(index: number, programId: PublicKey) {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from(BASE_ASSET_INFO_SEED), toLittleEndian(index, 2)],
    programId
  );
  return pda;
}

export function getMintInfoPda(mintAddress: PublicKey, programId: PublicKey) {
  const [pda] = PublicKey.findProgramAddressSync([Buffer.from(MINT_INFO_SEED), mintAddress.toBuffer()], programId);
  return pda;
}

export function getCollateralTokenPda(user: PublicKey, programId: PublicKey) {
  const [pda] = PublicKey.findProgramAddressSync([Buffer.from(COLLATERAL_TOKEN_SEED), user.toBuffer()], programId);
  return pda;
}

export function getCollateralInfoPda(user: PublicKey, programId: PublicKey) {
  const [pda] = PublicKey.findProgramAddressSync([Buffer.from(COLLATERAL_SEED), user.toBuffer()], programId);
  return pda;
}

export function getQuoteEscrowPda(response: PublicKey, programId: PublicKey) {
  const [pda] = PublicKey.findProgramAddressSync([Buffer.from(QUOTE_ESCROW_SEED), response.toBuffer()], programId);
  return pda;
}

export function getInstrumentEscrowPda(response: PublicKey, assetIdentifier: AssetIdentifier, programId: PublicKey) {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from(INSTRUMENT_ESCROW_SEED), response.toBuffer(), assetIdentifierToSeedBytes(assetIdentifier)],
    programId
  );
  return pda;
}

export function getPsyoptionsAmericanEscrowPda(response: PublicKey, legIndex: number, programId: PublicKey) {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from(INSTRUMENT_ESCROW_SEED), response.toBuffer(), Buffer.from([legIndex])],
    programId
  );
  return pda;
}

export function getVaultOperatorPda(vaultParams: PublicKey, programId: PublicKey) {
  const [pda] = PublicKey.findProgramAddressSync([Buffer.from("operator"), vaultParams.toBuffer()], programId);
  return pda;
}
