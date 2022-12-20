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
exports.closeOpenOrdersInstruction = void 0;
const __1 = require("..");
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
const closeOpenOrdersInstruction = (program, euroMetaKey, optionMintKey, dexProgramId, openOrdersKey, priceCurrencyKey, solWallet) => __awaiter(void 0, void 0, void 0, function* () {
    const { serumMarketKey, marketAuthorityBump } = yield __1.pdas.getMarketAndAuthorityInfo(program, optionMintKey, dexProgramId, priceCurrencyKey);
    const marketProxy = yield (0, __1.marketLoader)(program, dexProgramId, serumMarketKey, euroMetaKey, marketAuthorityBump);
    return marketProxy.instruction.closeOpenOrders(openOrdersKey, 
    // @ts-ignore: TODO: Fix after Anchor exposes the publicKey
    program.provider.publicKey, 
    // @ts-ignore: TODO: Fix after Anchor exposes the publicKey
    solWallet !== null && solWallet !== void 0 ? solWallet : program.provider.publicKey);
});
exports.closeOpenOrdersInstruction = closeOpenOrdersInstruction;
