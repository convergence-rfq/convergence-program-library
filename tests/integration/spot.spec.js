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
const constants_1 = require("../utilities/constants");
const helpers_1 = require("../utilities/helpers");
const spotInstrument_1 = require("../utilities/instruments/spotInstrument");
const types_1 = require("../utilities/types");
const wrappers_1 = require("../utilities/wrappers");
describe("RFQ Spot instrument integration tests", () => {
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
    it("Create two-way RFQ with one spot leg, respond and settle as sell", () => __awaiter(void 0, void 0, void 0, function* () {
        let tokenMeasurer = yield helpers_1.TokenChangeMeasurer.takeDefaultSnapshot(context);
        // create a two way RFQ specifying 1 bitcoin as a leg
        const rfq = yield context.createRfq({
            legs: [spotInstrument_1.SpotInstrument.create(context, { amount: (0, helpers_1.withTokenDecimals)(1), side: types_1.Side.Bid })],
        });
        // response with agreeing to sell 2 bitcoins for 22k$ or buy 5 for 21900$
        const response = yield rfq.respond({
            bid: types_1.Quote.getStandart((0, helpers_1.toAbsolutePrice)((0, helpers_1.withTokenDecimals)(21900)), (0, helpers_1.toLegMultiplier)(5)),
            ask: types_1.Quote.getStandart((0, helpers_1.toAbsolutePrice)((0, helpers_1.withTokenDecimals)(22000)), (0, helpers_1.toLegMultiplier)(2)),
        });
        // taker confirms to buy 1 bitcoin
        yield response.confirm({ side: types_1.Side.Ask, legMultiplierBps: (0, helpers_1.toLegMultiplier)(1) });
        yield response.prepareSettlement(types_1.AuthoritySide.Taker);
        yield response.prepareSettlement(types_1.AuthoritySide.Maker);
        // taker should receive 1 bitcoins, maker should receive 22k$
        yield response.settle(maker, [taker]);
        yield tokenMeasurer.expectChange([
            { token: "asset", user: taker, delta: (0, helpers_1.withTokenDecimals)(1) },
            { token: "asset", user: maker, delta: (0, helpers_1.withTokenDecimals)(-1) },
            { token: "quote", user: taker, delta: (0, helpers_1.withTokenDecimals)(-22000) },
            { token: "quote", user: maker, delta: (0, helpers_1.withTokenDecimals)(22000) },
        ]);
        yield response.unlockResponseCollateral();
        yield response.cleanUp();
    }));
    it("Create sell RFQ with two spot legs, respond and settle multiple responses", () => __awaiter(void 0, void 0, void 0, function* () {
        const ethMint = yield wrappers_1.Mint.create(context);
        // create a sell RFQ specifying 5 bitcoin bid and 10 eth ask
        const rfq = yield context.createRfq({
            legs: [
                spotInstrument_1.SpotInstrument.create(context, { amount: (0, helpers_1.withTokenDecimals)(5), side: types_1.Side.Bid }),
                spotInstrument_1.SpotInstrument.create(context, { mint: ethMint, amount: (0, helpers_1.withTokenDecimals)(10), side: types_1.Side.Ask }),
            ],
            orderType: types_1.OrderType.Sell,
        });
        // respond with quote for half of legs
        const response = yield rfq.respond({
            bid: types_1.Quote.getStandart((0, helpers_1.toAbsolutePrice)((0, helpers_1.withTokenDecimals)(90000)), (0, helpers_1.toLegMultiplier)(0.5)),
        });
        // respond with quote for twice of legs once more with higher price
        const secondResponse = yield rfq.respond({
            bid: types_1.Quote.getStandart((0, helpers_1.toAbsolutePrice)((0, helpers_1.withTokenDecimals)(91000)), (0, helpers_1.toLegMultiplier)(2)),
        });
        // taker confirms first response, but only half of it
        yield response.confirm({ side: types_1.Side.Bid, legMultiplierBps: (0, helpers_1.toLegMultiplier)(0.25) });
        const firstMeasurer = yield helpers_1.TokenChangeMeasurer.takeSnapshot(context, ["asset", "quote", ethMint], [taker, maker]);
        yield response.prepareSettlement(types_1.AuthoritySide.Taker);
        yield response.prepareSettlement(types_1.AuthoritySide.Maker);
        // taker should spend 1.25 bitcoins, receive 2.5 eth and 22.5k$
        yield response.settle(taker, [maker, taker]);
        yield firstMeasurer.expectChange([
            { token: "asset", user: taker, delta: (0, helpers_1.withTokenDecimals)(-1.25) },
            { token: "asset", user: maker, delta: (0, helpers_1.withTokenDecimals)(1.25) },
            { token: ethMint, user: taker, delta: (0, helpers_1.withTokenDecimals)(2.5) },
            { token: ethMint, user: maker, delta: (0, helpers_1.withTokenDecimals)(-2.5) },
            { token: "quote", user: taker, delta: (0, helpers_1.withTokenDecimals)(22500) },
            { token: "quote", user: maker, delta: (0, helpers_1.withTokenDecimals)(-22500) },
        ]);
        yield response.unlockResponseCollateral();
        yield response.cleanUp();
        // taker confirms second response
        yield secondResponse.confirm({ side: types_1.Side.Bid });
        const secondMeasurer = yield helpers_1.TokenChangeMeasurer.takeSnapshot(context, ["asset", "quote", ethMint], [taker, maker]);
        yield secondResponse.prepareSettlement(types_1.AuthoritySide.Taker);
        yield secondResponse.prepareSettlement(types_1.AuthoritySide.Maker);
        // taker should spend 10 bitcoins, receive 20 eth and 182k$
        yield secondResponse.settle(taker, [maker, taker]);
        yield secondMeasurer.expectChange([
            { token: "asset", user: taker, delta: (0, helpers_1.withTokenDecimals)(-10) },
            { token: "asset", user: maker, delta: (0, helpers_1.withTokenDecimals)(10) },
            { token: ethMint, user: taker, delta: (0, helpers_1.withTokenDecimals)(20) },
            { token: ethMint, user: maker, delta: (0, helpers_1.withTokenDecimals)(-20) },
            { token: "quote", user: taker, delta: (0, helpers_1.withTokenDecimals)(182000) },
            { token: "quote", user: maker, delta: (0, helpers_1.withTokenDecimals)(-182000) },
        ]);
        yield secondResponse.unlockResponseCollateral();
        yield secondResponse.cleanUp();
    }));
    it("Create fixed quote size buy RFQ, respond and settle response", () => __awaiter(void 0, void 0, void 0, function* () {
        // create a buy RFQ specifying 15 bitcoin as a leg(5 in leg with multiplier of 3)
        const rfq = yield context.createRfq({
            legs: [spotInstrument_1.SpotInstrument.create(context, { amount: (0, helpers_1.withTokenDecimals)(5), side: types_1.Side.Bid })],
            fixedSize: types_1.FixedSize.getBaseAsset((0, helpers_1.toLegMultiplier)(3)),
            orderType: types_1.OrderType.Buy,
        });
        // response with agreeing to sell 15 bitcoins for 103.333k$ per 5 bitcoins
        const response = yield rfq.respond({
            ask: types_1.Quote.getFixedSize((0, helpers_1.toAbsolutePrice)((0, helpers_1.withTokenDecimals)(103333))),
        });
        yield response.confirm({ side: types_1.Side.Ask });
        let tokenMeasurer = yield helpers_1.TokenChangeMeasurer.takeDefaultSnapshot(context);
        yield response.prepareSettlement(types_1.AuthoritySide.Taker);
        yield response.prepareSettlement(types_1.AuthoritySide.Maker);
        // taker should receive 15 bitcoins, maker should receive 309.999k$
        yield response.settle(maker, [taker]);
        yield tokenMeasurer.expectChange([
            { token: "asset", user: taker, delta: (0, helpers_1.withTokenDecimals)(15) },
            { token: "asset", user: maker, delta: (0, helpers_1.withTokenDecimals)(-15) },
            { token: "quote", user: taker, delta: (0, helpers_1.withTokenDecimals)(-309999) },
            { token: "quote", user: maker, delta: (0, helpers_1.withTokenDecimals)(309999) },
        ]);
        yield response.unlockResponseCollateral();
        yield response.cleanUp();
    }));
    it("Create fixed quote size sell RFQ, respond and settle response", () => __awaiter(void 0, void 0, void 0, function* () {
        // create a sell RFQ specifying 0.5 bitcoin in leg and fixed quote of 38.5k$
        const rfq = yield context.createRfq({
            legs: [spotInstrument_1.SpotInstrument.create(context, { amount: (0, helpers_1.withTokenDecimals)(0.5), side: types_1.Side.Bid })],
            fixedSize: types_1.FixedSize.getQuoteAsset((0, helpers_1.withTokenDecimals)(38500)),
            orderType: types_1.OrderType.Sell,
        });
        // response with agreeing to buy for 11k$ per 0.5 bitcoin
        const response = yield rfq.respond({
            bid: types_1.Quote.getFixedSize((0, helpers_1.toAbsolutePrice)((0, helpers_1.withTokenDecimals)(11000))),
        });
        yield response.confirm({ side: types_1.Side.Bid });
        let tokenMeasurer = yield helpers_1.TokenChangeMeasurer.takeDefaultSnapshot(context);
        yield response.prepareSettlement(types_1.AuthoritySide.Taker);
        yield response.prepareSettlement(types_1.AuthoritySide.Maker);
        // taker should receive 1.75 bitcoins, maker should receive 38.5k$
        yield response.settle(taker, [maker]);
        yield tokenMeasurer.expectChange([
            { token: "asset", user: taker, delta: (0, helpers_1.withTokenDecimals)(-1.75) },
            { token: "asset", user: maker, delta: (0, helpers_1.withTokenDecimals)(1.75) },
            { token: "quote", user: taker, delta: (0, helpers_1.withTokenDecimals)(38500) },
            { token: "quote", user: maker, delta: (0, helpers_1.withTokenDecimals)(-38500) },
        ]);
        yield response.unlockResponseCollateral();
        yield response.cleanUp();
    }));
    it("Create RFQ, respond and confirm, taker prepares but maker defaults", () => __awaiter(void 0, void 0, void 0, function* () {
        const rfq = yield context.createRfq({ activeWindow: 2, settlingWindow: 1 });
        const response = yield rfq.respond();
        yield response.confirm();
        let tokenMeasurer = yield helpers_1.TokenChangeMeasurer.takeDefaultSnapshot(context);
        yield response.prepareSettlement(types_1.AuthoritySide.Taker);
        yield (0, helpers_1.sleep)(3000);
        yield response.revertSettlementPreparation(types_1.AuthoritySide.Taker);
        // no assets are exchanged
        yield tokenMeasurer.expectChange([
            { token: "asset", user: taker, delta: (0, helpers_1.withTokenDecimals)(0) },
            { token: "asset", user: maker, delta: (0, helpers_1.withTokenDecimals)(0) },
            { token: "quote", user: taker, delta: (0, helpers_1.withTokenDecimals)(0) },
            { token: "quote", user: maker, delta: (0, helpers_1.withTokenDecimals)(0) },
        ]);
        yield response.settleOnePartyDefault();
        yield response.cleanUp();
        yield rfq.cleanUp();
    }));
    it("Create RFQ, respond and confirm, maker prepares but taker defaults", () => __awaiter(void 0, void 0, void 0, function* () {
        const rfq = yield context.createRfq({ activeWindow: 2, settlingWindow: 1 });
        const response = yield rfq.respond();
        yield response.confirm();
        let tokenMeasurer = yield helpers_1.TokenChangeMeasurer.takeDefaultSnapshot(context);
        yield response.prepareSettlement(types_1.AuthoritySide.Maker);
        yield (0, helpers_1.sleep)(3000);
        yield response.revertSettlementPreparation(types_1.AuthoritySide.Maker);
        // no assets are exchanged
        yield tokenMeasurer.expectChange([
            { token: "asset", user: taker, delta: (0, helpers_1.withTokenDecimals)(0) },
            { token: "asset", user: maker, delta: (0, helpers_1.withTokenDecimals)(0) },
            { token: "quote", user: taker, delta: (0, helpers_1.withTokenDecimals)(0) },
            { token: "quote", user: maker, delta: (0, helpers_1.withTokenDecimals)(0) },
        ]);
        yield response.settleOnePartyDefault();
        yield response.cleanUp();
        yield rfq.cleanUp();
    }));
    it("Create RFQ, respond and confirm, both parties default", () => __awaiter(void 0, void 0, void 0, function* () {
        let tokenMeasurer = yield helpers_1.TokenChangeMeasurer.takeSnapshot(context, ["unlockedCollateral"], [taker, maker, dao]);
        const rfq = yield context.createRfq({ activeWindow: 2, settlingWindow: 1 });
        const response = yield rfq.respond();
        yield response.confirm();
        yield (0, helpers_1.sleep)(3000);
        yield response.settleTwoPartyDefault();
        yield response.cleanUp();
        yield rfq.cleanUp();
        yield tokenMeasurer.expectChange([
            { token: "unlockedCollateral", user: taker, delta: constants_1.TAKER_CONFIRMED_COLLATERAL.neg() },
            { token: "unlockedCollateral", user: maker, delta: constants_1.MAKER_CONFIRMED_COLLATERAL.neg() },
            { token: "unlockedCollateral", user: dao, delta: constants_1.TAKER_CONFIRMED_COLLATERAL.add(constants_1.MAKER_CONFIRMED_COLLATERAL) },
        ]);
    }));
    it("Create RFQ, respond, cancel response and close all", () => __awaiter(void 0, void 0, void 0, function* () {
        let tokenMeasurer = yield helpers_1.TokenChangeMeasurer.takeSnapshot(context, ["unlockedCollateral"], [taker, maker]);
        const rfq = yield context.createRfq({ activeWindow: 2, settlingWindow: 1 });
        const response = yield rfq.respond();
        yield response.cancel();
        yield response.unlockResponseCollateral();
        yield response.cleanUp();
        yield (0, helpers_1.sleep)(2000);
        yield rfq.unlockCollateral();
        yield rfq.cleanUp();
        yield tokenMeasurer.expectChange([
            { token: "unlockedCollateral", user: taker, delta: new anchor_1.BN(0) },
            { token: "unlockedCollateral", user: maker, delta: new anchor_1.BN(0) },
        ]);
    }));
    it("Create RFQ, cancel it and clean up", () => __awaiter(void 0, void 0, void 0, function* () {
        const rfq = yield context.createRfq();
        yield rfq.cancel();
        yield rfq.unlockCollateral();
        yield rfq.cleanUp();
    }));
    it("Create RFQ with a lot of spot legs and settle it", () => __awaiter(void 0, void 0, void 0, function* () {
        const legAmount = 12;
        const mints = yield Promise.all([...Array(legAmount)].map(() => {
            return wrappers_1.Mint.create(context);
        }));
        const legs = mints.map((mint) => spotInstrument_1.SpotInstrument.create(context, {
            mint,
        }));
        const rfq = yield context.createRfq({
            legs: legs.slice(0, legAmount / 2),
            legsSize: (0, helpers_1.calculateLegsSize)(legs),
            finalize: false,
        });
        yield rfq.addLegs(legs.slice(legAmount / 2));
        const response = yield rfq.respond();
        yield response.confirm();
        yield response.prepareSettlement(types_1.AuthoritySide.Taker, legAmount / 2);
        yield response.prepareMoreLegsSettlement(types_1.AuthoritySide.Taker, legAmount / 2, legAmount / 2);
        yield response.prepareSettlement(types_1.AuthoritySide.Maker, legAmount / 2);
        yield response.prepareMoreLegsSettlement(types_1.AuthoritySide.Maker, legAmount / 2, legAmount / 2);
        yield response.partiallySettleLegs([...Array(legAmount / 2)].map(() => maker), legAmount / 2);
        yield response.settle(taker, [...Array(legAmount / 2)].map(() => maker), legAmount / 2);
        yield response.unlockResponseCollateral();
        yield response.cleanUpLegs(legAmount / 2);
        yield response.cleanUp(legAmount / 2);
    }));
    it("Create RFQ with a lot of spot legs and default with partial preparation", () => __awaiter(void 0, void 0, void 0, function* () {
        const legAmount = 12;
        const mints = yield Promise.all([...Array(legAmount)].map(() => {
            return wrappers_1.Mint.create(context);
        }));
        const legs = mints.map((mint) => spotInstrument_1.SpotInstrument.create(context, {
            mint,
        }));
        const rfq = yield context.createRfq({
            legs: legs.slice(0, legAmount / 2),
            legsSize: (0, helpers_1.calculateLegsSize)(legs),
            finalize: false,
            activeWindow: 2,
            settlingWindow: 1,
        });
        yield rfq.addLegs(legs.slice(legAmount / 2));
        const response = yield rfq.respond();
        yield response.confirm();
        yield response.prepareSettlement(types_1.AuthoritySide.Taker, legAmount / 2);
        yield response.prepareMoreLegsSettlement(types_1.AuthoritySide.Taker, legAmount / 2, legAmount / 2);
        yield response.prepareSettlement(types_1.AuthoritySide.Maker, legAmount / 2);
        yield (0, helpers_1.sleep)(2000);
        yield response.partlyRevertSettlementPreparation(types_1.AuthoritySide.Taker, legAmount / 2);
        yield response.revertSettlementPreparation(types_1.AuthoritySide.Taker, legAmount / 2);
        yield response.revertSettlementPreparation(types_1.AuthoritySide.Maker, legAmount / 2);
        yield response.settleOnePartyDefault();
        yield response.cleanUpLegs(legAmount / 2);
        yield response.cleanUp(legAmount / 2);
    }));
});
