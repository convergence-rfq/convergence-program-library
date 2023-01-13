import * as anchor from "@project-serum/anchor";
import { Program, web3 } from "@project-serum/anchor";
import { MarketProxy } from "@project-serum/serum";
import { EuroPrimitive } from "./euro_primitive";

const textEncoder = new TextEncoder();
// b"open-orders-init"
const OPEN_ORDERS_INIT_SEED = textEncoder.encode("open-orders-init");

/**
 * Derives the pool or root authority for the program.
 * @param program
 * @returns
 */
export const derivePoolAuthority = (program: Program<EuroPrimitive>) =>
  anchor.web3.PublicKey.findProgramAddress([textEncoder.encode("poolAuthority")], program.programId);
/**
 * Derive the EuroMeta account address from it's unique params.
 *
 * @param program
 * @param underlyingMint
 * @param stableMint
 * @param underlyingAmountPerContract
 * @param strikePrice
 */
export const deriveEuroMeta = (
  program: Program<EuroPrimitive>,
  underlyingMint: anchor.web3.PublicKey,
  stableMint: anchor.web3.PublicKey,
  expiration: anchor.BN,
  underlyingAmountPerContract: anchor.BN,
  strikePrice: anchor.BN,
  priceDecimals: number
) =>
  anchor.web3.PublicKey.findProgramAddress(
    [
      underlyingMint.toBuffer(),
      stableMint.toBuffer(),
      expiration.toArrayLike(Buffer, "le", 8),
      underlyingAmountPerContract.toArrayLike(Buffer, "le", 8),
      strikePrice.toArrayLike(Buffer, "le", 8),
      new anchor.BN(priceDecimals).toArrayLike(Buffer, "le", 1),
    ],
    program.programId
  );

/**
 * Derive the ExpirationData for an underlying mint and oracles
 *
 * @param program
 * @param underlyingMint
 * @param expiration
 * @param oracleAddress
 * @param priceDecimals
 * @returns
 */
export const deriveExpirationData = (
  program: Program<EuroPrimitive>,
  underlyingMint: anchor.web3.PublicKey,
  expiration: anchor.BN,
  oracleAddress: anchor.web3.PublicKey,
  priceDecimals: number
) =>
  anchor.web3.PublicKey.findProgramAddress(
    [
      underlyingMint.toBuffer(),
      expiration.toArrayLike(Buffer, "le", 8),
      oracleAddress.toBuffer(),
      new anchor.BN(priceDecimals).toArrayLike(Buffer, "le", 1),
    ],
    program.programId
  );
/**
 *
 * @param program
 * @returns
 */
export const deriveUnderlyingPoolKey = (program: Program<EuroPrimitive>, underlyingMint: anchor.web3.PublicKey) =>
  anchor.web3.PublicKey.findProgramAddress(
    [underlyingMint.toBuffer(), textEncoder.encode("underlyingPool")],
    program.programId
  );

/**
 *
 * @param program
 * @param stableMint
 * @returns
 */
export const deriveStablePoolKey = (program: Program<EuroPrimitive>, stableMint: anchor.web3.PublicKey) =>
  anchor.web3.PublicKey.findProgramAddress(
    [stableMint.toBuffer(), textEncoder.encode("stablePool")],
    program.programId
  );

export const deriveCallOptionMint = (program: Program<EuroPrimitive>, euroMetaKey: anchor.web3.PublicKey) =>
  anchor.web3.PublicKey.findProgramAddress(
    [euroMetaKey.toBuffer(), textEncoder.encode("callOptionMint")],
    program.programId
  );

export const deriveCallWriterMint = (program: Program<EuroPrimitive>, euroMetaKey: anchor.web3.PublicKey) =>
  anchor.web3.PublicKey.findProgramAddress(
    [euroMetaKey.toBuffer(), textEncoder.encode("callWriterMint")],
    program.programId
  );

export const derivePutOptionMint = (program: Program<EuroPrimitive>, euroMetaKey: anchor.web3.PublicKey) =>
  anchor.web3.PublicKey.findProgramAddress(
    [euroMetaKey.toBuffer(), textEncoder.encode("putOptionMint")],
    program.programId
  );

