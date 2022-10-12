import { BN, Program, web3 } from "@project-serum/anchor";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { EuroMeta, ExpirationData } from "../types";
import { EuroPrimitive } from "../euro_primitive";
import {
  deriveEuroMeta,
  deriveCallOptionMint,
  deriveUnderlyingPoolKey,
  deriveCallWriterMint,
  derivePutOptionMint,
  derivePutWriterMint,
  deriveExpirationData,
  deriveStablePoolKey,
} from "../pdas";
import { initExpirationData, initializeStablePool, initializeUnderlyingPool } from ".";
import { pdas } from "..";

export const createEuroMeta = (
  program: Program<EuroPrimitive>,
  euroMetaKey: web3.PublicKey,
  expirationDataKey: web3.PublicKey,
  euroMeta: EuroMeta,
  expirationDataBump: number,
  oracleProviderId: number = 0
) => {
  return program.instruction.createEuroMeta(
    euroMeta.underlyingAmountPerContract,
    euroMeta.expiration,
    euroMeta.strikePrice,
    euroMeta.priceDecimals,
    euroMeta.bumpSeed,
    expirationDataBump,
    oracleProviderId,
    {
      accounts: {
        payer: program.provider.publicKey,
        underlyingMint: euroMeta.underlyingMint,
        underlyingPool: euroMeta.underlyingPool,
        stableMint: euroMeta.stableMint,
        stablePool: euroMeta.stablePool,
        euroMeta: euroMetaKey,
        expirationData: expirationDataKey,
        callOptionMint: euroMeta.callOptionMint,
        callWriterMint: euroMeta.callWriterMint,
        putOptionMint: euroMeta.putOptionMint,
        putWriterMint: euroMeta.putWriterMint,
        oracle: euroMeta.oracle,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: web3.SYSVAR_RENT_PUBKEY,
        systemProgram: web3.SystemProgram.programId,
      },
    }
  );
};
/**
 * Simple high level function to create a new EuroMeta
 *
 * @param program
 * @param underlyingMint
 * @param underlyingDecimals
 * @param stableMint
 * @param stableDecimals
 * @param expiration
 * @param underlyingAmountPerContract
 * @param strikePrice
 * @param priceDecimals
 * @param oracle
 * @param oracleProviderId
 * @returns
 */
export const createEuroMetaInstruction = async (
  program: Program<EuroPrimitive>,
  underlyingMint: web3.PublicKey,
  underlyingDecimals: number,
  stableMint: web3.PublicKey,
  stableDecimals: number,
  expiration: BN,
  underlyingAmountPerContract: BN,
  strikePrice: BN,
  priceDecimals: number,
  oracle: web3.PublicKey,
  oracleProviderId: number = 0
) => {
  // Derive the key for the new EuroMeta
  const [euroMetaKey, euroBump] = await deriveEuroMeta(
    program,
    underlyingMint,
    stableMint,
    expiration,
    underlyingAmountPerContract,
    strikePrice,
    priceDecimals
  );

  const [underlyingPoolKey] = await deriveUnderlyingPoolKey(program, underlyingMint);

  const [stablePoolKey] = await deriveStablePoolKey(program, stableMint);

  const [expirationDataKey, expirationDataBump] = await deriveExpirationData(
    program,
    underlyingMint,
    expiration,
    oracle,
    priceDecimals
  );

  const [callOptionMintKey] = await deriveCallOptionMint(program, euroMetaKey);
  const [callWriterMintKey] = await deriveCallWriterMint(program, euroMetaKey);
  const [putOptionMintKey] = await derivePutOptionMint(program, euroMetaKey);
  const [putWriterMintKey] = await derivePutWriterMint(program, euroMetaKey);

  const euroMeta: EuroMeta = {
    underlyingMint: underlyingMint,
    stablePool: stablePoolKey,
    stableMint: stableMint,
    stableDecimals,
    underlyingDecimals,
    underlyingAmountPerContract,
    oracle,
    strikePrice,
    priceDecimals,
    callOptionMint: callOptionMintKey,
    callWriterMint: callWriterMintKey,
    putOptionMint: putOptionMintKey,
    putWriterMint: putWriterMintKey,
    underlyingPool: underlyingPoolKey,
    expiration,
    expirationData: expirationDataKey,
    bumpSeed: euroBump,
    oracleProviderId: 0,
  };
  const expirationData: ExpirationData = {
    expiration: expiration,
    oracle,
    priceAtExpiration: new BN(0),
    priceSetAtTime: new BN(0),
    priceDecimals: priceDecimals,
    priceSet: false,
    bump: expirationDataBump,
    oracleProviderId: 0,
  };

  const ix = createEuroMeta(program, euroMetaKey, expirationDataKey, euroMeta, expirationDataBump, oracleProviderId);

  return {
    euroMetaKey,
    expirationDataKey,
    euroMeta,
    expirationData,
    instruction: ix,
  };
};

/**
 * Instruction to create all the account necessary for a new EuroMeta. This
 * checks and creates the Stable Pool, Underlying Pool, and ExpirationData.
 *
 * @param program
 * @param underlyingMint
 * @param stableMint
 * @param oracleAddress
 * @param expiration
 * @param priceDecimals
 * @param oracleProviderId
 * @returns
 */
export const initializeAllAccountsInstructions = async (
  program: Program<EuroPrimitive>,
  underlyingMint: web3.PublicKey,
  stableMint: web3.PublicKey,
  oracleAddress: web3.PublicKey,
  expiration: BN,
  priceDecimals: number,
  oracleProviderId: number = 0
) => {
  const instructions: web3.TransactionInstruction[] = [];
  // Check if the underlying pool account exists and generate the instruction
  const [underlyingPool] = await pdas.deriveUnderlyingPoolKey(program, underlyingMint);
  const poolAccount = await program.provider.connection.getAccountInfo(underlyingPool);
  if (!poolAccount) {
    const { instruction: initUnderlyingPoolIx } = await initializeUnderlyingPool(program, underlyingMint);
    instructions.push(initUnderlyingPoolIx);
  }

  const [stablePool] = await pdas.deriveStablePoolKey(program, stableMint);
  const stablePoolAccount = await program.provider.connection.getAccountInfo(stablePool);
  if (!stablePoolAccount) {
    const { instruction: initStablePoolIx } = await initializeStablePool(program, stableMint);
    instructions.push(initStablePoolIx);
  }

  const [expirationData] = await pdas.deriveExpirationData(
    program,
    underlyingMint,
    expiration,
    oracleAddress,
    priceDecimals
  );
  const expirationDataAccount = await program.provider.connection.getAccountInfo(expirationData);

  if (!expirationDataAccount) {
    const { instruction: initExpirationDataIx } = await initExpirationData(
      program,
      underlyingMint,
      expiration,
      oracleAddress,
      priceDecimals,
      oracleProviderId
    );
    instructions.push(initExpirationDataIx);
  }

  return {
    instructions,
  };
};
