import { Program } from "@project-serum/anchor";
import { PublicKey, Transaction } from "@solana/web3.js";
import { pdas, EuroPrimitive, marketLoader, MarketLoaderOpts } from "..";
import { OrderParamsWithFeeRate } from "../types";
import { initOpenOrdersInstruction } from "./initOpenOrders";

const textEncoder = new TextEncoder();

/**
 * Create a new order proxied through the Psy Tokenized Euro Protocol
 *
 * @param program - Anchor Psy Tokenized Euro program
 * @param euroMetaKey - The address of the EuroMeta account
 * @param optionMintKey - The address of the option mint
 * @param dexProgramId - The Serum DEX program ID
 * @param priceCurrencyKey - The price currency mint that is used to quote the Serum market
 * @param orderArguments - The Serum OrderParams
 * @param marketLoaderOpts - Options for the permissioned market proxy
 * @returns
 */
export const newOrderInstruction = async (
  program: Program<EuroPrimitive>,
  euroMetaKey: PublicKey,
  optionMintKey: PublicKey,
  dexProgramId: PublicKey,
  priceCurrencyKey: PublicKey,
  orderArguments: OrderParamsWithFeeRate<PublicKey>,
  marketLoaderOpts: MarketLoaderOpts = {
    enableLogger: false,
  }
): Promise<{ openOrdersKey: PublicKey; tx: Transaction }> => {
  const transaction = new Transaction();
  let _openOrdersKey = orderArguments.openOrdersAddressKey;
  const { serumMarketKey, marketAuthorityBump } = await pdas.getMarketAndAuthorityInfo(
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

  // create OpenOrders account
  if (!_openOrdersKey) {
    // Check that the OpenOrders account does not exist
    [_openOrdersKey] = await pdas.deriveOpenOrdersAddress(program, dexProgramId, marketProxy);
    const accountInfo = await program.provider.connection.getAccountInfo(_openOrdersKey, "recent");
    orderArguments.openOrdersAddressKey = _openOrdersKey;
    if (!accountInfo) {
      const { ix } = await initOpenOrdersInstruction(
        program,
        // @ts-ignore: TODO: Fix after Anchor exposes the publicKey
        program.provider.publicKey,
        euroMetaKey,
        optionMintKey,
        dexProgramId,
        priceCurrencyKey,
        marketLoaderOpts
      );
      transaction.add(ix);
    }
  }

  if (orderArguments.feeRate) {
    orderArguments.price = orderArguments.price * (1 + orderArguments.feeRate);
  }

  const ix = marketProxy.instruction.newOrderV3(orderArguments);
  transaction.add(ix);
  return { openOrdersKey: _openOrdersKey, tx: transaction };
};
