"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assetIdentifierToSeedBytes = exports.toRiskCategoryInfo = exports.toScenario = exports.toFrational = exports.FixedSize = exports.Quote = exports.instrumentTypeToObject = exports.InstrumentType = exports.riskCategoryToObject = exports.RiskCategory = exports.AuthoritySide = exports.Side = exports.OrderType = void 0;
const anchor_1 = require("@project-serum/anchor");
exports.OrderType = {
    Buy: { buy: {} },
    Sell: { sell: {} },
    TwoWay: { twoWay: {} },
};
exports.Side = {
    Bid: { bid: {} },
    Ask: { ask: {} },
};
exports.AuthoritySide = {
    Taker: { taker: {} },
    Maker: { maker: {} },
};
var RiskCategory;
(function (RiskCategory) {
    RiskCategory[RiskCategory["VeryLow"] = 0] = "VeryLow";
    RiskCategory[RiskCategory["Low"] = 1] = "Low";
    RiskCategory[RiskCategory["Medium"] = 2] = "Medium";
    RiskCategory[RiskCategory["High"] = 3] = "High";
    RiskCategory[RiskCategory["VeryHigh"] = 4] = "VeryHigh";
})(RiskCategory = exports.RiskCategory || (exports.RiskCategory = {}));
function riskCategoryToObject(value) {
    const stringValue = RiskCategory[value];
    const uncapitalizedValue = stringValue.charAt(0).toLowerCase() + stringValue.slice(1);
    return {
        [uncapitalizedValue]: {},
    };
}
exports.riskCategoryToObject = riskCategoryToObject;
var InstrumentType;
(function (InstrumentType) {
    InstrumentType[InstrumentType["Spot"] = 0] = "Spot";
    InstrumentType[InstrumentType["Option"] = 1] = "Option";
    InstrumentType[InstrumentType["TermFuture"] = 2] = "TermFuture";
    InstrumentType[InstrumentType["PerpFuture"] = 3] = "PerpFuture";
})(InstrumentType = exports.InstrumentType || (exports.InstrumentType = {}));
function instrumentTypeToObject(value) {
    const stringValue = InstrumentType[value];
    const uncapitalizedValue = stringValue.charAt(0).toLowerCase() + stringValue.slice(1);
    return {
        [uncapitalizedValue]: {},
    };
}
exports.instrumentTypeToObject = instrumentTypeToObject;
exports.Quote = {
    getStandart: (priceBps, legsMultiplierBps) => {
        return {
            standart: {
                priceQuote: {
                    absolutePrice: {
                        amountBps: priceBps,
                    },
                },
                legsMultiplierBps,
            },
        };
    },
    getFixedSize: (priceBps) => {
        return {
            fixedSize: {
                priceQuote: {
                    absolutePrice: {
                        amountBps: priceBps,
                    },
                },
            },
        };
    },
};
exports.FixedSize = {
    None: {
        none: {
            padding: new anchor_1.BN(0),
        },
    },
    getBaseAsset: (legsMultiplierBps) => {
        return {
            baseAsset: {
                legsMultiplierBps,
            },
        };
    },
    getQuoteAsset: (quoteAmount) => {
        return {
            quoteAsset: {
                quoteAmount,
            },
        };
    },
};
function toFrational(mantissa, decimals = 0) {
    if (typeof mantissa === "number") {
        mantissa = new anchor_1.BN(mantissa);
    }
    return { mantissa: mantissa, decimals };
}
exports.toFrational = toFrational;
function toScenario(baseAssetPriceChange, volatilityChange) {
    return { baseAssetPriceChange, volatilityChange };
}
exports.toScenario = toScenario;
function toRiskCategoryInfo(interestRate, yearlyVolatility, scenarioPerSettlementPeriod) {
    return {
        interestRate,
        yearlyVolatility,
        scenarioPerSettlementPeriod: scenarioPerSettlementPeriod,
    };
}
exports.toRiskCategoryInfo = toRiskCategoryInfo;
function assetIdentifierToSeedBytes(assetIdentifier) {
    if (assetIdentifier == "quote") {
        return Buffer.from([1, 0]);
    }
    else {
        return Buffer.from([0, assetIdentifier.legIndex]);
    }
}
exports.assetIdentifierToSeedBytes = assetIdentifierToSeedBytes;
