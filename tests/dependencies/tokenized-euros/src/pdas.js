"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
exports.getMarketAndAuthorityInfo = exports.deriveOpenOrdersAddress = exports.derivePCVault = exports.deriveCoinVault = exports.deriveRequestQueue = exports.deriveMarketAuthority = exports.deriveSerumMarketAddress = exports.derivePutWriterMint = exports.derivePutOptionMint = exports.deriveCallWriterMint = exports.deriveCallOptionMint = exports.deriveStablePoolKey = exports.deriveUnderlyingPoolKey = exports.deriveExpirationData = exports.deriveEuroMeta = exports.derivePoolAuthority = void 0;
const anchor = __importStar(require("@project-serum/anchor"));
const anchor_1 = require("@project-serum/anchor");
const textEncoder = new TextEncoder();
// b"open-orders-init"
const OPEN_ORDERS_INIT_SEED = textEncoder.encode("open-orders-init");
/**
 * Derives the pool or root authority for the program.
 * @param program
 * @returns
 */
const derivePoolAuthority = (program) => anchor.web3.PublicKey.findProgramAddress([textEncoder.encode("poolAuthority")], program.programId);
exports.derivePoolAuthority = derivePoolAuthority;
/**
 * Derive the EuroMeta account address from it's unique params.
 *
 * @param program
 * @param underlyingMint
 * @param stableMint
 * @param underlyingAmountPerContract
 * @param strikePrice
 */
const deriveEuroMeta = (program, underlyingMint, stableMint, expiration, underlyingAmountPerContract, strikePrice, priceDecimals) => anchor.web3.PublicKey.findProgramAddress([
    underlyingMint.toBuffer(),
    stableMint.toBuffer(),
    expiration.toArrayLike(Buffer, "le", 8),
    underlyingAmountPerContract.toArrayLike(Buffer, "le", 8),
    strikePrice.toArrayLike(Buffer, "le", 8),
    new anchor.BN(priceDecimals).toArrayLike(Buffer, "le", 1),
], program.programId);
exports.deriveEuroMeta = deriveEuroMeta;
/**
 * Derive the ExpirationData for an underlying mint and oracles
 *
 * @param program
 * @param underlyingMint
 * @param expiration
 * @param oracleAddress
 * @param priceDecimals
 * @returns
 */
const deriveExpirationData = (program, underlyingMint, expiration, oracleAddress, priceDecimals) => anchor.web3.PublicKey.findProgramAddress([
    underlyingMint.toBuffer(),
    expiration.toArrayLike(Buffer, "le", 8),
    oracleAddress.toBuffer(),
    new anchor.BN(priceDecimals).toArrayLike(Buffer, "le", 1),
], program.programId);
exports.deriveExpirationData = deriveExpirationData;
/**
 *
 * @param program
 * @returns
 */
const deriveUnderlyingPoolKey = (program, underlyingMint) => anchor.web3.PublicKey.findProgramAddress([underlyingMint.toBuffer(), textEncoder.encode("underlyingPool")], program.programId);
exports.deriveUnderlyingPoolKey = deriveUnderlyingPoolKey;
/**
 *
 * @param program
 * @param stableMint
 * @returns
 */
const deriveStablePoolKey = (program, stableMint) => anchor.web3.PublicKey.findProgramAddress([stableMint.toBuffer(), textEncoder.encode("stablePool")], program.programId);
exports.deriveStablePoolKey = deriveStablePoolKey;
const deriveCallOptionMint = (program, euroMetaKey) => anchor.web3.PublicKey.findProgramAddress([euroMetaKey.toBuffer(), textEncoder.encode("callOptionMint")], program.programId);
exports.deriveCallOptionMint = deriveCallOptionMint;
const deriveCallWriterMint = (program, euroMetaKey) => anchor.web3.PublicKey.findProgramAddress([euroMetaKey.toBuffer(), textEncoder.encode("callWriterMint")], program.programId);
exports.deriveCallWriterMint = deriveCallWriterMint;
const derivePutOptionMint = (program, euroMetaKey) => anchor.web3.PublicKey.findProgramAddress([euroMetaKey.toBuffer(), textEncoder.encode("putOptionMint")], program.programId);
exports.derivePutOptionMint = derivePutOptionMint;
const derivePutWriterMint = (program, euroMetaKey) => anchor.web3.PublicKey.findProgramAddress([euroMetaKey.toBuffer(), textEncoder.encode("putWriterMint")], program.programId);
exports.derivePutWriterMint = derivePutWriterMint;
/**
 *
 * Derive the Serum market address for a given option token and the price
 * currency that asset will trade in (usually the USDC mint).
 *
 * @param program
 * @param optionMintKey
 * @param priceCurrencyKey
 * @returns
 */
