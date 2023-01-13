import { Program } from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";
import { EuroPrimitive, marketLoader, pdas } from "..";

/**
 * Create instruction to close OpenOrders account.
 *
 * @param program - Anchor Psy Tokenized Euros program
 * @param euroMetaKey - The EuroMeta address
 * @param optionMintKey - The address for the option mint trading
 * @param dexProgramId - The Serum DEX program ID
 * @param openOrdersKey - The open orders key for the account we're closing
 * @param priceCurrencyKey - The key for the price currency mint
 * @param solWallet - OPTIONAL: pass in a different address to send the unlocked Sol to
 * @returns
 */
export const closeOpenOrdersInstruction = async (
  program: Program<EuroPrimitive>,
  euroMetaKey: PublicKey,
  optionMintKey: PublicKey,
  dexProgramId: PublicKey,
  openOrdersKey: PublicKey,
  priceCurrencyKey: PublicKey,
  solWallet?: PublicKey
) => {
  const { serumMarketKey, marketAuthorityBump } = await pdas.getMarketAndAuthorityInfo(
    program,
    optionMintKey,
    dexProgramId,
    priceCurrencyKey
  );
  const marketProxy = await marketLoader(program, dexProgramId, serumMarketKey, euroMetaKey, marketAuthorityBump);
  return marketProxy.instruction.closeOpenOrders(
    openOrdersKey,
    // @ts-ignore: TODO: Fix after Anchor exposes the publicKey
    program.provider.publicKey,
    // @ts-ignore: TODO: Fix after Anchor exposes the publicKey
    solWallet ?? program.provider.publicKey
  );
};
