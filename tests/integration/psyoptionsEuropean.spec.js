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
const helpers_1 = require("../utilities/helpers");
const psyoptionsEuropeanInstrument_1 = require("../utilities/instruments/psyoptionsEuropeanInstrument");
const types_1 = require("../utilities/types");
const wrappers_1 = require("../utilities/wrappers");
const src_1 = require("../dependencies/tokenized-euros/src");
describe("Psyoptions European instrument integration tests", () => {
    let context;
    let taker;
    let maker;
    let dao;
    let options;
    before(() => __awaiter(void 0, void 0, void 0, function* () {
        context = yield (0, wrappers_1.getContext)();
        taker = context.taker.publicKey;
        maker = context.maker.publicKey;
        dao = context.dao.publicKey;
        options = yield psyoptionsEuropeanInstrument_1.EuroOptionsFacade.initalizeNewOptionMeta(context, {
            underlyingMint: context.assetToken,
            stableMint: context.quoteToken,
            underlyingPerContract: (0, helpers_1.withTokenDecimals)(1),
        });
    }));
    it("Create two-way RFQ with one euro option leg, respond and settle as sell", () => __awaiter(void 0, void 0, void 0, function* () {
        let tokenMeasurer = yield helpers_1.TokenChangeMeasurer.takeSnapshot(context, ["quote", "asset", options.callMint], [taker, maker]);
        // create a two way RFQ specifying 1 option call as a leg
        const rfq = yield context.createRfq({
            legs: [
                psyoptionsEuropeanInstrument_1.PsyoptionsEuropeanInstrument.create(context, options, src_1.OptionType.CALL, {
                    amount: new anchor_1.BN(1).mul(src_1.CONTRACT_DECIMALS_BN),
                    side: types_1.Side.Bid,
                }),
            ],
        });
        // response with agreeing to sell 2 options for 500$ or buy 5 for 450$
        const response = yield rfq.respond({
            bid: types_1.Quote.getStandart((0, helpers_1.toAbsolutePrice)((0, helpers_1.withTokenDecimals)(450)), (0, helpers_1.toLegMultiplier)(5)),
            ask: types_1.Quote.getStandart((0, helpers_1.toAbsolutePrice)((0, helpers_1.withTokenDecimals)(500)), (0, helpers_1.toLegMultiplier)(2)),
        });
        // taker confirms to buy 1 option
        yield response.confirm({ side: types_1.Side.Ask, legMultiplierBps: (0, helpers_1.toLegMultiplier)(1) });
        yield response.prepareSettlement(types_1.AuthoritySide.Taker);
        yield options.mintOptions(context.maker, new anchor_1.BN(1), src_1.OptionType.CALL);
        yield response.prepareSettlement(types_1.AuthoritySide.Maker);
        // taker should receive 1 option, maker should receive 500$ and lose 1 bitcoin as option collateral
        yield response.settle(maker, [taker]);
        yield tokenMeasurer.expectChange([
            { token: options.callMint, user: taker, delta: new anchor_1.BN(1).mul(src_1.CONTRACT_DECIMALS_BN) },
            { token: "quote", user: taker, delta: (0, helpers_1.withTokenDecimals)(-500) },
            { token: "quote", user: maker, delta: (0, helpers_1.withTokenDecimals)(500) },
            { token: "asset", user: maker, delta: (0, helpers_1.withTokenDecimals)(-1) },
            { token: options.callMint, user: maker, delta: new anchor_1.BN(0) },
        ]);
        yield response.unlockResponseCollateral();
        yield response.cleanUp();
    }));
    it("Create two-way RFQ with one euro option leg, respond but maker defaults on settlement", () => __awaiter(void 0, void 0, void 0, function* () {
        // create a two way RFQ specifying 1 option put as a leg
        const rfq = yield context.createRfq({
            activeWindow: 2,
            settlingWindow: 1,
            legs: [
                psyoptionsEuropeanInstrument_1.PsyoptionsEuropeanInstrument.create(context, options, src_1.OptionType.PUT, {
                    amount: new anchor_1.BN(1).mul(src_1.CONTRACT_DECIMALS_BN),
                    side: types_1.Side.Bid,
                }),
            ],
        });
        // response with agreeing to buy 5 options for 450$
        const response = yield rfq.respond({
            bid: types_1.Quote.getStandart((0, helpers_1.toAbsolutePrice)((0, helpers_1.withTokenDecimals)(450)), (0, helpers_1.toLegMultiplier)(5)),
        });
        // taker confirms to sell 2 options
        yield response.confirm({ side: types_1.Side.Bid, legMultiplierBps: (0, helpers_1.toLegMultiplier)(2) });
        yield options.mintOptions(context.taker, new anchor_1.BN(2), src_1.OptionType.PUT);
        let tokenMeasurer = yield helpers_1.TokenChangeMeasurer.takeSnapshot(context, [options.putMint], [taker]);
        yield response.prepareSettlement(types_1.AuthoritySide.Taker);
        yield (0, helpers_1.sleep)(3000);
        yield response.revertSettlementPreparation(types_1.AuthoritySide.Taker);
        // taker have returned his assets
        yield tokenMeasurer.expectChange([{ token: options.putMint, user: taker, delta: new anchor_1.BN(0) }]);
        yield response.settleOnePartyDefault();
        yield response.cleanUp();
        yield rfq.cleanUp();
    }));
});
