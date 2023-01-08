import { Program } from "@project-serum/anchor";
import { Market } from "@project-serum/serum";
import { ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import { pdas, EuroPrimitive, marketLoader, getFeeOwnerForCluster } from "..";

/**
 * Create a TransactionInstruction for the settleFunds instruction
 *
 * @param program - Anchor Psy Tokenized Euros program
 * @param euroMetaKey - The address of the EuroMeta account
 * @param optionMintKey - The mint of the option being traded on the serum market
 * @param priceCurrencyKey - The address of the mint that the Serum market is quoted in
 * @param dexProgramId - The Serum DEX program ID
 * @param baseWallet - The wallet address that contains the user's base asset tokens
 * @param quoteWallet - The wallet address that contains the user's quote asset tokens
 * @param serumReferralKey - The Psy American referral address for the quote asset
 * @param openOrdersKey - The open orders keys
 */
export const settleFundsInstruction = async (
  program: Program<EuroPrimitive>,
  euroMetaKey: PublicKey,
  optionMintKey: PublicKey,
  priceCurrencyKey: PublicKey,
  dexProgramId: PublicKey,
  baseWallet: PublicKey,
  quoteWallet: PublicKey,
  serumReferralKey: PublicKey,
  openOrdersKey: PublicKey
) => {
  const { serumMarketKey, marketAuthorityBump } = await pdas.getMarketAndAuthorityInfo(
    program,
    optionMintKey,
    dexProgramId,
    priceCurrencyKey
  );
  const marketProxy = await marketLoader(program, dexProgramId, serumMarketKey, euroMetaKey, marketAuthorityBump);
  return marketProxy.instruction.settleFunds(
    openOrdersKey,
    // @ts-ignore: TODO: Fix after Anchor exposes the publicKey
    program.provider.publicKey,
    baseWallet,
    quoteWallet,
    serumReferralKey
  );
};
/**
 * Create a TransactionInstruction for the settleFunds instruction
 *
 * Note: this API abstracts the complexity of the serumReferralKey away.
 *
 * @param program - Anchor Psy American Program
 * @param euroMetaKey - The address of the EuroMeta account
 * @param dexProgramId - The Serum DEX program ID
 * @param serumMarket - The Serum market
 * @param baseWallet - The wallet address that contains the user's base asset tokens
 * @param quoteWallet - The wallet address that contains the user's quote asset tokens
 * @param openOrdersKey - The open orders keys
 */
export const settleMarketFundsInstruction = async (
  program: Program<EuroPrimitive>,
  euroMetaKey: PublicKey,
  dexProgramId: PublicKey,
  serumMarket: Market,
  baseWallet: PublicKey,
  quoteWallet: PublicKey,
  openOrdersKey: PublicKey
) => {
  // Get the associated address for a referral
  const owner = await getFeeOwnerForCluster(program.provider.connection);
  const associatedAddress = await getAssociatedTokenAddress(
    serumMarket.quoteMintAddress,
    owner,
    true,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  return settleFundsInstruction(
    program,
    euroMetaKey,
    serumMarket.baseMintAddress,
    serumMarket.quoteMintAddress,
    dexProgramId,
    baseWallet,
    quoteWallet,
    associatedAddress,
    openOrdersKey
  );
};
