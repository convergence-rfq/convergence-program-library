"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.newOrderInstruction = void 0;
const web3_js_1 = require("@solana/web3.js");
const __1 = require("..");
const initOpenOrders_1 = require("./initOpenOrders");
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
const newOrderInstruction = (program, euroMetaKey, optionMintKey, dexProgramId, priceCurrencyKey, orderArguments, marketLoaderOpts = {
    enableLogger: false,
}) => __awaiter(void 0, void 0, void 0, function* () {
    const transaction = new web3_js_1.Transaction();
    let _openOrdersKey = orderArguments.openOrdersAddressKey;
    const { serumMarketKey, marketAuthorityBump } = yield __1.pdas.getMarketAndAuthorityInfo(program, optionMintKey, dexProgramId, priceCurrencyKey);
    const marketProxy = yield (0, __1.marketLoader)(program, dexProgramId, serumMarketKey, euroMetaKey, marketAuthorityBump, marketLoaderOpts);
    // create OpenOrders account
    if (!_openOrdersKey) {
        // Check that the OpenOrders account does not exist
        [_openOrdersKey] = yield __1.pdas.deriveOpenOrdersAddress(program, dexProgramId, marketProxy);
        const accountInfo = yield program.provider.connection.getAccountInfo(_openOrdersKey, "recent");
        orderArguments.openOrdersAddressKey = _openOrdersKey;
        if (!accountInfo) {
            const { ix } = yield (0, initOpenOrders_1.initOpenOrdersInstruction)(program, 
            // @ts-ignore: TODO: Fix after Anchor exposes the publicKey
            program.provider.publicKey, euroMetaKey, optionMintKey, dexProgramId, priceCurrencyKey, marketLoaderOpts);
            transaction.add(ix);
        }
    }
    if (orderArguments.feeRate) {
        orderArguments.price = orderArguments.price * (1 + orderArguments.feeRate);
    }
    const ix = marketProxy.instruction.newOrderV3(orderArguments);
    transaction.add(ix);
    return { openOrdersKey: _openOrdersKey, tx: transaction };
});
exports.newOrderInstruction = newOrderInstruction;
