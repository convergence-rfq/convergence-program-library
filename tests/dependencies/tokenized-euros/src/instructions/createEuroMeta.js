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
exports.initializeAllAccountsInstructions = exports.createEuroMetaInstruction = exports.createEuroMeta = void 0;
const anchor_1 = require("@project-serum/anchor");
const spl_token_1 = require("@solana/spl-token");
const pdas_1 = require("../pdas");
const _1 = require(".");
const __1 = require("..");
const createEuroMeta = (program, euroMetaKey, expirationDataKey, euroMeta, expirationDataBump, oracleProviderId = 0) => {
    return program.instruction.createEuroMeta(euroMeta.underlyingAmountPerContract, euroMeta.expiration, euroMeta.strikePrice, euroMeta.priceDecimals, euroMeta.bumpSeed, expirationDataBump, oracleProviderId, {
        accounts: {
            payer: program.provider.publicKey,
            underlyingMint: euroMeta.underlyingMint,
            underlyingPool: euroMeta.underlyingPool,
            stableMint: euroMeta.stableMint,
            stablePool: euroMeta.stablePool,
            euroMeta: euroMetaKey,
            expirationData: expirationDataKey,
            callOptionMint: euroMeta.callOptionMint,
            callWriterMint: euroMeta.callWriterMint,
            putOptionMint: euroMeta.putOptionMint,
            putWriterMint: euroMeta.putWriterMint,
            oracle: euroMeta.oracle,
            tokenProgram: spl_token_1.TOKEN_PROGRAM_ID,
            rent: anchor_1.web3.SYSVAR_RENT_PUBKEY,
            systemProgram: anchor_1.web3.SystemProgram.programId,
        },
    });
};
exports.createEuroMeta = createEuroMeta;
/**
 * Simple high level function to create a new EuroMeta
 *
 * @param program
 * @param underlyingMint
 * @param underlyingDecimals
 * @param stableMint
 * @param stableDecimals
 * @param expiration
 * @param underlyingAmountPerContract
 * @param strikePrice
 * @param priceDecimals
 * @param oracle
 * @param oracleProviderId
 * @returns
 */
const createEuroMetaInstruction = (program, underlyingMint, underlyingDecimals, stableMint, stableDecimals, expiration, underlyingAmountPerContract, strikePrice, priceDecimals, oracle, oracleProviderId = 0) => __awaiter(void 0, void 0, void 0, function* () {
    // Derive the key for the new EuroMeta
    const [euroMetaKey, euroBump] = yield (0, pdas_1.deriveEuroMeta)(program, underlyingMint, stableMint, expiration, underlyingAmountPerContract, strikePrice, priceDecimals);
    const [underlyingPoolKey] = yield (0, pdas_1.deriveUnderlyingPoolKey)(program, underlyingMint);
    const [stablePoolKey] = yield (0, pdas_1.deriveStablePoolKey)(program, stableMint);
    const [expirationDataKey, expirationDataBump] = yield (0, pdas_1.deriveExpirationData)(program, underlyingMint, expiration, oracle, priceDecimals);
    const [callOptionMintKey] = yield (0, pdas_1.deriveCallOptionMint)(program, euroMetaKey);
    const [callWriterMintKey] = yield (0, pdas_1.deriveCallWriterMint)(program, euroMetaKey);
    const [putOptionMintKey] = yield (0, pdas_1.derivePutOptionMint)(program, euroMetaKey);
    const [putWriterMintKey] = yield (0, pdas_1.derivePutWriterMint)(program, euroMetaKey);
    const euroMeta = {
        underlyingMint: underlyingMint,
        stablePool: stablePoolKey,
        stableMint: stableMint,
        stableDecimals,
        underlyingDecimals,
        underlyingAmountPerContract,
        oracle,
        strikePrice,
        priceDecimals,
        callOptionMint: callOptionMintKey,
        callWriterMint: callWriterMintKey,
        putOptionMint: putOptionMintKey,
        putWriterMint: putWriterMintKey,
        underlyingPool: underlyingPoolKey,
        expiration,
        expirationData: expirationDataKey,
        bumpSeed: euroBump,
        oracleProviderId: 0,
    };
    const expirationData = {
        expiration: expiration,
        oracle,
        priceAtExpiration: new anchor_1.BN(0),
        priceSetAtTime: new anchor_1.BN(0),
        priceDecimals: priceDecimals,
        priceSet: false,
        bump: expirationDataBump,
        oracleProviderId: 0,
    };
    const ix = (0, exports.createEuroMeta)(program, euroMetaKey, expirationDataKey, euroMeta, expirationDataBump, oracleProviderId);
    return {
        euroMetaKey,
        expirationDataKey,
        euroMeta,
        expirationData,
        instruction: ix,
    };
});
exports.createEuroMetaInstruction = createEuroMetaInstruction;
/**
 * Instruction to create all the account necessary for a new EuroMeta. This
 * checks and creates the Stable Pool, Underlying Pool, and ExpirationData.
 *
 * @param program
 * @param underlyingMint
 * @param stableMint
 * @param oracleAddress
 * @param expiration
 * @param priceDecimals
 * @param oracleProviderId
 * @returns
 */
const initializeAllAccountsInstructions = (program, underlyingMint, stableMint, oracleAddress, expiration, priceDecimals, oracleProviderId = 0) => __awaiter(void 0, void 0, void 0, function* () {
    const instructions = [];
    // Check if the underlying pool account exists and generate the instruction
    const [underlyingPool] = yield __1.pdas.deriveUnderlyingPoolKey(program, underlyingMint);
    const poolAccount = yield program.provider.connection.getAccountInfo(underlyingPool);
    if (!poolAccount) {
        const { instruction: initUnderlyingPoolIx } = yield (0, _1.initializeUnderlyingPool)(program, underlyingMint);
        instructions.push(initUnderlyingPoolIx);
    }
    const [stablePool] = yield __1.pdas.deriveStablePoolKey(program, stableMint);
    const stablePoolAccount = yield program.provider.connection.getAccountInfo(stablePool);
    if (!stablePoolAccount) {
        const { instruction: initStablePoolIx } = yield (0, _1.initializeStablePool)(program, stableMint);
        instructions.push(initStablePoolIx);
    }
    const [expirationData] = yield __1.pdas.deriveExpirationData(program, underlyingMint, expiration, oracleAddress, priceDecimals);
    const expirationDataAccount = yield program.provider.connection.getAccountInfo(expirationData);
    if (!expirationDataAccount) {
        const { instruction: initExpirationDataIx } = yield (0, _1.initExpirationData)(program, underlyingMint, expiration, oracleAddress, priceDecimals, oracleProviderId);
        instructions.push(initExpirationDataIx);
    }
    return {
        instructions,
    };
});
exports.initializeAllAccountsInstructions = initializeAllAccountsInstructions;
