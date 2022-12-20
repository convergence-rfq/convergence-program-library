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
exports.cancelAllOpenOrders = exports.cancelOrderByClientId = exports.cancelOrderInstructionV2 = void 0;
const anchor_1 = require("@project-serum/anchor");
const __1 = require("../");
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
const cancelOrderInstructionV2 = (program, euroMetaKey, optionMintKey, dexProgramId, priceCurrencyKey, order) => __awaiter(void 0, void 0, void 0, function* () {
    const { serumMarketKey, marketAuthorityBump } = yield __1.pdas.getMarketAndAuthorityInfo(program, optionMintKey, dexProgramId, priceCurrencyKey);
    const marketProxy = yield (0, __1.marketLoader)(program, dexProgramId, serumMarketKey, euroMetaKey, marketAuthorityBump);
    return marketProxy.instruction.cancelOrder(
    // @ts-ignore: TODO: Fix after Anchor exposes the publicKey
    program.provider.publicKey, order);
});
exports.cancelOrderInstructionV2 = cancelOrderInstructionV2;
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
const cancelOrderByClientId = (program, euroMetaKey, optionMintKey, dexProgramId, priceCurrencyKey, order) => __awaiter(void 0, void 0, void 0, function* () {
    const { serumMarketKey, marketAuthorityBump } = yield __1.pdas.getMarketAndAuthorityInfo(program, optionMintKey, dexProgramId, priceCurrencyKey);
    const marketProxy = yield (0, __1.marketLoader)(program, dexProgramId, serumMarketKey, euroMetaKey, marketAuthorityBump);
    return marketProxy.instruction.cancelOrderByClientId(
    // @ts-ignore: TODO: Fix after Anchor exposes the publicKey
    program.provider.publicKey, order.openOrdersAddress, order.clientId);
});
exports.cancelOrderByClientId = cancelOrderByClientId;
const one = new anchor_1.BN(1);
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
const cancelAllOpenOrders = (program, euroMetaKey, optionMintKey, dexProgramId, priceCurrencyKey) => __awaiter(void 0, void 0, void 0, function* () {
    const instructions = [];
    const { serumMarketKey, marketAuthorityBump } = yield __1.pdas.getMarketAndAuthorityInfo(program, optionMintKey, dexProgramId, priceCurrencyKey);
    const marketProxy = yield (0, __1.marketLoader)(program, dexProgramId, serumMarketKey, euroMetaKey, marketAuthorityBump);
    // get the provider's open orders for the market
    const openOrdersAccounts = yield (0, __1.findOpenOrdersAccountsForOwner)(program, dexProgramId, serumMarketKey);
    // create array of instructions to cancel the orders.
    yield Promise.all(openOrdersAccounts.map((openOrders) => __awaiter(void 0, void 0, void 0, function* () {
        yield Promise.all(openOrders.orders.map((orderId, index) => __awaiter(void 0, void 0, void 0, function* () {
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
                instructions.push(yield (0, exports.cancelOrderInstructionV2)(program, euroMetaKey, optionMintKey, dexProgramId, priceCurrencyKey, orderInfo));
            }
        })));
    })));
    return instructions;
});
exports.cancelAllOpenOrders = cancelAllOpenOrders;
