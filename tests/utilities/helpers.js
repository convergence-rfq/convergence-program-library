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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenChangeMeasurer = exports.calculateLegsSize = exports.executeInParallel = exports.withTokenDecimals = exports.toLegMultiplier = exports.toAbsolutePrice = exports.sleep = exports.expectError = void 0;
const anchor_1 = require("@project-serum/anchor");
const bignumber_js_1 = require("bignumber.js");
const chai_1 = __importStar(require("chai"));
const chai_bn_1 = __importDefault(require("chai-bn"));
const constants_1 = require("./constants");
chai_1.default.use((0, chai_bn_1.default)(anchor_1.BN));
// This function supresses solana error traces making test output clearer
const expectError = (promise, errorText) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    // Disable error logs to prevent errors from blockchain validator spam
    const cachedStderrWrite = process.stdout.write;
    process.stderr.write = () => true;
    try {
        yield promise;
        throw new Error(`No error thrown!`);
    }
    catch (e) {
        // Restore error logs
        process.stderr.write = cachedStderrWrite;
        if (!(e === null || e === void 0 ? void 0 : e.message.includes(errorText)) && !((_a = e === null || e === void 0 ? void 0 : e.logs) === null || _a === void 0 ? void 0 : _a.some((e) => e.includes(errorText)))) {
            throw e;
        }
    }
});
exports.expectError = expectError;
const sleep = (ms) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};
exports.sleep = sleep;
function toAbsolutePrice(value) {
    return new anchor_1.BN(10).pow(new anchor_1.BN(constants_1.ABSOLUTE_PRICE_DECIMALS)).mul(value);
}
exports.toAbsolutePrice = toAbsolutePrice;
function toLegMultiplier(value) {
    let bignumber = new bignumber_js_1.BigNumber(value).multipliedBy(new bignumber_js_1.BigNumber(10).pow(constants_1.LEG_MULTIPLIER_DECIMALS));
    return new anchor_1.BN(bignumber.toString());
}
exports.toLegMultiplier = toLegMultiplier;
function withTokenDecimals(value) {
    let bignumber = new bignumber_js_1.BigNumber(value).multipliedBy(new bignumber_js_1.BigNumber(10).pow(9));
    return new anchor_1.BN(bignumber.toString());
}
exports.withTokenDecimals = withTokenDecimals;
function executeInParallel(...fns) {
    return Promise.all(fns.map((x) => x()));
}
exports.executeInParallel = executeInParallel;
function calculateLegsSize(legs) {
    return legs.map((leg) => constants_1.EMPTY_LEG_SIZE + leg.getInstrumendDataSize()).reduce((x, y) => x + y, 4);
}
exports.calculateLegsSize = calculateLegsSize;
class TokenChangeMeasurer {
    constructor(context, snapshots) {
        this.context = context;
        this.snapshots = snapshots;
    }
    static takeDefaultSnapshot(context) {
        return this.takeSnapshot(context, ["quote", "asset"], [context.taker.publicKey, context.maker.publicKey]);
    }
    static takeSnapshot(context, tokens, users) {
        return __awaiter(this, void 0, void 0, function* () {
            const snapshots = yield Promise.all(tokens.map((token) => __awaiter(this, void 0, void 0, function* () {
                return yield Promise.all(users.map((user) => __awaiter(this, void 0, void 0, function* () {
                    return {
                        token,
                        user,
                        balance: yield TokenChangeMeasurer.getValue(context, token, user),
                    };
                })));
            })));
            const flattened = snapshots.flat();
            return new TokenChangeMeasurer(context, flattened);
        });
    }
    static getValue(context, token, user) {
        if (token == "quote") {
            return context.quoteToken.getAssociatedBalance(user);
        }
        else if (token == "asset") {
            return context.assetToken.getAssociatedBalance(user);
        }
        else if (token == "unlockedCollateral") {
            return context.collateralToken.getUnlockedCollateral(user);
        }
        else if (token == "totalCollateral") {
            return context.collateralToken.getTotalCollateral(user);
        }
        else if (token == "walletCollateral") {
            return context.collateralToken.getAssociatedBalance(user);
        }
        else {
            return token.getAssociatedBalance(user);
        }
    }
    expectChange(changes) {
        return __awaiter(this, void 0, void 0, function* () {
            let extendedChanges = yield Promise.all(changes.map((change) => __awaiter(this, void 0, void 0, function* () {
                return Object.assign({ currentBalance: yield TokenChangeMeasurer.getValue(this.context, change.token, change.user) }, change);
            })));
            for (const change of extendedChanges) {
                const snapshot = this.snapshots.find((x) => x.token == change.token && x.user.equals(change.user));
                (0, chai_1.expect)(change.delta).to.be.bignumber.equal(change.currentBalance.sub(snapshot.balance), `Balance change differs from expected! Token: ${change.token.toString()}, user: ${change.user.toString()}, balance before: ${snapshot.balance.toString()}, balance currenty: ${change.currentBalance.toString()}, expected change: ${change.delta.toString()}`);
            }
        });
    }
}
exports.TokenChangeMeasurer = TokenChangeMeasurer;
