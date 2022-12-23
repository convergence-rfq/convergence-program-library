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
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EuroOptionsFacade = exports.PsyoptionsEuropeanInstrument = exports.getEuroOptionsInstrumentProgram = void 0;
const anchor_1 = require("@project-serum/anchor");
const spl_token_1 = require("@solana/spl-token");
const web3_js_1 = require("@solana/web3.js");
const constants_1 = require("../constants");
const instrument_1 = require("../instrument");
const pdas_1 = require("../pdas");
const types_1 = require("../types");
const wrappers_1 = require("../wrappers");
const helpers_1 = require("../helpers");
const src_1 = require("../../dependencies/tokenized-euros/src");
const pseudo_pyth_idl_1 = require("../../dependencies/pseudo_pyth_idl");
const instructions_1 = require("../../dependencies/tokenized-euros/src/instructions");
let psyoptionsEuropeanInstrumentProgram = null;
function getEuroOptionsInstrumentProgram() {
    if (psyoptionsEuropeanInstrumentProgram === null) {
        psyoptionsEuropeanInstrumentProgram =
            anchor_1.workspace.PsyoptionsEuropeanInstrument;
    }
    return psyoptionsEuropeanInstrumentProgram;
}
exports.getEuroOptionsInstrumentProgram = getEuroOptionsInstrumentProgram;
class PsyoptionsEuropeanInstrument {
    constructor(context, optionFacade, optionType) {
        this.context = context;
        this.optionFacade = optionFacade;
        this.optionType = optionType;
    }
    static create(context, optionFacade, optionType, { amount = constants_1.DEFAULT_INSTRUMENT_AMOUNT, side = null } = {}) {
        const instrument = new PsyoptionsEuropeanInstrument(context, optionFacade, optionType);
        optionFacade.underlyingMint.assertRegistered();
        return new instrument_1.InstrumentController(instrument, { amount, side: side !== null && side !== void 0 ? side : constants_1.DEFAULT_INSTRUMENT_SIDE, baseAssetIndex: optionFacade.underlyingMint.baseAssetIndex }, 4);
    }
    static addInstrument(context) {
        return __awaiter(this, void 0, void 0, function* () {
            yield context.addInstrument(getEuroOptionsInstrumentProgram().programId, false, 2, 7, 3, 3, 4);
            yield context.riskEngine.setInstrumentType(getEuroOptionsInstrumentProgram().programId, types_1.InstrumentType.Option);
        });
    }
    serializeInstrumentData() {
        const mint = this.getOptionMint().publicKey.toBytes();
        const meta = this.optionFacade.metaKey.toBytes();
        const underlyingAmountPerContract = this.optionFacade.meta.underlyingAmountPerContract.toBuffer("le", 8);
        const strikePrice = this.optionFacade.meta.strikePrice.toBuffer("le", 8);
        const expirationTimestamp = this.optionFacade.meta.expiration.toBuffer("le", 8);
        return Buffer.from(new Uint8Array([
            this.optionType == src_1.OptionType.CALL ? 0 : 1,
            ...underlyingAmountPerContract,
            ...strikePrice,
            ...expirationTimestamp,
            ...mint,
            ...meta,
        ]));
    }
    getProgramId() {
        return getEuroOptionsInstrumentProgram().programId;
    }
    getValidationAccounts() {
        return __awaiter(this, void 0, void 0, function* () {
            return [
                { pubkey: this.optionFacade.metaKey, isSigner: false, isWritable: false },
                { pubkey: this.optionFacade.underlyingMint.mintInfoAddress, isSigner: false, isWritable: false },
            ];
        });
    }
    getPrepareSettlementAccounts(side, assetIdentifier, rfq, response) {
        return __awaiter(this, void 0, void 0, function* () {
            const caller = side == types_1.AuthoritySide.Taker ? this.context.taker : this.context.maker;
            return [
                { pubkey: caller.publicKey, isSigner: true, isWritable: true },
                {
                    pubkey: yield spl_token_1.Token.getAssociatedTokenAddress(spl_token_1.ASSOCIATED_TOKEN_PROGRAM_ID, spl_token_1.TOKEN_PROGRAM_ID, this.getOptionMint().publicKey, caller.publicKey),
                    isSigner: false,
                    isWritable: true,
                },
                { pubkey: this.getOptionMint().publicKey, isSigner: false, isWritable: false },
                {
                    pubkey: yield (0, pdas_1.getInstrumentEscrowPda)(response.account, assetIdentifier, this.getProgramId()),
                    isSigner: false,
                    isWritable: true,
                },
                { pubkey: web3_js_1.SystemProgram.programId, isSigner: false, isWritable: false },
                { pubkey: spl_token_1.TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
                { pubkey: web3_js_1.SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
            ];
        });
    }
    getSettleAccounts(assetReceiver, assetIdentifier, rfq, response) {
        return __awaiter(this, void 0, void 0, function* () {
            return [
                {
                    pubkey: yield (0, pdas_1.getInstrumentEscrowPda)(response.account, assetIdentifier, this.getProgramId()),
                    isSigner: false,
                    isWritable: true,
                },
                {
                    pubkey: yield this.getOptionMint().getAssociatedAddress(assetReceiver),
                    isSigner: false,
                    isWritable: true,
                },
                { pubkey: spl_token_1.TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
            ];
        });
    }
    getRevertSettlementPreparationAccounts(side, assetIdentifier, rfq, response) {
        return __awaiter(this, void 0, void 0, function* () {
            const caller = side == types_1.AuthoritySide.Taker ? this.context.taker : this.context.maker;
            return [
                {
                    pubkey: yield (0, pdas_1.getInstrumentEscrowPda)(response.account, assetIdentifier, this.getProgramId()),
                    isSigner: false,
                    isWritable: true,
                },
                {
                    pubkey: yield this.getOptionMint().getAssociatedAddress(caller.publicKey),
                    isSigner: false,
                    isWritable: true,
                },
                { pubkey: spl_token_1.TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
            ];
        });
    }
    getCleanUpAccounts(assetIdentifier, rfq, response) {
        return __awaiter(this, void 0, void 0, function* () {
            return [
                {
                    pubkey: response.firstToPrepare,
                    isSigner: false,
                    isWritable: true,
                },
                {
                    pubkey: yield (0, pdas_1.getInstrumentEscrowPda)(response.account, assetIdentifier, this.getProgramId()),
                    isSigner: false,
                    isWritable: true,
                },
                {
                    pubkey: yield this.getOptionMint().getAssociatedAddress(this.context.dao.publicKey),
                    isSigner: false,
                    isWritable: true,
                },
                { pubkey: spl_token_1.TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
            ];
        });
    }
    getOptionMint() {
        if (this.optionType == src_1.OptionType.CALL) {
            return this.optionFacade.callMint;
        }
        else {
            return this.optionFacade.putMint;
        }
    }
}
exports.PsyoptionsEuropeanInstrument = PsyoptionsEuropeanInstrument;
class EuroOptionsFacade {
    constructor(program, meta, metaKey, underlyingMint, stableMint, callMint, callWriterMint, putMint, putWriterMint) {
        this.program = program;
        this.meta = meta;
        this.metaKey = metaKey;
        this.underlyingMint = underlyingMint;
        this.stableMint = stableMint;
        this.callMint = callMint;
        this.callWriterMint = callWriterMint;
        this.putMint = putMint;
        this.putWriterMint = putWriterMint;
    }
    mintOptions(mintBy, amount, optionType) {
        return __awaiter(this, void 0, void 0, function* () {
            const { instruction } = yield (0, instructions_1.mintOptions)(this.program, this.metaKey, this.meta, optionType == src_1.OptionType.CALL
                ? yield this.underlyingMint.getAssociatedAddress(mintBy.publicKey)
                : yield this.stableMint.getAssociatedAddress(mintBy.publicKey), optionType == src_1.OptionType.CALL
                ? yield this.callMint.getAssociatedAddress(mintBy.publicKey)
                : yield this.putMint.getAssociatedAddress(mintBy.publicKey), optionType == src_1.OptionType.CALL
                ? yield this.callWriterMint.getAssociatedAddress(mintBy.publicKey)
                : yield this.putWriterMint.getAssociatedAddress(mintBy.publicKey), amount.mul(src_1.CONTRACT_DECIMALS_BN), optionType);
            // change signer
            instruction.keys[0] = { pubkey: mintBy.publicKey, isSigner: true, isWritable: false };
            const transaction = new anchor_1.web3.Transaction().add(instruction);
            yield this.program.provider.sendAndConfirm(transaction, [mintBy]);
        });
    }
    static initalizeNewOptionMeta(context, { underlyingMint = context.assetToken, stableMint = context.quoteToken, underlyingPerContract = (0, helpers_1.withTokenDecimals)(1), strikePrice = (0, helpers_1.withTokenDecimals)(20000), expireIn = 3600, } = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            const program = new anchor_1.Program(src_1.IDL, src_1.programId, context.provider);
            const pseudoPythProgram = new anchor_1.Program(pseudo_pyth_idl_1.IDL, new web3_js_1.PublicKey("FsJ3A3u2vn5cTVofAjvy6y5kwABJAqYWpe4975bi2epH"), context.provider);
            const oracle = yield EuroOptionsFacade.createPriceFeed({
                oracleProgram: pseudoPythProgram,
                initPrice: 50000,
                confidence: null,
            });
            const expiration = new anchor_1.BN(Date.now() / 1000 + expireIn); // 1 hour in the future
            const { instructions: preparationIxs } = yield (0, instructions_1.initializeAllAccountsInstructions)(program, underlyingMint.publicKey, stableMint.publicKey, oracle, expiration, 8);
            const { instruction: ix, euroMeta, euroMetaKey, } = yield (0, instructions_1.createEuroMetaInstruction)(program, underlyingMint.publicKey, 8, stableMint.publicKey, 8, expiration, underlyingPerContract, strikePrice, 8, oracle);
            const transaction = new anchor_1.web3.Transaction().add(...preparationIxs, ix);
            yield context.provider.sendAndConfirm(transaction);
            const [callMint, callWriterMint, putMint, putWriterMint] = yield (0, helpers_1.executeInParallel)(() => wrappers_1.Mint.wrap(context, euroMeta.callOptionMint), () => wrappers_1.Mint.wrap(context, euroMeta.callWriterMint), () => wrappers_1.Mint.wrap(context, euroMeta.putOptionMint), () => wrappers_1.Mint.wrap(context, euroMeta.putWriterMint));
            return new EuroOptionsFacade(program, euroMeta, euroMetaKey, underlyingMint, stableMint, callMint, callWriterMint, putMint, putWriterMint);
        });
    }
}
exports.EuroOptionsFacade = EuroOptionsFacade;
_a = EuroOptionsFacade;
EuroOptionsFacade.createPriceFeed = ({ oracleProgram, initPrice, confidence, expo = -4 }) => __awaiter(void 0, void 0, void 0, function* () {
    const conf = confidence || new anchor_1.BN((initPrice / 10) * Math.pow(10, -expo));
    const collateralTokenFeed = new anchor_1.web3.Account();
    yield oracleProgram.rpc.initialize(new anchor_1.BN(initPrice * Math.pow(10, -expo)), expo, conf, {
        accounts: { price: collateralTokenFeed.publicKey },
        signers: [collateralTokenFeed],
        instructions: [
            anchor_1.web3.SystemProgram.createAccount({
                fromPubkey: oracleProgram.provider.publicKey,
                newAccountPubkey: collateralTokenFeed.publicKey,
                space: 3312,
                lamports: yield oracleProgram.provider.connection.getMinimumBalanceForRentExemption(3312),
                programId: oracleProgram.programId,
            }),
        ],
    });
    return collateralTokenFeed.publicKey;
});
