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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProgramFromProvider = exports.createProgramFromWallet = exports.createProgram = exports.loadAllEuroMetaAccunts = exports.loadUnsetExpirationAccounts = exports.parseTranactionError = exports.calcValueInStables = exports.calcValueInUnderlying = exports.contractAmountToStableAmount = exports.contractAmountToUnderlyingAmount = exports.CONTRACT_DECIMALS_BN = exports.CONTRACT_TOKEN_DECIMALS = exports.getFeeOwnerForCluster = exports.getClusterNameFromConnection = exports.DEVNET_FEE_OWNER_KEY = exports.MAINNET_FEE_OWNER_KEY = void 0;
const anchor_1 = require("@project-serum/anchor");
const nodewallet_1 = __importDefault(require("@project-serum/anchor/dist/cjs/nodewallet"));
const bytes_1 = require("@project-serum/anchor/dist/cjs/utils/bytes");
const euro_primitive_1 = require("./euro_primitive");
const types_1 = require("./types");
exports.MAINNET_FEE_OWNER_KEY = new anchor_1.web3.PublicKey("CyDnoEMVuf21v23bxoS2wXxPdCvRR2yFLfymegMH1WY4");
exports.DEVNET_FEE_OWNER_KEY = new anchor_1.web3.PublicKey("Bja7SLji7JzzS5fwg2qUESoPbktALCMuUJLd8VCy8DkG");
/**
 * Given a connection to any node, return the cluster name
 */
const getClusterNameFromConnection = (connection) => __awaiter(void 0, void 0, void 0, function* () {
    const genesisHash = yield connection.getGenesisHash();
    switch (genesisHash) {
        case "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d":
            return "mainnet-beta";
        case "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG":
            return "devnet";
        case "4uhcVJyU9pJkvQyS88uRDiswHXSCkY3zQawwpjk2NsNY":
            return "testnet";
        default:
            return "localnet";
    }
});
exports.getClusterNameFromConnection = getClusterNameFromConnection;
/**
 * Given any Connection return the Fee owner. This is required for applications to
 */
const getFeeOwnerForCluster = (connection) => __awaiter(void 0, void 0, void 0, function* () {
    const cluster = yield (0, exports.getClusterNameFromConnection)(connection);
    switch (cluster) {
        case "devnet":
            return exports.DEVNET_FEE_OWNER_KEY;
        default:
            return exports.MAINNET_FEE_OWNER_KEY;
    }
});
exports.getFeeOwnerForCluster = getFeeOwnerForCluster;
exports.CONTRACT_TOKEN_DECIMALS = 4;
const TEN_BN = new anchor_1.BN(10);
exports.CONTRACT_DECIMALS_BN = new anchor_1.BN(Math.pow(10, exports.CONTRACT_TOKEN_DECIMALS));
const contractAmountToUnderlyingAmount = (contractAmount, underlyingAmountPerContract) => contractAmount.mul(underlyingAmountPerContract).div(exports.CONTRACT_DECIMALS_BN);
exports.contractAmountToUnderlyingAmount = contractAmountToUnderlyingAmount;
const contractAmountToStableAmount = (contractAmount, euroMeta) => {
    const underlyingAmount = contractAmount
        .mul(euroMeta.underlyingAmountPerContract)
        .div(exports.CONTRACT_DECIMALS_BN);
    const underlyingDecimalsFactor = TEN_BN.pow(new anchor_1.BN(euroMeta.underlyingDecimals));
    const priceDecimalFactor = TEN_BN.pow(new anchor_1.BN(euroMeta.priceDecimals));
    const stableFactor = TEN_BN.pow(new anchor_1.BN(euroMeta.stableDecimals));
    return underlyingAmount
        .mul(euroMeta.strikePrice)
        .mul(stableFactor)
        .div(underlyingDecimalsFactor)
        .div(priceDecimalFactor);
};
exports.contractAmountToStableAmount = contractAmountToStableAmount;
const calcValueInUnderlying = (euroMeta, expirationData, amountOfContracts, optionType) => {
    let diff = expirationData.priceAtExpiration.sub(euroMeta.strikePrice);
    if (optionType === types_1.OptionType.PUT) {
        diff = diff.neg();
    }
    return diff
        .mul(euroMeta.underlyingAmountPerContract)
        .div(expirationData.priceAtExpiration)
        .mul(amountOfContracts)
        .div(exports.CONTRACT_DECIMALS_BN);
};
exports.calcValueInUnderlying = calcValueInUnderlying;
const calcValueInStables = (euroMeta, expirationData, amountOfContracts) => {
    let diff = euroMeta.strikePrice.sub(expirationData.priceAtExpiration);
    if (diff.isNeg()) {
        return new anchor_1.BN(0);
    }
    const underlyingDecimalsFactor = TEN_BN.pow(new anchor_1.BN(euroMeta.underlyingDecimals));
    const priceDecimalFactor = TEN_BN.pow(new anchor_1.BN(euroMeta.priceDecimals));
    const stableFactor = TEN_BN.pow(new anchor_1.BN(euroMeta.stableDecimals));
    return diff
        .mul(euroMeta.underlyingAmountPerContract)
        .div(underlyingDecimalsFactor)
        .mul(stableFactor)
        .div(priceDecimalFactor)
        .mul(amountOfContracts)
        .div(exports.CONTRACT_DECIMALS_BN);
};
exports.calcValueInStables = calcValueInStables;
const idlErrors = (0, anchor_1.parseIdlErrors)(euro_primitive_1.IDL);
const parseTranactionError = (error) => {
    var _a, _b, _c;
    const programError = anchor_1.ProgramError.parse(error, idlErrors);
    if (programError === null) {
        // handle Raw Transaction error. Example below
        // Error: Raw transaction TRANSACTION_ID failed ({"err":{"InstructionError":[1,{"Custom":309}]}})
        let match = error.toString().match(/Raw transaction .* failed \((.*)\)/);
        if (!match)
            return null;
        const errorResponse = JSON.parse(match[1]);
        const errorCode = (_c = (_b = (_a = errorResponse === null || errorResponse === void 0 ? void 0 : errorResponse.err) === null || _a === void 0 ? void 0 : _a.InstructionError) === null || _b === void 0 ? void 0 : _b[1]) === null || _c === void 0 ? void 0 : _c.Custom;
        const errorMsg = idlErrors.get(errorCode);
        if (errorMsg !== undefined) {
            return new anchor_1.ProgramError(errorCode, errorMsg, error.logs);
        }
    }
    return programError;
};
exports.parseTranactionError = parseTranactionError;
/**
 * Load all of the ExpirationData accounts where price_set is false.
 *
 * @param program
 * @returns
 */
