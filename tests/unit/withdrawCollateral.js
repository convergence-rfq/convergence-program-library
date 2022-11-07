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
const helpers_1 = require("../utilities/helpers");
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
    it("Can withdraw unlocked collateral", () => __awaiter(void 0, void 0, void 0, function* () {
        let measurer = yield helpers_1.TokenChangeMeasurer.takeSnapshot(context, ["walletCollateral"], [taker]);
        let withdrawAmount = (0, helpers_1.withTokenDecimals)(1);
        yield context.withdrawCollateral(context.taker, withdrawAmount);
        yield measurer.expectChange([{ token: "walletCollateral", user: taker, delta: withdrawAmount }]);
    }));
    it("Cannot withdraw locked collateral", () => __awaiter(void 0, void 0, void 0, function* () {
        let fullCollateral = yield context.collateralToken.getTotalCollateral(taker);
        // lock some collateral
        yield context.createRfq();
        yield (0, helpers_1.expectError)(context.withdrawCollateral(context.taker, fullCollateral), "NotEnoughCollateral");
    }));
});
