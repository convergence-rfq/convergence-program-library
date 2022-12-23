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
const chai_1 = require("chai");
const constants_1 = require("../utilities/constants");
const wrappers_1 = require("../utilities/wrappers");
describe("Update Risk Engine config", () => {
    let context;
    let riskEngine;
    before(() => __awaiter(void 0, void 0, void 0, function* () {
        context = yield (0, wrappers_1.getContext)();
        riskEngine = context.riskEngine;
    }));
    it.skip("Successfully partially update risk engine config", () => __awaiter(void 0, void 0, void 0, function* () {
        yield riskEngine.updateConfig({
            collateralForVariableSizeRfq: new anchor_1.BN(100000000),
            collateralMintDecimals: 3,
        });
        const config = yield riskEngine.getConfig();
        (0, chai_1.expect)(config.collateralForVariableSizeRfqCreation).to.be.bignumber.equal(new anchor_1.BN(100000000));
        (0, chai_1.expect)(config.collateralMintDecimals).to.be.equal(3);
        (0, chai_1.expect)(config.collateralForFixedQuoteAmountRfqCreation).to.be.bignumber.equal(constants_1.DEFAULT_COLLATERAL_FOR_FIXED_QUOTE_AMOUNT_RFQ);
        // reset config
        yield riskEngine.updateConfig({
            collateralForVariableSizeRfq: constants_1.DEFAULT_COLLATERAL_FOR_VARIABLE_SIZE_RFQ,
            collateralMintDecimals: constants_1.DEFAULT_MINT_DECIMALS,
        });
    }));
});
