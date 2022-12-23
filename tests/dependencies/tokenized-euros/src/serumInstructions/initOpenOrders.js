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
exports.initOpenOrdersInstruction = void 0;
const web3_js_1 = require("@solana/web3.js");
const __1 = require("..");
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
const initOpenOrdersInstruction = (program, owner, euroMetaKey, optionMintKey, dexProgramId, priceCurrencyKey, marketLoaderOpts = {
    enableLogger: false,
}) => __awaiter(void 0, void 0, void 0, function* () {
    const { serumMarketKey, marketAuthority, marketAuthorityBump } = yield __1.pdas.getMarketAndAuthorityInfo(program, optionMintKey, dexProgramId, priceCurrencyKey);
    const marketProxy = yield (0, __1.marketLoader)(program, dexProgramId, serumMarketKey, euroMetaKey, marketAuthorityBump, marketLoaderOpts);
    const ix = marketProxy.instruction.initOpenOrders(owner, marketProxy.market.address, 
    // dummy key, Serum middleware replaces it
    web3_js_1.SystemProgram.programId, 
    // dummy key, Serum middleware replaces it
    marketAuthority);
    return { ix };
});
exports.initOpenOrdersInstruction = initOpenOrdersInstruction;
