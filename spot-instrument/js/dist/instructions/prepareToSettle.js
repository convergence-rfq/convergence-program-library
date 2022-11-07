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
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPrepareToSettleInstruction = exports.prepareToSettleInstructionDiscriminator = exports.prepareToSettleStruct = void 0;
const splToken = __importStar(require("@solana/spl-token"));
const beet = __importStar(require("@metaplex-foundation/beet"));
const web3 = __importStar(require("@solana/web3.js"));
const AuthoritySideDuplicate_1 = require("../types/AuthoritySideDuplicate");
exports.prepareToSettleStruct = new beet.BeetArgsStruct([
    ['instructionDiscriminator', beet.uniformFixedSizeArray(beet.u8, 8)],
    ['legIndex', beet.u8],
    ['side', AuthoritySideDuplicate_1.authoritySideDuplicateBeet],
], 'PrepareToSettleInstructionArgs');
exports.prepareToSettleInstructionDiscriminator = [
    254, 209, 39, 188, 15, 5, 140, 146,
];
function createPrepareToSettleInstruction(accounts, args, programId = new web3.PublicKey('826r9RA3AGHPas5E4DgbN9MpYa8gE2ZDUPUJW6GEZ3cT')) {
    var _a, _b, _c;
    const [data] = exports.prepareToSettleStruct.serialize({
        instructionDiscriminator: exports.prepareToSettleInstructionDiscriminator,
        ...args,
    });
    const keys = [
        {
            pubkey: accounts.protocol,
            isWritable: false,
            isSigner: true,
        },
        {
            pubkey: accounts.rfq,
            isWritable: false,
            isSigner: false,
        },
        {
            pubkey: accounts.response,
            isWritable: false,
            isSigner: false,
        },
        {
            pubkey: accounts.caller,
            isWritable: true,
            isSigner: true,
        },
        {
            pubkey: accounts.callerTokens,
            isWritable: true,
            isSigner: false,
        },
        {
            pubkey: accounts.mint,
            isWritable: false,
            isSigner: false,
        },
        {
            pubkey: accounts.escrow,
            isWritable: true,
            isSigner: false,
        },
        {
            pubkey: (_a = accounts.systemProgram) !== null && _a !== void 0 ? _a : web3.SystemProgram.programId,
            isWritable: false,
            isSigner: false,
        },
        {
            pubkey: (_b = accounts.tokenProgram) !== null && _b !== void 0 ? _b : splToken.TOKEN_PROGRAM_ID,
            isWritable: false,
            isSigner: false,
        },
        {
            pubkey: (_c = accounts.rent) !== null && _c !== void 0 ? _c : web3.SYSVAR_RENT_PUBKEY,
            isWritable: false,
            isSigner: false,
        },
    ];
    if (accounts.anchorRemainingAccounts != null) {
        for (const acc of accounts.anchorRemainingAccounts) {
            keys.push(acc);
        }
    }
    const ix = new web3.TransactionInstruction({
        programId,
        keys,
        data,
    });
    return ix;
}
exports.createPrepareToSettleInstruction = createPrepareToSettleInstruction;
//# sourceMappingURL=prepareToSettle.js.map