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
exports.closeOptionsInstruction = void 0;
const spl_token_1 = require("@solana/spl-token");
const types_1 = require("../types");
const __1 = require("..");
/**
 * Close options by burning a option and writer tokens. This instruction can be used
 * to retrieve the underlying from the option before or after expiration.
 *
 * @param program - Tokenized Euros anchor Program
 * @param euroMetaKey - address for the EuroMeta data structure
 * @param euroMeta - The deserialized EuroMeta data
 * @param collateralDestination - Where the underlying collateral of the option should be returned
 * @param optionSource - The TokenAccount that holds the option tokens
 * @param writerSource - The TokenAccount that holds the writer tokens
 * @param amount - The amount of options to close
 * @param optionType - Whether the option is a CALL or a PUT.
 * @returns
 */
const closeOptionsInstruction = (program, euroMetaKey, euroMeta, collateralDestination, optionSource, writerSource, amount, optionType) => __awaiter(void 0, void 0, void 0, function* () {
    const [poolAuthority] = yield __1.pdas.derivePoolAuthority(program);
    const instruction = program.instruction.closeOptions(amount, optionType, {
        accounts: {
            payer: program.provider.publicKey,
            euroMeta: euroMetaKey,
            poolAuthority,
            optionMint: optionType === types_1.OptionType.CALL
                ? euroMeta.callOptionMint
                : euroMeta.putOptionMint,
            writerMint: optionType === types_1.OptionType.CALL
                ? euroMeta.callWriterMint
                : euroMeta.putWriterMint,
            collateralPool: optionType === types_1.OptionType.CALL
                ? euroMeta.underlyingPool
                : euroMeta.stablePool,
            optionSource,
            writerSource,
            collateralDestination,
            tokenProgram: spl_token_1.TOKEN_PROGRAM_ID,
        },
    });
    return { instruction };
});
exports.closeOptionsInstruction = closeOptionsInstruction;
