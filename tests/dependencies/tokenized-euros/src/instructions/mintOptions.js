"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mintOptions = void 0;
const spl_token_1 = require("@solana/spl-token");
const types_1 = require("../types");
/**
 *
 * Generate an instruction to take collateral and mint options.
 *
 * @param program - The Tokenized Euros anchor program
 * @param euroMetaKey - The address for the EuroMeta data
 * @param euroMeta - The deserialized EuroMeta data
 * @param minterCollateralKey - The address of the TokenAccount that holds the collateral for the option
 * @param optionDestination - The address of the TokenAccount where minted option tokens will be transferred to.
 * @param writerDestination - The address of the TokenAccount where minted writer tokens will be transferred to.
 * @param amount - The amount of options to mint
 * @param optionType - CALL or PUT options
 * @returns
 */
const mintOptions = (program, euroMetaKey, euroMeta, minterCollateralKey, optionDestination, writerDestination, amount, optionType) => {
    const instruction = program.instruction.mintOptions(amount, optionType, {
        accounts: {
            payer: program.provider.publicKey,
            euroMeta: euroMetaKey,
            collateralPool: optionType === types_1.OptionType.CALL
                ? euroMeta.underlyingPool
                : euroMeta.stablePool,
            optionMint: optionType === types_1.OptionType.CALL
                ? euroMeta.callOptionMint
                : euroMeta.putOptionMint,
            writerMint: optionType === types_1.OptionType.CALL
                ? euroMeta.callWriterMint
                : euroMeta.putWriterMint,
            minterCollateral: minterCollateralKey,
            optionDestination,
            writerDestination,
            tokenProgram: spl_token_1.TOKEN_PROGRAM_ID,
        },
    });
    return { instruction };
};
exports.mintOptions = mintOptions;
