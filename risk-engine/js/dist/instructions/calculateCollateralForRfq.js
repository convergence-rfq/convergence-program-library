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
exports.createCalculateCollateralForRfqInstruction = exports.calculateCollateralForRfqInstructionDiscriminator = exports.calculateCollateralForRfqStruct = void 0;
const beet = __importStar(require("@metaplex-foundation/beet"));
const web3 = __importStar(require("@solana/web3.js"));
exports.calculateCollateralForRfqStruct = new beet.BeetArgsStruct([['instructionDiscriminator', beet.uniformFixedSizeArray(beet.u8, 8)]], 'CalculateCollateralForRfqInstructionArgs');
exports.calculateCollateralForRfqInstructionDiscriminator = [
    3, 154, 182, 192, 204, 235, 214, 151,
];
function createCalculateCollateralForRfqInstruction(accounts, programId = new web3.PublicKey('9sEUmfZPhH8qVEoFmfdbJhKcfWP5LCCZfb2Cu7zffs4b')) {
    const [data] = exports.calculateCollateralForRfqStruct.serialize({
        instructionDiscriminator: exports.calculateCollateralForRfqInstructionDiscriminator,
    });
    const keys = [
        {
            pubkey: accounts.rfq,
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
exports.createCalculateCollateralForRfqInstruction = createCalculateCollateralForRfqInstruction;
//# sourceMappingURL=calculateCollateralForRfq.js.map