import { BN, Program } from "@project-serum/anchor";
import { Order } from "@project-serum/serum/lib/market";
import { PublicKey, TransactionInstruction } from "@solana/web3.js";
import {
  EuroPrimitive,
  findOpenOrdersAccountsForOwner,
  marketLoader,
  pdas,
} from "../";
import { EuroMeta } from "../types";

/**
 * Create a TransactionInstruction for canceling a specific _order_
 *
 * @param program - Anchor Program for Tokenized Euros
 * @param euroMetaKey - The address of the EuroMeta account
 * @param optionMintKey - The address of the option token traded on the Seurm Market
 * @param dexProgramId - The PublicKey of the DEX program
 * @param priceCurrencyKey - The address of the price currency mint
 * @param order - The Serum Order to cancel
 * @returns
 */
export const cancelOrderInstructionV2 = async (
  program: Program<EuroPrimitive>,
  euroMetaKey: PublicKey,
  optionMintKey: PublicKey,
  dexProgramId: PublicKey,
  priceCurrencyKey: PublicKey,
  order: Order
): Promise<TransactionInstruction> => {
  const { serumMarketKey, marketAuthorityBump } =
    await pdas.getMarketAndAuthorityInfo(
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
    marketAuthorityBump
  );
  return marketProxy.instruction.cancelOrder(
    // @ts-ignore: TODO: Fix after Anchor exposes the publicKey
    program.provider.publicKey,
    order
  );
};

/**
 * Generate a `TransactionInstruction` for canceling an open order by the set clientId
 *
 * @param program - Anchor Program for Tokenized Euros
 * @param euroMetaKey - The address of the EuroMeta account
 * @param optionMintKey - The address of the option token traded on the Seurm Market
 * @param dexProgramId - The PublicKey of the DEX program
 * @param priceCurrencyKey - The address of the price currency mint
 * @param order - The Serum Order to cancel
 * @returns
 */
export const cancelOrderByClientId = async (
  program: Program<EuroPrimitive>,
  euroMetaKey: PublicKey,
  optionMintKey: PublicKey,
  dexProgramId: PublicKey,
  priceCurrencyKey: PublicKey,
  order: Order
): Promise<TransactionInstruction> => {
  const { serumMarketKey, marketAuthorityBump } =
    await pdas.getMarketAndAuthorityInfo(
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
    marketAuthorityBump
  );
  return marketProxy.instruction.cancelOrderByClientId(
    // @ts-ignore: TODO: Fix after Anchor exposes the publicKey
    program.provider.publicKey,
    order.openOrdersAddress,
    order.clientId
  );
};

const one = new BN(1);

/**
 * Create an array of TransactionInstructions to cancel all of the wallet's orders for a given
 * OptionMarket and SerumMarket.
 *
 * NOTE: Current implementation does not account for Transaction packet size limitations. It
 * is on the client to slice the instructions to be within the limits.
 *
 * @param program - Anchor Program for Tokenized Euros
 * @param euroMetaKey - The address of the EuroMeta account
 * @param optionMintKey - The address of the option token traded on the Seurm Market
 * @param dexProgramId - The PublicKey of the DEX program
 * @param priceCurrencyKey - The address of the price currency mint
 * @returns
 */
export const cancelAllOpenOrders = async (
  program: Program<EuroPrimitive>,
  euroMetaKey: PublicKey,
  optionMintKey: PublicKey,
  dexProgramId: PublicKey,
  priceCurrencyKey: PublicKey
): Promise<TransactionInstruction[]> => {
  const instructions: TransactionInstruction[] = [];

  const { serumMarketKey, marketAuthorityBump } =
    await pdas.getMarketAndAuthorityInfo(
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
    marketAuthorityBump
  );
  // get the provider's open orders for the market
  const openOrdersAccounts = await findOpenOrdersAccountsForOwner(
    program,
    dexProgramId,
    serumMarketKey
  );

  // create array of instructions to cancel the orders.
  await Promise.all(
    openOrdersAccounts.map(async (openOrders) => {
      await Promise.all(
        openOrders.orders.map(async (orderId, index) => {
          if (!orderId.isZero()) {
            const oneClone = one.clone().shln(index);
            // @ts-ignore: isBidBits issue
            const isAsk = oneClone.and(openOrders.isBidBits).isZero();
            const orderInfo = {
              orderId: orderId,
              openOrdersAddress: openOrders.address,
              openOrdersSlot: index,
              side: isAsk ? "sell" : "buy",
            };
            instructions.push(
              await cancelOrderInstructionV2(
                program,
                euroMetaKey,
                optionMintKey,
                dexProgramId,
                priceCurrencyKey,
                orderInfo as Order
              )
            );
          }
        })
      );
    })
  );
  return instructions;
};
