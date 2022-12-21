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
const anchor_1 = require("@project-serum/anchor");
const src_1 = require("../dependencies/tokenized-euros/src");
const constants_1 = require("../utilities/constants");
const helpers_1 = require("../utilities/helpers");
const psyoptionsEuropeanInstrument_1 = require("../utilities/instruments/psyoptionsEuropeanInstrument");
const spotInstrument_1 = require("../utilities/instruments/spotInstrument");
const types_1 = require("../utilities/types");
const wrappers_1 = require("../utilities/wrappers");
describe("Required collateral calculation and lock", () => {
    let context;
    let taker;
    let maker;
    let dao;
    before(() => __awaiter(void 0, void 0, void 0, function* () {
        context = yield (0, wrappers_1.getContext)();
        taker = context.taker.publicKey;
        maker = context.maker.publicKey;
        dao = context.dao.publicKey;
    }));
    it("Correct collateral locked for variable size rfq creation", () => __awaiter(void 0, void 0, void 0, function* () {
        let measurer = yield helpers_1.TokenChangeMeasurer.takeSnapshot(context, ["unlockedCollateral"], [taker]);
        yield context.createRfq({ fixedSize: types_1.FixedSize.None });
        yield measurer.expectChange([
            { token: "unlockedCollateral", user: taker, delta: constants_1.DEFAULT_COLLATERAL_FOR_VARIABLE_SIZE_RFQ.neg() },
        ]);
    }));
    it("Correct collateral locked for fixed quote asset size rfq creation", () => __awaiter(void 0, void 0, void 0, function* () {
        let measurer = yield helpers_1.TokenChangeMeasurer.takeSnapshot(context, ["unlockedCollateral"], [taker]);
        yield context.createRfq({ fixedSize: types_1.FixedSize.getQuoteAsset((0, helpers_1.withTokenDecimals)(5)) });
        yield measurer.expectChange([
            { token: "unlockedCollateral", user: taker, delta: constants_1.DEFAULT_COLLATERAL_FOR_FIXED_QUOTE_AMOUNT_RFQ.neg() },
        ]);
    }));
    it("Correct collateral locked for fixed leg structure size spot rfq creation", () => __awaiter(void 0, void 0, void 0, function* () {
        let measurer = yield helpers_1.TokenChangeMeasurer.takeSnapshot(context, ["unlockedCollateral"], [taker]);
        // 1 bitcoin with price of 20k$
        yield context.createRfq({
            orderType: types_1.OrderType.TwoWay,
            legs: [
                spotInstrument_1.SpotInstrument.createForLeg(context, {
                    mint: context.assetToken,
                    amount: (0, helpers_1.withTokenDecimals)(1),
                    side: types_1.Side.Bid,
                }),
            ],
            fixedSize: types_1.FixedSize.getBaseAsset((0, helpers_1.toLegMultiplier)(1)),
        });
        yield measurer.expectChange([{ token: "unlockedCollateral", user: taker, delta: (0, helpers_1.withTokenDecimals)(-660) }]);
    }));
    it("Correct collateral locked for responding to spot rfq", () => __awaiter(void 0, void 0, void 0, function* () {
        // solana rfq with 20 tokens in the leg
        const rfq = yield context.createRfq({
            orderType: types_1.OrderType.TwoWay,
            legs: [
                spotInstrument_1.SpotInstrument.createForLeg(context, {
                    mint: context.additionalAssetToken,
                    amount: (0, helpers_1.withTokenDecimals)(20),
                    side: types_1.Side.Bid,
                }),
            ],
            fixedSize: types_1.FixedSize.None,
        });
        let measurer = yield helpers_1.TokenChangeMeasurer.takeSnapshot(context, ["unlockedCollateral"], [maker]);
        // respond with leg multiplier of 2
        yield rfq.respond({ bid: types_1.Quote.getStandart((0, helpers_1.toAbsolutePrice)(new anchor_1.BN(20)), (0, helpers_1.toLegMultiplier)(2)) });
        yield measurer.expectChange([{ token: "unlockedCollateral", user: maker, delta: (0, helpers_1.withTokenDecimals)(-92.4) }]);
    }));
    it("Correct additional collateral locked for taker and unlocked for maker on lower confirmation", () => __awaiter(void 0, void 0, void 0, function* () {
        // bitcoin leg with the size of 1, solana leg with the size of 200
        const rfq = yield context.createRfq({
            orderType: types_1.OrderType.TwoWay,
            legs: [
                spotInstrument_1.SpotInstrument.createForLeg(context, {
                    mint: context.assetToken,
                    amount: (0, helpers_1.withTokenDecimals)(1),
                    side: types_1.Side.Bid,
                }),
                spotInstrument_1.SpotInstrument.createForLeg(context, {
                    mint: context.additionalAssetToken,
                    amount: (0, helpers_1.withTokenDecimals)(200),
                    side: types_1.Side.Ask,
                }),
            ],
            fixedSize: types_1.FixedSize.None,
        });
        // respond with leg multiplier of 2
        const response = yield rfq.respond({ bid: types_1.Quote.getStandart((0, helpers_1.toAbsolutePrice)(new anchor_1.BN(20)), (0, helpers_1.toLegMultiplier)(2)) });
        let measurer = yield helpers_1.TokenChangeMeasurer.takeSnapshot(context, ["unlockedCollateral"], [taker, maker]);
        // confirm multiplier leg multiplier of 1
        yield response.confirm({ side: types_1.Side.Bid, legMultiplierBps: (0, helpers_1.toLegMultiplier)(1) });
        let expectedCollateral = (0, helpers_1.withTokenDecimals)(1122);
        yield measurer.expectChange([
            {
                token: "unlockedCollateral",
                user: taker,
                delta: expectedCollateral.neg().add(constants_1.DEFAULT_COLLATERAL_FOR_VARIABLE_SIZE_RFQ),
            },
            { token: "unlockedCollateral", user: maker, delta: expectedCollateral },
        ]);
    }));
    it("Correct collateral locked for option rfq", () => __awaiter(void 0, void 0, void 0, function* () {
        const options = yield psyoptionsEuropeanInstrument_1.EuroOptionsFacade.initalizeNewOptionMeta(context, {
            underlyingMint: context.assetToken,
            stableMint: context.quoteToken,
            underlyingPerContract: (0, helpers_1.withTokenDecimals)(0.1),
            strikePrice: (0, helpers_1.withTokenDecimals)(22000),
            expireIn: 90 * 24 * 60 * 60, // 90 days
        });
        let measurer = yield helpers_1.TokenChangeMeasurer.takeSnapshot(context, ["unlockedCollateral"], [taker]);
        const rfq = yield context.createRfq({
            legs: [psyoptionsEuropeanInstrument_1.PsyoptionsEuropeanInstrument.create(context, options, src_1.OptionType.CALL, { amount: 10000, side: types_1.Side.Bid })],
            fixedSize: types_1.FixedSize.None,
        });
        const response = yield rfq.respond({ bid: types_1.Quote.getStandart((0, helpers_1.withTokenDecimals)(200), (0, helpers_1.toLegMultiplier)(3)) });
        yield response.confirm();
        yield measurer.expectChange([
            {
                token: "unlockedCollateral",
                user: taker,
                delta: (0, helpers_1.withTokenDecimals)(-194),
                precision: (0, helpers_1.withTokenDecimals)(1),
            },
        ]);
    }));
});
