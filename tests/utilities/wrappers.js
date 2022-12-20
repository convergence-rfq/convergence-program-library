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
exports.getContext = exports.Response = exports.Rfq = exports.CollateralMint = exports.Mint = exports.RiskEngine = exports.Context = void 0;
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
class Context {
    constructor() {
        this.provider = anchor.AnchorProvider.env();
        anchor.setProvider(this.provider);
        this.program = anchor.workspace.Rfq;
        this.riskEngine = new RiskEngine(this);
        this.baseAssets = {};
    }
    initialize() {
        return __awaiter(this, void 0, void 0, function* () {
            yield (0, helpers_1.executeInParallel)(() => __awaiter(this, void 0, void 0, function* () { return (this.dao = yield this.createPayer()); }), () => __awaiter(this, void 0, void 0, function* () { return (this.taker = yield this.createPayer()); }), () => __awaiter(this, void 0, void 0, function* () { return (this.maker = yield this.createPayer()); }));
            this.protocolPda = yield (0, pdas_1.getProtocolPda)(this.program.programId);
            yield (0, helpers_1.executeInParallel)(() => __awaiter(this, void 0, void 0, function* () { return (this.assetToken = yield Mint.create(this)); }), () => __awaiter(this, void 0, void 0, function* () { return (this.additionalAssetToken = yield Mint.create(this)); }), () => __awaiter(this, void 0, void 0, function* () { return (this.quoteToken = yield Mint.create(this)); }), () => __awaiter(this, void 0, void 0, function* () { return (this.collateralToken = yield CollateralMint.create(this)); }));
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
            return yield spl_token_1.Token.createMint(this.provider.connection, this.dao, this.dao.publicKey, null, constants_1.DEFAULT_MINT_DECIMALS, spl_token_1.TOKEN_PROGRAM_ID);
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
    addInstrument(programId, canBeUsedAsQuote, validateDataAccounts, prepareToSettleAccounts, settleAccounts, revertPreparationAccounts, cleanUpAccounts) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.program.methods
                .addInstrument(canBeUsedAsQuote, validateDataAccounts, prepareToSettleAccounts, settleAccounts, revertPreparationAccounts, cleanUpAccounts)
                .accounts({
                authority: this.dao.publicKey,
                protocol: this.protocolPda,
                instrumentProgram: programId,
            })
                .signers([this.dao])
                .rpc();
        });
    }
    addBaseAsset(baseAssetIndex, ticker, riskCategory, oracle) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.program.methods // @ts-ignore Strange error with anchor IDL parsing
                .addBaseAsset({ value: baseAssetIndex }, ticker, (0, types_1.riskCategoryToObject)(riskCategory), {
                switchboard: { address: oracle },
            })
                .accounts({
                authority: this.dao.publicKey,
                protocol: this.protocolPda,
                baseAsset: yield (0, pdas_1.getBaseAssetPda)(baseAssetIndex, this.program.programId),
                systemProgram: web3_js_1.SystemProgram.programId,
            })
                .signers([this.dao])
                .rpc();
            this.baseAssets[baseAssetIndex] = {
                oracleAddress: oracle,
            };
        });
    }
    registerMint(mint, baseAssetIndex) {
        return __awaiter(this, void 0, void 0, function* () {
            let baseAsset = web3_js_1.PublicKey.default;
            if (baseAssetIndex !== null) {
                baseAsset = yield (0, pdas_1.getBaseAssetPda)(baseAssetIndex, this.program.programId);
            }
            yield this.program.methods
                .registerMint()
                .accounts({
                authority: this.dao.publicKey,
                protocol: this.protocolPda,
                mintInfo: yield (0, pdas_1.getMintInfoPda)(mint.publicKey, this.program.programId),
                baseAsset,
                systemProgram: web3_js_1.SystemProgram.programId,
                mint: mint.publicKey,
            })
                .signers([this.dao])
                .rpc();
        });
    }
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
    createRfq({ legs = [spotInstrument_1.SpotInstrument.createForLeg(this)], quote = spotInstrument_1.SpotInstrument.createForQuote(this, this.quoteToken), orderType = null, fixedSize = null, activeWindow = constants_1.DEFAULT_ACTIVE_WINDOW, settlingWindow = constants_1.DEFAULT_SETTLING_WINDOW, legsSize = null, finalize = true, } = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            orderType = orderType !== null && orderType !== void 0 ? orderType : constants_1.DEFAULT_ORDER_TYPE;
            fixedSize = fixedSize !== null && fixedSize !== void 0 ? fixedSize : types_1.FixedSize.None;
            legsSize = legsSize !== null && legsSize !== void 0 ? legsSize : (0, helpers_1.calculateLegsSize)(legs);
            const legData = legs.map((x) => x.toLegData());
            const quoteAccounts = yield quote.getValidationAccounts();
            const legAccounts = yield (yield Promise.all(legs.map((x) => __awaiter(this, void 0, void 0, function* () { return yield x.getValidationAccounts(); })))).flat();
            const rfq = new web3_js_1.Keypair();
            const rfqObject = new Rfq(this, rfq.publicKey, quote, legs);
            let txConstructor = yield this.program.methods
                .createRfq(legsSize, legData, orderType, quote.toQuoteData(), fixedSize, activeWindow, settlingWindow)
                .accounts({
                taker: this.taker.publicKey,
                protocol: this.protocolPda,
                rfq: rfq.publicKey,
                systemProgram: web3_js_1.SystemProgram.programId,
            })
                .remainingAccounts([...quoteAccounts, ...legAccounts])
                .preInstructions([helpers_1.expandComputeUnits])
                .signers([this.taker, rfq]);
            if (finalize) {
                txConstructor = txConstructor.postInstructions([yield rfqObject.getFinalizeConstructionInstruction()]);
            }
            yield txConstructor.rpc();
            return rfqObject;
        });
    }
}
exports.Context = Context;
class RiskEngine {
    constructor(context) {
        this.context = context;
        this.program = anchor.workspace.RiskEngine;
        this.programId = this.program.programId;
    }
    initializeDefaultConfig() {
        return __awaiter(this, void 0, void 0, function* () {
            this.configAddress = yield (0, pdas_1.getRiskEngineConfig)(this.programId);
            yield this.program.methods
                .initializeConfig(constants_1.DEFAULT_COLLATERAL_FOR_VARIABLE_SIZE_RFQ, constants_1.DEFAULT_COLLATERAL_FOR_FIXED_QUOTE_AMOUNT_RFQ, constants_1.DEFAULT_MINT_DECIMALS, constants_1.DEFAULT_SAFETY_PRICE_SHIFT_FACTOR, constants_1.DEFAULT_OVERALL_SAFETY_FACTOR)
                .accounts({
                signer: this.context.dao.publicKey,
                config: this.configAddress,
                systemProgram: web3_js_1.SystemProgram.programId,
            })
                .signers([this.context.dao])
                .rpc();
            yield (0, helpers_1.executeInParallel)(() => __awaiter(this, void 0, void 0, function* () {
                yield this.setRiskCategoriesInfo([
                    { riskCategory: types_1.RiskCategory.VeryLow, newValue: constants_1.DEFAULT_RISK_CATEGORIES_INFO[0] },
                    { riskCategory: types_1.RiskCategory.Low, newValue: constants_1.DEFAULT_RISK_CATEGORIES_INFO[1] },
                    { riskCategory: types_1.RiskCategory.Medium, newValue: constants_1.DEFAULT_RISK_CATEGORIES_INFO[2] },
                ]);
            }), () => __awaiter(this, void 0, void 0, function* () {
                yield this.setRiskCategoriesInfo([
                    { riskCategory: types_1.RiskCategory.High, newValue: constants_1.DEFAULT_RISK_CATEGORIES_INFO[3] },
                    { riskCategory: types_1.RiskCategory.VeryHigh, newValue: constants_1.DEFAULT_RISK_CATEGORIES_INFO[4] },
                ]);
            }));
        });
    }
    updateConfig({ collateralForVariableSizeRfq = null, collateralForFixedQuoteAmountRfq = null, collateralMintDecimals = null, safetyPriceShiftFactor = null, overallSafetyFactor = null, } = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.program.methods
                .updateConfig(collateralForVariableSizeRfq, collateralForFixedQuoteAmountRfq, collateralMintDecimals, safetyPriceShiftFactor, overallSafetyFactor)
                .accounts({
                authority: this.context.dao.publicKey,
                protocol: this.context.protocolPda,
                config: this.configAddress,
            })
                .signers([this.context.dao])
                .rpc();
        });
    }
    setInstrumentType(program, instrumentType) {
        return __awaiter(this, void 0, void 0, function* () {
            let idlInstrumentType = null;
            if (instrumentType !== null) {
                idlInstrumentType = (0, types_1.instrumentTypeToObject)(instrumentType);
            }
            yield this.program.methods
                .setInstrumentType(program, idlInstrumentType)
                .accounts({
                authority: this.context.dao.publicKey,
                protocol: this.context.protocolPda,
                config: this.configAddress,
            })
                .signers([this.context.dao])
                .rpc();
        });
    }
    setRiskCategoriesInfo(changes) {
        return __awaiter(this, void 0, void 0, function* () {
            let changesForInstruction = changes.map((x) => {
                return {
                    riskCategoryIndex: x.riskCategory.valueOf(),
                    newValue: x.newValue,
                };
            });
            yield this.program.methods
                .setRiskCategoriesInfo(changesForInstruction)
                .accounts({
                authority: this.context.dao.publicKey,
                protocol: this.context.protocolPda,
                config: this.configAddress,
            })
                .signers([this.context.dao])
                .rpc();
        });
    }
    getConfig() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.program.account.config.fetch(this.configAddress);
        });
    }
}
exports.RiskEngine = RiskEngine;
class Mint {
    constructor(context, token) {
        this.context = context;
        this.token = token;
        this.publicKey = token.publicKey;
        this.decimals = constants_1.DEFAULT_MINT_DECIMALS;
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
    register(baseAssetIndex) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.context.registerMint(this, baseAssetIndex);
            this.baseAssetIndex = baseAssetIndex;
            this.mintInfoAddress = yield (0, pdas_1.getMintInfoPda)(this.publicKey, this.context.program.programId);
        });
    }
    createAssociatedAccountWithTokens(address, amount = constants_1.DEFAULT_TOKEN_AMOUNT) {
        return __awaiter(this, void 0, void 0, function* () {
            const account = yield this.token.createAssociatedTokenAccount(address);
            yield this.token.mintTo(account, this.context.dao, [], amount.toString());
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
    assertRegistered() {
        if (this.baseAssetIndex === undefined) {
            throw new Error(`Mint ${this.publicKey.toString()} is not registered!`);
        }
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
    constructor(context, account, quote, legs) {
        this.context = context;
        this.account = account;
        this.quote = quote;
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
                .remainingAccounts(yield this.getRiskEngineAccounts())
                .signers([this.context.maker, response])
                .preInstructions([helpers_1.expandComputeUnits])
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
            const legData = legs.map((x) => x.toLegData());
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
                txConstructor = txConstructor.postInstructions([yield this.getFinalizeConstructionInstruction()]);
            }
            yield txConstructor.rpc();
        });
    }
    finalizeConstruction() {
        return __awaiter(this, void 0, void 0, function* () {
            let instruction = yield this.getFinalizeConstructionInstruction();
            let transaction = new web3_js_1.Transaction().add(instruction);
            yield this.context.program.provider.sendAndConfirm(transaction, [this.context.taker]);
        });
    }
    getFinalizeConstructionInstruction() {
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
                .remainingAccounts(yield this.getRiskEngineAccounts())
                .instruction();
        });
    }
    getData() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.context.program.account.rfq.fetch(this.account);
        });
    }
    getRiskEngineAccounts() {
        return __awaiter(this, void 0, void 0, function* () {
            const config = { pubkey: this.context.riskEngine.configAddress, isSigner: false, isWritable: false };
            let uniqueIndecies = Array.from(new Set(this.legs.map((leg) => leg.getBaseAssetIndex())));
            const addresses = yield Promise.all(uniqueIndecies.map((index) => (0, pdas_1.getBaseAssetPda)(index, this.context.program.programId)));
            const baseAssets = addresses.map((address) => {
                return { pubkey: address, isSigner: false, isWritable: false };
            });
            const oracles = uniqueIndecies
                .map((index) => context.baseAssets[index].oracleAddress)
                .map((address) => {
                return { pubkey: address, isSigner: false, isWritable: false };
            });
            return [config, ...baseAssets, ...oracles];
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
                .remainingAccounts(yield this.rfq.getRiskEngineAccounts())
                .preInstructions([helpers_1.expandComputeUnits])
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
            const quoteAccounts = yield this.rfq.quote.getPrepareSettlementAccounts(side, "quote", this.rfq, this);
            const legAccounts = yield (yield Promise.all(this.rfq.legs
                .slice(0, legAmount)
                .map((x, index) => __awaiter(this, void 0, void 0, function* () { return yield x.getPrepareSettlementAccounts(side, { legIndex: index }, this.rfq, this); })))).flat();
            yield this.context.program.methods
                .prepareSettlement(side, legAmount)
                .accounts({
                caller: caller.publicKey,
                protocol: this.context.protocolPda,
                rfq: this.rfq.account,
                response: this.account,
            })
                .signers([caller])
                .remainingAccounts([...quoteAccounts, ...legAccounts])
                .preInstructions([helpers_1.expandComputeUnits])
                .rpc();
        });
    }
    prepareMoreLegsSettlement(side, from, legAmount) {
        return __awaiter(this, void 0, void 0, function* () {
            const caller = side == types_1.AuthoritySide.Taker ? this.context.taker : this.context.maker;
            const remainingAccounts = yield (yield Promise.all(this.rfq.legs
                .slice(from, from + legAmount)
                .map((x, index) => __awaiter(this, void 0, void 0, function* () { return yield x.getPrepareSettlementAccounts(side, { legIndex: from + index }, this.rfq, this); })))).flat();
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
            const quoteAccounts = yield this.rfq.quote.getSettleAccounts(quoteReceiver, "quote", this.rfq, this);
            const legAccounts = yield (yield Promise.all(this.rfq.legs
                .slice(alreadySettledLegs)
                .map((x, index) => __awaiter(this, void 0, void 0, function* () { return yield x.getSettleAccounts(assetReceivers[index], { legIndex: alreadySettledLegs + index }, this.rfq, this); })))).flat();
            yield this.context.program.methods
                .settle()
                .accounts({
                protocol: this.context.protocolPda,
                rfq: this.rfq.account,
                response: this.account,
            })
                .remainingAccounts([...legAccounts, ...quoteAccounts])
                .rpc();
        });
    }
    partiallySettleLegs(assetReceivers, legsToSettle, alreadySettledLegs = 0) {
        return __awaiter(this, void 0, void 0, function* () {
            const remainingAccounts = yield (yield Promise.all(this.rfq.legs
                .slice(alreadySettledLegs, alreadySettledLegs + legsToSettle)
                .map((x, index) => __awaiter(this, void 0, void 0, function* () { return yield x.getSettleAccounts(assetReceivers[index], { legIndex: alreadySettledLegs + index }, this.rfq, this); })))).flat();
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
            const quoteAccounts = yield this.rfq.quote.getRevertSettlementPreparationAccounts(side, "quote", this.rfq, this);
            const legAccounts = yield (yield Promise.all(this.rfq.legs
                .slice(0, preparedLegs)
                .map((x, index) => __awaiter(this, void 0, void 0, function* () { return yield x.getRevertSettlementPreparationAccounts(side, { legIndex: index }, this.rfq, this); })))).flat();
            const remainingAccounts = [...legAccounts, ...quoteAccounts];
            yield this.context.program.methods
                .revertSettlementPreparation(side)
                .accounts({
                protocol: this.context.protocolPda,
                rfq: this.rfq.account,
                response: this.account,
            })
                .remainingAccounts(remainingAccounts)
                .rpc();
        });
    }
    partlyRevertSettlementPreparation(side, legAmount, preparedLegs = this.rfq.legs.length) {
        return __awaiter(this, void 0, void 0, function* () {
            const remainingAccounts = yield (yield Promise.all(this.rfq.legs
                .slice(preparedLegs - legAmount, preparedLegs)
                .map((x, index) => __awaiter(this, void 0, void 0, function* () {
                return yield x.getRevertSettlementPreparationAccounts(side, { legIndex: preparedLegs - legAmount + index }, this.rfq, this);
            })))).flat();
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
                const quoteAccounts = yield this.rfq.quote.getCleanUpAccounts("quote", this.rfq, this);
                const legAccounts = yield (yield Promise.all(this.rfq.legs
                    .slice(0, preparedLegs)
                    .map((x, index) => __awaiter(this, void 0, void 0, function* () { return yield x.getCleanUpAccounts({ legIndex: index }, this.rfq, this); })))).flat();
                remainingAccounts = [...legAccounts, ...quoteAccounts];
            }
            yield this.context.program.methods
                .cleanUpResponse()
                .accounts({
                maker: this.context.maker.publicKey,
                protocol: this.context.protocolPda,
                rfq: this.rfq.account,
                response: this.account,
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
                    .map((x, index) => __awaiter(this, void 0, void 0, function* () { return yield x.getCleanUpAccounts({ legIndex: preparedLegs - legAmount + index }, this.rfq, this); })))).flat();
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
            yield context.riskEngine.initializeDefaultConfig();
        }), () => __awaiter(this, void 0, void 0, function* () {
            yield spotInstrument_1.SpotInstrument.addInstrument(context);
        }), () => __awaiter(this, void 0, void 0, function* () {
            yield psyoptionsEuropeanInstrument_1.PsyoptionsEuropeanInstrument.addInstrument(context);
        }), () => __awaiter(this, void 0, void 0, function* () {
            yield context.initializeCollateral(context.taker);
            yield context.fundCollateral(context.taker, constants_1.DEFAULT_COLLATERAL_FUNDED);
        }), () => __awaiter(this, void 0, void 0, function* () {
            yield context.initializeCollateral(context.maker);
            yield context.fundCollateral(context.maker, constants_1.DEFAULT_COLLATERAL_FUNDED);
        }), () => __awaiter(this, void 0, void 0, function* () {
            yield context.initializeCollateral(context.dao);
        }), () => __awaiter(this, void 0, void 0, function* () {
            yield context.addBaseAsset(constants_1.BITCOIN_BASE_ASSET_INDEX, "BTC", types_1.RiskCategory.VeryLow, constants_1.SWITCHBOARD_BTC_ORACLE);
            yield context.assetToken.register(constants_1.BITCOIN_BASE_ASSET_INDEX);
        }), () => __awaiter(this, void 0, void 0, function* () {
            yield context.addBaseAsset(constants_1.SOLANA_BASE_ASSET_INDEX, "SOL", types_1.RiskCategory.Medium, constants_1.SWITCHBOARD_SOL_ORACLE);
            yield context.additionalAssetToken.register(constants_1.SOLANA_BASE_ASSET_INDEX);
        }), () => __awaiter(this, void 0, void 0, function* () {
            yield context.quoteToken.register(null);
        }));
        return context;
    });
}
exports.getContext = getContext;