const loadUnsetExpirationAccounts = (program) => {
    const expirationLayout = 
    // @ts-ignore
    program.coder.accounts.accountLayouts.get("expirationData");
    return program.account.expirationData.all([
        {
            memcmp: {
                offset: expirationLayout.offsetOf("priceSet"),
                bytes: bytes_1.bs58.encode([0]),
            },
        },
    ]);
};
exports.loadUnsetExpirationAccounts = loadUnsetExpirationAccounts;
/**
 * Fetch all of the EuroMeta accounts in the give Program.
 *
 * @param program - Tokenized Euro Anchor Program
 * @returns
 */
const loadAllEuroMetaAccunts = (program) => {
    return program.account.euroMeta.all();
};
exports.loadAllEuroMetaAccunts = loadAllEuroMetaAccunts;
/**
 * Generate a new anchor Program
 *
 * @param payer
 * @param jsonRpcUrl
 * @param programId
 */
const createProgram = (payer, jsonRpcUrl, programId) => {
    const connection = new anchor_1.web3.Connection(jsonRpcUrl);
    const wallet = new nodewallet_1.default(payer);
    // Create anchor provider
    const provider = new anchor_1.AnchorProvider(connection, wallet, {
        commitment: "processed",
    });
    // Create anchor Program
    return new anchor_1.Program(euro_primitive_1.IDL, programId, provider);
};
exports.createProgram = createProgram;
/**
 * Generate a new anchor Program from wallet
 *
 * @param wallet
 * @param jsonRpcUrl
 * @param programId
 */
const createProgramFromWallet = (wallet, jsonRpcUrl, programId) => {
    const connection = new anchor_1.web3.Connection(jsonRpcUrl);
    // Create anchor provider
    const provider = new anchor_1.AnchorProvider(connection, wallet, {
        commitment: "processed",
    });
    // Create anchor Program
    return new anchor_1.Program(euro_primitive_1.IDL, programId, provider);
};
exports.createProgramFromWallet = createProgramFromWallet;
/**
 * Generate a new anchor Program from an AnchorProvider
 * @param provider
 * @param programId
 * @returns
 */
const createProgramFromProvider = (provider, programId) => {
    // Create anchor Program
    return new anchor_1.Program(euro_primitive_1.IDL, programId, provider);
};
exports.createProgramFromProvider = createProgramFromProvider;