export const derivePutWriterMint = (program: Program<EuroPrimitive>, euroMetaKey: anchor.web3.PublicKey) =>
  anchor.web3.PublicKey.findProgramAddress(
    [euroMetaKey.toBuffer(), textEncoder.encode("putWriterMint")],
    program.programId
  );

/**
 *
 * Derive the Serum market address for a given option token and the price
 * currency that asset will trade in (usually the USDC mint).
 *
 * @param program
 * @param optionMintKey
 * @param priceCurrencyKey
 * @returns
 */
export const deriveSerumMarketAddress = async (
  program: Program<EuroPrimitive>,
  optionMintKey: web3.PublicKey,
  priceCurrencyKey: web3.PublicKey
) => {
  return web3.PublicKey.findProgramAddress(
    [optionMintKey.toBuffer(), priceCurrencyKey.toBuffer(), textEncoder.encode("serumMarket")],
    program.programId
  );
};

export const deriveMarketAuthority = async (
  program: Program<EuroPrimitive>,
  dexProgramId: web3.PublicKey,
  serumMarketKey: web3.PublicKey
) =>
  web3.PublicKey.findProgramAddress(
    [OPEN_ORDERS_INIT_SEED, dexProgramId.toBuffer(), serumMarketKey.toBuffer()],
    program.programId
  );

export const deriveRequestQueue = (
  program: Program<EuroPrimitive>,
  optionMintKey: web3.PublicKey,
  priceCurrencyKey: web3.PublicKey
) =>
  web3.PublicKey.findProgramAddress(
    [optionMintKey.toBuffer(), priceCurrencyKey.toBuffer(), textEncoder.encode("requestQueue")],
    program.programId
  );

export const deriveCoinVault = (
  program: Program<EuroPrimitive>,
  optionMintKey: web3.PublicKey,
  priceCurrencyKey: web3.PublicKey
) =>
  web3.PublicKey.findProgramAddress(
    [optionMintKey.toBuffer(), priceCurrencyKey.toBuffer(), textEncoder.encode("coinVault")],
    program.programId
  );

export const derivePCVault = (
  program: Program<EuroPrimitive>,
  optionMarketKey: web3.PublicKey,
  priceCurrencyKey: web3.PublicKey
) =>
  web3.PublicKey.findProgramAddress(
    [optionMarketKey.toBuffer(), priceCurrencyKey.toBuffer(), textEncoder.encode("pcVault")],
    program.programId
  );

export const deriveOpenOrdersAddress = async (
  program: Program<EuroPrimitive>,
  dexProgramId: web3.PublicKey,
  marketProxy: MarketProxy
) =>
  web3.PublicKey.findProgramAddress(
    [
      textEncoder.encode("open-orders"),
      dexProgramId.toBuffer(),
      marketProxy.market.address.toBuffer(),
      program.provider.publicKey.toBuffer(),
    ],
    program.programId
  );
/**
 * Given an OptionMarket address and DEX program, generate the Serum market key,
 * market authority, and authority bump seed.
 *
 * @param {Program} program - PsyOptions American V1 Anchor program
 * @param {PublicKey} optionMintKey - The key for the option token mint
 * @param {PublicKey} dexProgramId - Serum DEX public key
 * @returns
 */
export const getMarketAndAuthorityInfo = async (
  program: Program<EuroPrimitive>,
  optionMintKey: web3.PublicKey,
  dexProgramId: web3.PublicKey,
  priceCurrencyKey: web3.PublicKey
): Promise<{
  serumMarketKey: web3.PublicKey;
  marketAuthority: web3.PublicKey;
  marketAuthorityBump: number;
}> => {
  const [serumMarketKey, _serumMarketBump] = await deriveSerumMarketAddress(program, optionMintKey, priceCurrencyKey);

  const [marketAuthority, marketAuthorityBump] = await deriveMarketAuthority(program, dexProgramId, serumMarketKey);

  return { serumMarketKey, marketAuthority, marketAuthorityBump };
};
