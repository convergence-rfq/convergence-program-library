"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setExpirationPriceInstruction = void 0;
/**
 *
 * Instruction that sets the ExpirationData and locks in the eindex price of
 * an underlying asset for a given expiration date.
 *
 * @param program
 * @param expirationDataKey
 * @param expirationData
 * @returns
 */
const setExpirationPriceInstruction = (program, expirationDataKey, expirationData) => {
    const instruction = program.instruction.setExpirationPrice({
        accounts: {
            payer: program.provider.publicKey,
            expirationData: expirationDataKey,
            priceOracle: expirationData.oracle,
        },
    });
    return { instruction };
};
exports.setExpirationPriceInstruction = setExpirationPriceInstruction;