const deriveSerumMarketAddress = (program, optionMintKey, priceCurrencyKey) => __awaiter(void 0, void 0, void 0, function* () {
    return anchor_1.web3.PublicKey.findProgramAddress([
        optionMintKey.toBuffer(),
        priceCurrencyKey.toBuffer(),
        textEncoder.encode("serumMarket"),
    ], program.programId);
});
exports.deriveSerumMarketAddress = deriveSerumMarketAddress;
const deriveMarketAuthority = (program, dexProgramId, serumMarketKey) => __awaiter(void 0, void 0, void 0, function* () {
    return anchor_1.web3.PublicKey.findProgramAddress([OPEN_ORDERS_INIT_SEED, dexProgramId.toBuffer(), serumMarketKey.toBuffer()], program.programId);
});
exports.deriveMarketAuthority = deriveMarketAuthority;
const deriveRequestQueue = (program, optionMintKey, priceCurrencyKey) => anchor_1.web3.PublicKey.findProgramAddress([
    optionMintKey.toBuffer(),
    priceCurrencyKey.toBuffer(),
    textEncoder.encode("requestQueue"),
], program.programId);
exports.deriveRequestQueue = deriveRequestQueue;
const deriveCoinVault = (program, optionMintKey, priceCurrencyKey) => anchor_1.web3.PublicKey.findProgramAddress([
    optionMintKey.toBuffer(),
    priceCurrencyKey.toBuffer(),
    textEncoder.encode("coinVault"),
], program.programId);
exports.deriveCoinVault = deriveCoinVault;
const derivePCVault = (program, optionMarketKey, priceCurrencyKey) => anchor_1.web3.PublicKey.findProgramAddress([
    optionMarketKey.toBuffer(),
    priceCurrencyKey.toBuffer(),
    textEncoder.encode("pcVault"),
], program.programId);
exports.derivePCVault = derivePCVault;
const deriveOpenOrdersAddress = (program, dexProgramId, marketProxy) => __awaiter(void 0, void 0, void 0, function* () {
    return anchor_1.web3.PublicKey.findProgramAddress([
        textEncoder.encode("open-orders"),
        dexProgramId.toBuffer(),
        marketProxy.market.address.toBuffer(),
        program.provider.publicKey.toBuffer(),
    ], program.programId);
});
exports.deriveOpenOrdersAddress = deriveOpenOrdersAddress;
/**
 * Given an OptionMarket address and DEX program, generate the Serum market key,
 * market authority, and authority bump seed.
 *
 * @param {Program} program - PsyOptions American V1 Anchor program
 * @param {PublicKey} optionMintKey - The key for the option token mint
 * @param {PublicKey} dexProgramId - Serum DEX public key
 * @returns
 */
const getMarketAndAuthorityInfo = (program, optionMintKey, dexProgramId, priceCurrencyKey) => __awaiter(void 0, void 0, void 0, function* () {
    const [serumMarketKey, _serumMarketBump] = yield (0, exports.deriveSerumMarketAddress)(program, optionMintKey, priceCurrencyKey);
    const [marketAuthority, marketAuthorityBump] = yield (0, exports.deriveMarketAuthority)(program, dexProgramId, serumMarketKey);
    return { serumMarketKey, marketAuthority, marketAuthorityBump };
});
exports.getMarketAndAuthorityInfo = getMarketAndAuthorityInfo;
