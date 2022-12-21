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
exports.getRiskEngineConfig = exports.getInstrumentEscrowPda = exports.getQuoteEscrowPda = exports.getCollateralInfoPda = exports.getCollateralTokenPda = exports.getMintInfoPda = exports.getBaseAssetPda = exports.getProtocolPda = void 0;
const web3_js_1 = require("@solana/web3.js");
const constants_1 = require("./constants");
const helpers_1 = require("./helpers");
const types_1 = require("./types");
function getProtocolPda(programId) {
    return __awaiter(this, void 0, void 0, function* () {
        const [pda] = yield web3_js_1.PublicKey.findProgramAddress([Buffer.from(constants_1.PROTOCOL_SEED)], programId);
        return pda;
    });
}
exports.getProtocolPda = getProtocolPda;
function getBaseAssetPda(index, programId) {
    return __awaiter(this, void 0, void 0, function* () {
        const [pda] = yield web3_js_1.PublicKey.findProgramAddress([Buffer.from(constants_1.BASE_ASSET_INFO_SEED), (0, helpers_1.toLittleEndian)(index, 2)], programId);
        return pda;
    });
}
exports.getBaseAssetPda = getBaseAssetPda;
function getMintInfoPda(mintAddress, programId) {
    return __awaiter(this, void 0, void 0, function* () {
        const [pda] = yield web3_js_1.PublicKey.findProgramAddress([Buffer.from(constants_1.MINT_INFO_SEED), mintAddress.toBuffer()], programId);
        return pda;
    });
}
exports.getMintInfoPda = getMintInfoPda;
function getCollateralTokenPda(user, programId) {
    return __awaiter(this, void 0, void 0, function* () {
        const [pda] = yield web3_js_1.PublicKey.findProgramAddress([Buffer.from(constants_1.COLLATERAL_TOKEN_SEED), user.toBuffer()], programId);
        return pda;
    });
}
exports.getCollateralTokenPda = getCollateralTokenPda;
function getCollateralInfoPda(user, programId) {
    return __awaiter(this, void 0, void 0, function* () {
        const [pda] = yield web3_js_1.PublicKey.findProgramAddress([Buffer.from(constants_1.COLLATERAL_SEED), user.toBuffer()], programId);
        return pda;
    });
}
exports.getCollateralInfoPda = getCollateralInfoPda;
function getQuoteEscrowPda(response, programId) {
    return __awaiter(this, void 0, void 0, function* () {
        const [pda] = yield web3_js_1.PublicKey.findProgramAddress([Buffer.from(constants_1.QUOTE_ESCROW_SEED), response.toBuffer()], programId);
        return pda;
    });
}
exports.getQuoteEscrowPda = getQuoteEscrowPda;
function getInstrumentEscrowPda(response, assetIdentifier, programId) {
    return __awaiter(this, void 0, void 0, function* () {
        const [pda] = yield web3_js_1.PublicKey.findProgramAddress([Buffer.from(constants_1.INSTRUMENT_ESCROW_SEED), response.toBuffer(), (0, types_1.assetIdentifierToSeedBytes)(assetIdentifier)], programId);
        return pda;
    });
}
exports.getInstrumentEscrowPda = getInstrumentEscrowPda;
function getRiskEngineConfig(programId) {
    return __awaiter(this, void 0, void 0, function* () {
        const [pda] = yield web3_js_1.PublicKey.findProgramAddress([Buffer.from(constants_1.RISK_ENGINE_CONFIG_SEED)], programId);
        return pda;
    });
}
exports.getRiskEngineConfig = getRiskEngineConfig;
