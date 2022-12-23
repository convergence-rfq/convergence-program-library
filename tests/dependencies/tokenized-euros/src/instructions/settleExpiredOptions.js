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
exports.settleExpiredOptionsInstruction = void 0;
const spl_token_1 = require("@solana/spl-token");
const types_1 = require("../types");
const __1 = require("..");
/**
 * After the option's have expired option holders need to settle the options to get their payoff.
 * This instruction will burn option tokens and return the cash payout in the underlying asset.
 *
 * @param program - The Tokenized Euros anchor program
 * @param euroMetaKey - The address for the EuroMeta data
 * @param euroMeta - The deserialized EuroMeta data
 * @param collateralDestination - The TokenAccount where the payout will be sent
 * @param optionSource - The TokenAccount that holds the options to burn
 * @param amount - The amount of options to settle
 * @param optionType - CALL or PUT
 * @returns
 */
const settleExpiredOptionsInstruction = (program, euroMetaKey, euroMeta, collateralDestination, optionSource, amount, optionType) => __awaiter(void 0, void 0, void 0, function* () {
    const [poolAuthority] = yield __1.pdas.derivePoolAuthority(program);
    const instruction = program.instruction.settleExpiredOptions(amount, optionType, {
        accounts: {
            payer: program.provider.publicKey,
            poolAuthority,
            euroMeta: euroMetaKey,
            expirationData: euroMeta.expirationData,
            optionMint: optionType === types_1.OptionType.CALL
                ? euroMeta.callOptionMint
                : euroMeta.putOptionMint,
            collateralMint: optionType === types_1.OptionType.CALL
                ? euroMeta.underlyingMint
                : euroMeta.stableMint,
            collateralPool: optionType === types_1.OptionType.CALL
                ? euroMeta.underlyingPool
                : euroMeta.stablePool,
            optionSource,
            collateralDestination,
            tokenProgram: spl_token_1.TOKEN_PROGRAM_ID,
        },
    });
    return { instruction };
});
exports.settleExpiredOptionsInstruction = settleExpiredOptionsInstruction;
