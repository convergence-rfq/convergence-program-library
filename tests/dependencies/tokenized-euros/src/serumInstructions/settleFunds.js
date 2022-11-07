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
exports.settleMarketFundsInstruction = exports.settleFundsInstruction = void 0;
const spl_token_1 = require("@solana/spl-token");
const __1 = require("..");
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
const settleFundsInstruction = (program, euroMetaKey, optionMintKey, priceCurrencyKey, dexProgramId, baseWallet, quoteWallet, serumReferralKey, openOrdersKey) => __awaiter(void 0, void 0, void 0, function* () {
    const { serumMarketKey, marketAuthorityBump } = yield __1.pdas.getMarketAndAuthorityInfo(program, optionMintKey, dexProgramId, priceCurrencyKey);
    const marketProxy = yield (0, __1.marketLoader)(program, dexProgramId, serumMarketKey, euroMetaKey, marketAuthorityBump);
    return marketProxy.instruction.settleFunds(openOrdersKey, 
    // @ts-ignore: TODO: Fix after Anchor exposes the publicKey
    program.provider.publicKey, baseWallet, quoteWallet, serumReferralKey);
});
exports.settleFundsInstruction = settleFundsInstruction;
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
const settleMarketFundsInstruction = (program, euroMetaKey, dexProgramId, serumMarket, baseWallet, quoteWallet, openOrdersKey) => __awaiter(void 0, void 0, void 0, function* () {
    // Get the associated address for a referral
    const owner = yield (0, __1.getFeeOwnerForCluster)(program.provider.connection);
    const associatedAddress = yield (0, spl_token_1.getAssociatedTokenAddress)(serumMarket.quoteMintAddress, owner, true, spl_token_1.TOKEN_PROGRAM_ID, spl_token_1.ASSOCIATED_TOKEN_PROGRAM_ID);
    return (0, exports.settleFundsInstruction)(program, euroMetaKey, serumMarket.baseMintAddress, serumMarket.quoteMintAddress, dexProgramId, baseWallet, quoteWallet, associatedAddress, openOrdersKey);
});
exports.settleMarketFundsInstruction = settleMarketFundsInstruction;
