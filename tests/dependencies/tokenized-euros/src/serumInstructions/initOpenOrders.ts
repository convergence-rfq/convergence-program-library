import { Program } from "@project-serum/anchor";
import { PublicKey, SystemProgram, TransactionInstruction } from "@solana/web3.js";
import { EuroPrimitive, marketLoader, MarketLoaderOpts, pdas } from "..";

/**
 * Create a proxied InitOpenOrdersInstruction
 *
 * @param program - Anchor Psy Tokenized Euros program
 * @param owner - The user's wallet address
 * @param euroMetaKey - The address of the EuroMeta account
 * @param optionMintKey - The address of the option mint that is trading
 * @param dexProgramId - Serum DEX id
 * @param priceCurrencyKey - The address for the price currency of the serum market
 * @param marketLoaderOpts - options for the permissioned market loader
 * @returns
 */
export const initOpenOrdersInstruction = async (
  program: Program<EuroPrimitive>,
  owner: PublicKey,
  euroMetaKey: PublicKey,
  optionMintKey: PublicKey,
  dexProgramId: PublicKey,
  priceCurrencyKey: PublicKey,
  marketLoaderOpts: MarketLoaderOpts = {
    enableLogger: false,
  }
): Promise<{ ix: TransactionInstruction }> => {
  const { serumMarketKey, marketAuthority, marketAuthorityBump } = await pdas.getMarketAndAuthorityInfo(
    program,
    optionMintKey,
    dexProgramId,
    priceCurrencyKey
  );
  const marketProxy = await marketLoader(
    program,
    dexProgramId,
    serumMarketKey,
    euroMetaKey,
    marketAuthorityBump,
    marketLoaderOpts
  );
  const ix = marketProxy.instruction.initOpenOrders(
    owner,
    marketProxy.market.address,
    // dummy key, Serum middleware replaces it
    SystemProgram.programId,
    // dummy key, Serum middleware replaces it
    marketAuthority
  );
  return { ix };
};
