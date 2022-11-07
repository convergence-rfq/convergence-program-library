"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FixedSize = exports.Quote = exports.AuthoritySide = exports.Side = exports.OrderType = void 0;
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
