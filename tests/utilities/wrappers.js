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
exports.getContext = exports.Response = exports.Rfq = exports.CollateralMint = exports.Mint = exports.Context = void 0;
const anchor = __importStar(require("@project-serum/anchor"));
const anchor_1 = require("@project-serum/anchor");
const web3_js_1 = require("@solana/web3.js");
const spl_token_1 = require("@solana/spl-token");
const pdas_1 = require("./pdas");
const constants_1 = require("./constants");
const types_1 = require("./types");
const spotInstrument_1 = require("./instruments/spotInstrument");
const helpers_1 = require("./helpers");
const psyoptionsEuropeanInstrument_1 = require("./instruments/psyoptionsEuropeanInstrument");
const psyoptionsAmericanInstrument_1 = require("./instruments/psyoptionsAmericanInstrument");
class Context {
    constructor() {
        this.provider = anchor.AnchorProvider.env();
        anchor.setProvider(this.provider);
        this.program = anchor.workspace.Rfq;
        this.riskEngine = anchor.workspace.RiskEngine;
    }
    initialize() {
        return __awaiter(this, void 0, void 0, function* () {
            yield (0, helpers_1.executeInParallel)(() => __awaiter(this, void 0, void 0, function* () { return (this.dao = yield this.createPayer()); }), () => __awaiter(this, void 0, void 0, function* () { return (this.taker = yield this.createPayer()); }), () => __awaiter(this, void 0, void 0, function* () { return (this.maker = yield this.createPayer()); }));
            this.protocolPda = yield (0, pdas_1.getProtocolPda)(this.program.programId);
            yield (0, helpers_1.executeInParallel)(() => __awaiter(this, void 0, void 0, function* () { return (this.assetToken = yield Mint.create(this)); }), () => __awaiter(this, void 0, void 0, function* () { return (this.quoteToken = yield Mint.create(this)); }), () => __awaiter(this, void 0, void 0, function* () { return (this.collateralToken = yield CollateralMint.create(this)); }));
        });
    }
    createPayer() {
        return __awaiter(this, void 0, void 0, function* () {
            const payer = web3_js_1.Keypair.generate();
            yield this.provider.connection.confirmTransaction(yield this.provider.connection.requestAirdrop(payer.publicKey, constants_1.DEFAULT_SOL_FOR_SIGNERS), "confirmed");
            return payer;
        });
    }
    createMint() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield spl_token_1.Token.createMint(this.provider.connection, this.dao, this.dao.publicKey, null, 0, spl_token_1.TOKEN_PROGRAM_ID);
        });
    }
    initializeProtocol({ settleFees = constants_1.DEFAULT_FEES, defaultFees = constants_1.DEFAULT_FEES } = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.program.methods
                .initializeProtocol(settleFees, defaultFees)
                .accounts({
                signer: this.dao.publicKey,
                protocol: this.protocolPda,
                riskEngine: this.riskEngine.programId,
                collateralMint: this.collateralToken.publicKey,
                systemProgram: web3_js_1.SystemProgram.programId,
            })
                .signers([this.dao])
                .rpc();
        });
    }
    addInstrument(programId, validateDataAccounts, prepareToSettleAccounts, settleAccounts, revertPreparationAccounts, cleanUpAccounts) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.program.methods
                .addInstrument(validateDataAccounts, prepareToSettleAccounts, settleAccounts, revertPreparationAccounts, cleanUpAccounts)
                .accounts({
                authority: this.dao.publicKey,
                protocol: this.protocolPda,
                instrumentProgram: programId,
            })
                .signers([this.dao])
                .rpc();
        });
    }
    // Calculate standard deviation
    initializeCollateral(user) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.program.methods
                .initializeCollateral()
                .accounts({
                user: user.publicKey,
                protocol: this.protocolPda,
                collateralInfo: yield (0, pdas_1.getCollateralInfoPda)(user.publicKey, this.program.programId),
                collateralToken: yield (0, pdas_1.getCollateralTokenPda)(user.publicKey, this.program.programId),
                collateralMint: this.collateralToken.publicKey,
                systemProgram: web3_js_1.SystemProgram.programId,
                tokenProgram: spl_token_1.TOKEN_PROGRAM_ID,
                rent: web3_js_1.SYSVAR_RENT_PUBKEY,
            })
                .signers([user])
                .rpc();
        });
    }
    fundCollateral(user, amount) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.program.methods
                .fundCollateral(new anchor_1.BN(amount))
                .accounts({
                user: user.publicKey,
                userTokens: yield this.collateralToken.getAssociatedAddress(user.publicKey),
                protocol: this.protocolPda,
                collateralInfo: yield (0, pdas_1.getCollateralInfoPda)(user.publicKey, this.program.programId),
                collateralToken: yield (0, pdas_1.getCollateralTokenPda)(user.publicKey, this.program.programId),
                tokenProgram: spl_token_1.TOKEN_PROGRAM_ID,
            })
                .signers([user])
                .rpc();
        });
    }
    withdrawCollateral(user, amount) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.program.methods
                .withdrawCollateral(new anchor_1.BN(amount))
                .accounts({
                user: user.publicKey,
                userTokens: yield this.collateralToken.getAssociatedAddress(user.publicKey),
                protocol: this.protocolPda,
                collateralInfo: yield (0, pdas_1.getCollateralInfoPda)(user.publicKey, this.program.programId),
                collateralToken: yield (0, pdas_1.getCollateralTokenPda)(user.publicKey, this.program.programId),
                tokenProgram: spl_token_1.TOKEN_PROGRAM_ID,
            })
                .signers([user])
                .rpc();
        });
    }
    createRfq({ legs = [spotInstrument_1.SpotInstrument.create(this)], orderType = null, fixedSize = null, activeWindow = constants_1.DEFAULT_ACTIVE_WINDOW, settlingWindow = constants_1.DEFAULT_SETTLING_WINDOW, legsSize = null, finalize = true, } = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            orderType = orderType !== null && orderType !== void 0 ? orderType : constants_1.DEFAULT_ORDER_TYPE;
            fixedSize = fixedSize !== null && fixedSize !== void 0 ? fixedSize : types_1.FixedSize.None;
            legsSize = legsSize !== null && legsSize !== void 0 ? legsSize : (0, helpers_1.calculateLegsSize)(legs);
            const legData = yield Promise.all(legs.map((x) => __awaiter(this, void 0, void 0, function* () { return yield x.toLegData(); })));
            const remainingAccounts = yield (yield Promise.all(legs.map((x) => __awaiter(this, void 0, void 0, function* () { return yield x.getValidationAccounts(); })))).flat();
            const rfq = new web3_js_1.Keypair();
            const rfqObject = new Rfq(this, rfq.publicKey, legs);
            let txConstructor = yield this.program.methods
                .createRfq(legsSize, legData, orderType, fixedSize, activeWindow, settlingWindow)
                .accounts({
                taker: this.taker.publicKey,
                protocol: this.protocolPda,
                rfq: rfq.publicKey,
                quoteMint: this.quoteToken.publicKey,
                systemProgram: web3_js_1.SystemProgram.programId,
            })
                .remainingAccounts(remainingAccounts)
                .signers([this.taker, rfq]);
            if (finalize) {
                txConstructor = txConstructor.postInstructions([yield rfqObject.getFinalizeRfqInstruction()]);
            }
            yield txConstructor.rpc();
            return rfqObject;
        });
    }
}
exports.Context = Context;
class Mint {
    constructor(context, token) {
        this.context = context;
        this.token = token;
        this.publicKey = token.publicKey;
    }
    static wrap(context, address) {
        return __awaiter(this, void 0, void 0, function* () {
            const token = new spl_token_1.Token(context.provider.connection, address, spl_token_1.TOKEN_PROGRAM_ID, context.dao);
            const mint = new Mint(context, token);
            yield (0, helpers_1.executeInParallel)(() => __awaiter(this, void 0, void 0, function* () { return yield token.createAssociatedTokenAccount(context.taker.publicKey); }), () => __awaiter(this, void 0, void 0, function* () { return yield token.createAssociatedTokenAccount(context.maker.publicKey); }), () => __awaiter(this, void 0, void 0, function* () { return yield token.createAssociatedTokenAccount(context.dao.publicKey); }));
            return mint;
        });
    }
    static create(context) {
        return __awaiter(this, void 0, void 0, function* () {
            const token = yield context.createMint();
            const mint = new Mint(context, token);
            yield (0, helpers_1.executeInParallel)(() => __awaiter(this, void 0, void 0, function* () { return yield mint.createAssociatedAccountWithTokens(context.taker.publicKey); }), () => __awaiter(this, void 0, void 0, function* () { return yield mint.createAssociatedAccountWithTokens(context.maker.publicKey); }), () => __awaiter(this, void 0, void 0, function* () { return yield mint.createAssociatedAccountWithTokens(context.dao.publicKey); }));
            return mint;
        });
    }
    createAssociatedAccountWithTokens(address, amount = constants_1.DEFAULT_TOKEN_AMOUNT) {
        return __awaiter(this, void 0, void 0, function* () {
            const account = yield this.token.createAssociatedTokenAccount(address);
            yield this.token.mintTo(account, this.context.dao, [], amount);
        });
    }
    getAssociatedAddress(address) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield spl_token_1.Token.getAssociatedTokenAddress(spl_token_1.ASSOCIATED_TOKEN_PROGRAM_ID, spl_token_1.TOKEN_PROGRAM_ID, this.publicKey, address);
        });
    }
    getAssociatedBalance(address) {
        return __awaiter(this, void 0, void 0, function* () {
            const account = yield this.token.getAccountInfo(yield this.getAssociatedAddress(address));
            return account.amount;
        });
    }
}
exports.Mint = Mint;
class CollateralMint extends Mint {
    static create(context) {
        return __awaiter(this, void 0, void 0, function* () {
            const mint = yield Mint.create(context);
            return new CollateralMint(context, mint.token);
        });
    }
    getTotalCollateral(address) {
        return __awaiter(this, void 0, void 0, function* () {
            const account = yield this.token.getAccountInfo(yield (0, pdas_1.getCollateralTokenPda)(address, this.context.program.programId));
            return account.amount;
        });
    }
    getUnlockedCollateral(address) {
        return __awaiter(this, void 0, void 0, function* () {
            const tokenAccount = yield this.token.getAccountInfo(yield (0, pdas_1.getCollateralTokenPda)(address, this.context.program.programId));
            const collateralInfo = yield this.context.program.account.collateralInfo.fetch(yield (0, pdas_1.getCollateralInfoPda)(address, this.context.program.programId));
            // @ts-ignore
            return tokenAccount.amount.sub(collateralInfo.lockedTokensAmount);
        });
    }
}
exports.CollateralMint = CollateralMint;
class Rfq {
    constructor(context, account, legs) {
        this.context = context;
        this.account = account;
        this.legs = legs;
    }
    respond({ bid = null, ask = null } = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            if (bid === null && ask === null) {
                bid = types_1.Quote.getStandart(constants_1.DEFAULT_PRICE, constants_1.DEFAULT_LEG_MULTIPLIER);
            }
            const response = new web3_js_1.Keypair();
            yield this.context.program.methods
                .respondToRfq(bid, ask)
                .accounts({
                maker: this.context.maker.publicKey,
                protocol: this.context.protocolPda,
                rfq: this.account,
                response: response.publicKey,
                collateralInfo: yield (0, pdas_1.getCollateralInfoPda)(this.context.maker.publicKey, this.context.program.programId),
                collateralToken: yield (0, pdas_1.getCollateralTokenPda)(this.context.maker.publicKey, this.context.program.programId),
                riskEngine: this.context.riskEngine.programId,
                systemProgram: web3_js_1.SystemProgram.programId,
            })
                .signers([this.context.maker, response])
                .rpc();
            return new Response(this.context, this, this.context.maker, response.publicKey);
        });
    }
    unlockCollateral() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.context.program.methods
                .unlockRfqCollateral()
                .accounts({
                protocol: this.context.protocolPda,
                rfq: this.account,
                collateralInfo: yield (0, pdas_1.getCollateralInfoPda)(this.context.taker.publicKey, this.context.program.programId),
            })
                .rpc();
        });
    }
    cleanUp() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.context.program.methods
                .cleanUpRfq()
                .accounts({
                taker: this.context.taker.publicKey,
                protocol: this.context.protocolPda,
                rfq: this.account,
            })
                .rpc();
        });
    }
    cancel() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.context.program.methods
                .cancelRfq()
                .accounts({
                taker: this.context.taker.publicKey,
                protocol: this.context.protocolPda,
                rfq: this.account,
            })
                .signers([this.context.taker])
                .rpc();
        });
    }
    addLegs(legs, finalize = true) {
        return __awaiter(this, void 0, void 0, function* () {
            this.legs = this.legs.concat(legs);
            const legData = yield Promise.all(legs.map((x) => __awaiter(this, void 0, void 0, function* () { return yield x.toLegData(); })));
            const remainingAccounts = yield (yield Promise.all(legs.map((x) => __awaiter(this, void 0, void 0, function* () { return yield x.getValidationAccounts(); })))).flat();
            let txConstructor = this.context.program.methods
                .addLegsToRfq(legData)
                .accounts({
                taker: this.context.taker.publicKey,
                protocol: this.context.protocolPda,
                rfq: this.account,
            })
                .remainingAccounts(remainingAccounts)
                .signers([this.context.taker]);
            if (finalize) {
                txConstructor = txConstructor.postInstructions([yield this.getFinalizeRfqInstruction()]);
            }
            yield txConstructor.rpc();
        });
    }
    getFinalizeRfqInstruction() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.context.program.methods
                .finalizeRfqConstruction()
                .accounts({
                taker: this.context.taker.publicKey,
                protocol: this.context.protocolPda,
                rfq: this.account,
                collateralInfo: yield (0, pdas_1.getCollateralInfoPda)(this.context.taker.publicKey, this.context.program.programId),
                collateralToken: yield (0, pdas_1.getCollateralTokenPda)(this.context.taker.publicKey, this.context.program.programId),
                riskEngine: this.context.riskEngine.programId,
            })
                .signers([this.context.taker])
                .instruction();
        });
    }
    getData() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.context.program.account.rfq.fetch(this.account);
        });
    }
}
exports.Rfq = Rfq;
class Response {
    constructor(context, rfq, maker, account) {
        this.context = context;
        this.rfq = rfq;
        this.maker = maker;
        this.account = account;
        this.firstToPrepare = web3_js_1.PublicKey.default;
    }
    confirm({ side = null, legMultiplierBps = null } = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.context.program.methods
                .confirmResponse(side !== null && side !== void 0 ? side : types_1.Side.Bid, legMultiplierBps)
                .accounts({
                taker: this.context.taker.publicKey,
                protocol: this.context.protocolPda,
                rfq: this.rfq.account,
                response: this.account,
                collateralInfo: yield (0, pdas_1.getCollateralInfoPda)(this.context.taker.publicKey, this.context.program.programId),
                makerCollateralInfo: yield (0, pdas_1.getCollateralInfoPda)(this.context.maker.publicKey, this.context.program.programId),
                collateralToken: yield (0, pdas_1.getCollateralTokenPda)(this.context.taker.publicKey, this.context.program.programId),
                riskEngine: this.context.riskEngine.programId,
            })
                .signers([this.context.taker])
                .rpc();
        });
    }
    prepareSettlement(side, legAmount = this.rfq.legs.length) {
        return __awaiter(this, void 0, void 0, function* () {
            const caller = side == types_1.AuthoritySide.Taker ? this.context.taker : this.context.maker;
            if (this.firstToPrepare.equals(web3_js_1.PublicKey.default)) {
                this.firstToPrepare = caller.publicKey;
            }
            const remainingAccounts = yield (yield Promise.all(this.rfq.legs
                .slice(0, legAmount)
                .map((x, index) => __awaiter(this, void 0, void 0, function* () { return yield x.getPrepareSettlementAccounts(side, index, this.rfq, this); })))).flat();
            yield this.context.program.methods
                .prepareSettlement(side, legAmount)
                .accounts({
                caller: caller.publicKey,
                quoteTokens: yield this.context.quoteToken.getAssociatedAddress(caller.publicKey),
                protocol: this.context.protocolPda,
                rfq: this.rfq.account,
                response: this.account,
                quoteMint: this.context.quoteToken.publicKey,
                quoteEscrow: yield (0, pdas_1.getQuoteEscrowPda)(this.account, this.context.program.programId),
                systemProgram: web3_js_1.SystemProgram.programId,
                tokenProgram: spl_token_1.TOKEN_PROGRAM_ID,
                rent: web3_js_1.SYSVAR_RENT_PUBKEY,
            })
                .signers([caller])
                .remainingAccounts(remainingAccounts)
                .rpc();
        });
    }
    prepareMoreLegsSettlement(side, from, legAmount) {
        return __awaiter(this, void 0, void 0, function* () {
            const caller = side == types_1.AuthoritySide.Taker ? this.context.taker : this.context.maker;
            const remainingAccounts = yield (yield Promise.all(this.rfq.legs
                .slice(from, from + legAmount)
                .map((x, index) => __awaiter(this, void 0, void 0, function* () { return yield x.getPrepareSettlementAccounts(side, from + index, this.rfq, this); })))).flat();
            yield this.context.program.methods
                .prepareMoreLegsSettlement(side, legAmount)
                .accounts({
                caller: caller.publicKey,
                protocol: this.context.protocolPda,
                rfq: this.rfq.account,
                response: this.account,
            })
                .signers([caller])
                .remainingAccounts(remainingAccounts)
                .rpc();
        });
    }
    settle(quoteReceiver, assetReceivers, alreadySettledLegs = 0) {
        return __awaiter(this, void 0, void 0, function* () {
            const remainingAccounts = yield (yield Promise.all(this.rfq.legs
                .slice(alreadySettledLegs)
                .map((x, index) => __awaiter(this, void 0, void 0, function* () { return yield x.getSettleAccounts(assetReceivers[index], alreadySettledLegs + index, this.rfq, this); })))).flat();
            yield this.context.program.methods
                .settle()
                .accounts({
                protocol: this.context.protocolPda,
                rfq: this.rfq.account,
                response: this.account,
                quoteReceiverTokens: yield this.context.quoteToken.getAssociatedAddress(quoteReceiver),
                quoteEscrow: yield (0, pdas_1.getQuoteEscrowPda)(this.account, this.context.program.programId),
                tokenProgram: spl_token_1.TOKEN_PROGRAM_ID,
            })
                .remainingAccounts(remainingAccounts)
                .rpc();
        });
    }
    partiallySettleLegs(assetReceivers, legsToSettle, alreadySettledLegs = 0) {
        return __awaiter(this, void 0, void 0, function* () {
            const remainingAccounts = yield (yield Promise.all(this.rfq.legs
                .slice(alreadySettledLegs, alreadySettledLegs + legsToSettle)
                .map((x, index) => __awaiter(this, void 0, void 0, function* () { return yield x.getSettleAccounts(assetReceivers[index], alreadySettledLegs + index, this.rfq, this); })))).flat();
            yield this.context.program.methods
                .partiallySettleLegs(legsToSettle)
                .accounts({
                protocol: this.context.protocolPda,
                rfq: this.rfq.account,
                response: this.account,
            })
                .remainingAccounts(remainingAccounts)
                .rpc();
        });
    }
    revertSettlementPreparation(side, preparedLegs = this.rfq.legs.length) {
        return __awaiter(this, void 0, void 0, function* () {
            const caller = side == types_1.AuthoritySide.Taker ? this.context.taker : this.context.maker;
            const remainingAccounts = yield (yield Promise.all(this.rfq.legs
                .slice(0, preparedLegs)
                .map((x, index) => __awaiter(this, void 0, void 0, function* () { return yield x.getRevertSettlementPreparationAccounts(side, index, this.rfq, this); })))).flat();
            yield this.context.program.methods
                .revertSettlementPreparation(side)
                .accounts({
                protocol: this.context.protocolPda,
                rfq: this.rfq.account,
                response: this.account,
                quoteTokens: yield this.context.quoteToken.getAssociatedAddress(caller.publicKey),
                quoteEscrow: yield (0, pdas_1.getQuoteEscrowPda)(this.account, this.context.program.programId),
                tokenProgram: spl_token_1.TOKEN_PROGRAM_ID,
            })
                .remainingAccounts(remainingAccounts)
                .rpc();
        });
    }
    partlyRevertSettlementPreparation(side, legAmount, preparedLegs = this.rfq.legs.length) {
        return __awaiter(this, void 0, void 0, function* () {
            const remainingAccounts = yield (yield Promise.all(this.rfq.legs
                .slice(preparedLegs - legAmount, preparedLegs)
                .map((x, index) => __awaiter(this, void 0, void 0, function* () { return yield x.getRevertSettlementPreparationAccounts(side, preparedLegs - legAmount + index, this.rfq, this); })))).flat();
            yield this.context.program.methods
                .partlyRevertSettlementPreparation(side, legAmount)
                .accounts({
                protocol: this.context.protocolPda,
                rfq: this.rfq.account,
                response: this.account,
            })
                .remainingAccounts(remainingAccounts)
                .rpc();
        });
    }
    unlockResponseCollateral() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.context.program.methods
                .unlockResponseCollateral()
                .accounts({
                protocol: this.context.protocolPda,
                rfq: this.rfq.account,
                response: this.account,
                takerCollateralInfo: yield (0, pdas_1.getCollateralInfoPda)(this.context.taker.publicKey, this.context.program.programId),
                makerCollateralInfo: yield (0, pdas_1.getCollateralInfoPda)(this.context.maker.publicKey, this.context.program.programId),
            })
                .rpc();
        });
    }
    settleOnePartyDefault() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.context.program.methods
                .settleOnePartyDefault()
                .accounts({
                protocol: this.context.protocolPda,
                rfq: this.rfq.account,
                response: this.account,
                takerCollateralInfo: yield (0, pdas_1.getCollateralInfoPda)(this.context.taker.publicKey, this.context.program.programId),
                makerCollateralInfo: yield (0, pdas_1.getCollateralInfoPda)(this.context.maker.publicKey, this.context.program.programId),
                takerCollateralTokens: yield (0, pdas_1.getCollateralTokenPda)(this.context.taker.publicKey, this.context.program.programId),
                makerCollateralTokens: yield (0, pdas_1.getCollateralTokenPda)(this.context.maker.publicKey, this.context.program.programId),
                tokenProgram: spl_token_1.TOKEN_PROGRAM_ID,
            })
                .rpc();
        });
    }
    settleTwoPartyDefault() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.context.program.methods
                .settleTwoPartyDefault()
                .accounts({
                protocol: this.context.protocolPda,
                rfq: this.rfq.account,
                response: this.account,
                takerCollateralInfo: yield (0, pdas_1.getCollateralInfoPda)(this.context.taker.publicKey, this.context.program.programId),
                makerCollateralInfo: yield (0, pdas_1.getCollateralInfoPda)(this.context.maker.publicKey, this.context.program.programId),
                takerCollateralTokens: yield (0, pdas_1.getCollateralTokenPda)(this.context.taker.publicKey, this.context.program.programId),
                makerCollateralTokens: yield (0, pdas_1.getCollateralTokenPda)(this.context.maker.publicKey, this.context.program.programId),
                protocolCollateralTokens: yield (0, pdas_1.getCollateralTokenPda)(this.context.dao.publicKey, this.context.program.programId),
                tokenProgram: spl_token_1.TOKEN_PROGRAM_ID,
            })
                .rpc();
        });
    }
    cleanUp(preparedLegs = this.rfq.legs.length) {
        return __awaiter(this, void 0, void 0, function* () {
            let remainingAccounts = [];
            if (this.firstToPrepare) {
                remainingAccounts = yield (yield Promise.all(this.rfq.legs
                    .slice(0, preparedLegs)
                    .map((x, index) => __awaiter(this, void 0, void 0, function* () { return yield x.getCleanUpAccounts(index, this.rfq, this); })))).flat();
            }
            yield this.context.program.methods
                .cleanUpResponse()
                .accounts({
                maker: this.context.maker.publicKey,
                firstToPrepareQuote: this.firstToPrepare,
                protocol: this.context.protocolPda,
                rfq: this.rfq.account,
                response: this.account,
                quoteEscrow: yield (0, pdas_1.getQuoteEscrowPda)(this.account, this.context.program.programId),
                quoteBackupTokens: yield this.context.quoteToken.getAssociatedAddress(this.context.dao.publicKey),
                tokenProgram: spl_token_1.TOKEN_PROGRAM_ID,
            })
                .remainingAccounts(remainingAccounts)
                .rpc();
        });
    }
    cleanUpLegs(legAmount, preparedLegs = this.rfq.legs.length) {
        return __awaiter(this, void 0, void 0, function* () {
            let remainingAccounts = [];
            if (this.firstToPrepare) {
                remainingAccounts = yield (yield Promise.all(this.rfq.legs
                    .slice(preparedLegs - legAmount, preparedLegs)
                    .map((x, index) => __awaiter(this, void 0, void 0, function* () { return yield x.getCleanUpAccounts(preparedLegs - legAmount + index, this.rfq, this); })))).flat();
            }
            yield this.context.program.methods
                .cleanUpResponseLegs(legAmount)
                .accounts({
                protocol: this.context.protocolPda,
                rfq: this.rfq.account,
                response: this.account,
            })
                .remainingAccounts(remainingAccounts)
                .rpc();
        });
    }
    cancel() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.context.program.methods
                .cancelResponse()
                .accounts({
                maker: this.context.maker.publicKey,
                protocol: this.context.protocolPda,
                rfq: this.rfq.account,
                response: this.account,
            })
                .signers([this.context.maker])
                .rpc();
        });
    }
    getData() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.context.program.account.response.fetch(this.account);
        });
    }
}
exports.Response = Response;
let context = null;
function getContext() {
    return __awaiter(this, void 0, void 0, function* () {
        if (context !== null) {
            return context;
        }
        context = new Context();
        yield context.initialize();
        yield context.initializeProtocol();
        yield (0, helpers_1.executeInParallel)(() => __awaiter(this, void 0, void 0, function* () {
            yield spotInstrument_1.SpotInstrument.addInstrument(context);
        }), () => __awaiter(this, void 0, void 0, function* () {
            yield psyoptionsEuropeanInstrument_1.PsyoptionsEuropeanInstrument.addInstrument(context);
        }), () => __awaiter(this, void 0, void 0, function* () {
            yield psyoptionsAmericanInstrument_1.PsyoptionsAmericanInstrument.addInstrument(context);
        }), () => __awaiter(this, void 0, void 0, function* () {
            yield context.initializeCollateral(context.taker);
            yield context.fundCollateral(context.taker, constants_1.DEFAULT_COLLATERAL_FUNDED);
        }), () => __awaiter(this, void 0, void 0, function* () {
            yield context.initializeCollateral(context.maker);
            yield context.fundCollateral(context.maker, constants_1.DEFAULT_COLLATERAL_FUNDED);
        }), () => __awaiter(this, void 0, void 0, function* () {
            yield context.initializeCollateral(context.dao);
        }));
        return context;
    });
}
exports.getContext = getContext;
