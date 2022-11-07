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
exports.SpotInstrument = exports.getSpotInstrumentProgram = void 0;
const anchor = __importStar(require("@project-serum/anchor"));
const spl_token_1 = require("@solana/spl-token");
const web3_js_1 = require("@solana/web3.js");
const constants_1 = require("../constants");
const instrument_1 = require("../instrument");
const pdas_1 = require("../pdas");
const types_1 = require("../types");
let spotInstrumentProgram = null;
function getSpotInstrumentProgram() {
    if (spotInstrumentProgram === null) {
        spotInstrumentProgram = anchor.workspace.SpotInstrument;
    }
    return spotInstrumentProgram;
}
exports.getSpotInstrumentProgram = getSpotInstrumentProgram;
class SpotInstrument {
    constructor(context, mint) {
        this.context = context;
        this.mint = mint;
    }
    static create(context, { mint = context.assetToken, amount = constants_1.DEFAULT_INSTRUMENT_AMOUNT, side = null } = {}) {
        const instrument = new SpotInstrument(context, mint);
        return new instrument_1.InstrumentController(instrument, amount, side !== null && side !== void 0 ? side : constants_1.DEFAULT_INSTRUMENT_SIDE);
    }
    static addInstrument(context) {
        return __awaiter(this, void 0, void 0, function* () {
            yield context.addInstrument(getSpotInstrumentProgram().programId, 1, 7, 3, 3, 4);
        });
    }
    serializeLegData() {
        return Buffer.from(this.mint.publicKey.toBytes());
    }
    getProgramId() {
        return getSpotInstrumentProgram().programId;
    }
    getValidationAccounts() {
        return __awaiter(this, void 0, void 0, function* () {
            return [{ pubkey: this.mint.publicKey, isSigner: false, isWritable: false }];
        });
    }
    getPrepareSettlementAccounts(side, legIndex, rfq, response) {
        return __awaiter(this, void 0, void 0, function* () {
            const caller = side == types_1.AuthoritySide.Taker ? this.context.taker : this.context.maker;
            return [
                { pubkey: caller.publicKey, isSigner: true, isWritable: true },
                {
                    pubkey: yield spl_token_1.Token.getAssociatedTokenAddress(spl_token_1.ASSOCIATED_TOKEN_PROGRAM_ID, spl_token_1.TOKEN_PROGRAM_ID, this.mint.publicKey, caller.publicKey),
                    isSigner: false,
                    isWritable: true,
                },
                { pubkey: this.mint.publicKey, isSigner: false, isWritable: false },
                {
                    pubkey: yield (0, pdas_1.getInstrumentEscrowPda)(response.account, legIndex, this.getProgramId()),
                    isSigner: false,
                    isWritable: true,
                },
                { pubkey: web3_js_1.SystemProgram.programId, isSigner: false, isWritable: false },
                { pubkey: spl_token_1.TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
                { pubkey: web3_js_1.SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
            ];
        });
    }
    getSettleAccounts(assetReceiver, legIndex, rfq, response) {
        return __awaiter(this, void 0, void 0, function* () {
            return [
                {
                    pubkey: yield (0, pdas_1.getInstrumentEscrowPda)(response.account, legIndex, this.getProgramId()),
                    isSigner: false,
                    isWritable: true,
                },
                {
                    pubkey: yield this.mint.getAssociatedAddress(assetReceiver),
                    isSigner: false,
                    isWritable: true,
                },
                { pubkey: spl_token_1.TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
            ];
        });
    }
    getRevertSettlementPreparationAccounts(side, legIndex, rfq, response) {
        return __awaiter(this, void 0, void 0, function* () {
            const caller = side == types_1.AuthoritySide.Taker ? this.context.taker : this.context.maker;
            return [
                {
                    pubkey: yield (0, pdas_1.getInstrumentEscrowPda)(response.account, legIndex, this.getProgramId()),
                    isSigner: false,
                    isWritable: true,
                },
                {
                    pubkey: yield this.mint.getAssociatedAddress(caller.publicKey),
                    isSigner: false,
                    isWritable: true,
                },
                { pubkey: spl_token_1.TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
            ];
        });
    }
    getCleanUpAccounts(legIndex, rfq, response) {
        return __awaiter(this, void 0, void 0, function* () {
            return [
                {
                    pubkey: response.firstToPrepare,
                    isSigner: false,
                    isWritable: true,
                },
                {
                    pubkey: yield (0, pdas_1.getInstrumentEscrowPda)(response.account, legIndex, this.getProgramId()),
                    isSigner: false,
                    isWritable: true,
                },
                {
                    pubkey: yield this.mint.getAssociatedAddress(this.context.dao.publicKey),
                    isSigner: false,
                    isWritable: true,
                },
                { pubkey: spl_token_1.TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
            ];
        });
    }
}
exports.SpotInstrument = SpotInstrument;
