"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_RISK_CATEGORIES_INFO = exports.DEFAULT_OVERALL_SAFETY_FACTOR = exports.DEFAULT_SAFETY_PRICE_SHIFT_FACTOR = exports.DEFAULT_COLLATERAL_FOR_FIXED_QUOTE_AMOUNT_RFQ = exports.DEFAULT_COLLATERAL_FOR_VARIABLE_SIZE_RFQ = exports.RISK_ENGINE_CONFIG_SEED = exports.SWITCHBOARD_SOL_ORACLE = exports.SWITCHBOARD_BTC_ORACLE = exports.SOLANA_BASE_ASSET_INDEX = exports.BITCOIN_BASE_ASSET_INDEX = exports.INSTRUMENT_ESCROW_SEED = exports.DEFAULT_MINT_DECIMALS = exports.DEFAULT_SETTLING_WINDOW = exports.DEFAULT_ACTIVE_WINDOW = exports.DEFAULT_LEG_MULTIPLIER = exports.DEFAULT_PRICE = exports.DEFAULT_INSTRUMENT_SIDE = exports.DEFAULT_INSTRUMENT_AMOUNT = exports.DEFAULT_ORDER_TYPE = exports.DEFAULT_FEES = exports.DEFAULT_COLLATERAL_FUNDED = exports.DEFAULT_TOKEN_AMOUNT = exports.DEFAULT_SOL_FOR_SIGNERS = exports.ABSOLUTE_PRICE_DECIMALS = exports.LEG_MULTIPLIER_DECIMALS = exports.EMPTY_LEG_SIZE = exports.MINT_INFO_SEED = exports.BASE_ASSET_INFO_SEED = exports.QUOTE_ESCROW_SEED = exports.COLLATERAL_TOKEN_SEED = exports.COLLATERAL_SEED = exports.PROTOCOL_SEED = void 0;
const anchor_1 = require("@project-serum/anchor");
const web3_js_1 = require("@solana/web3.js");
const types_1 = require("./types");
exports.PROTOCOL_SEED = "protocol";
exports.COLLATERAL_SEED = "collateral_info";
exports.COLLATERAL_TOKEN_SEED = "collateral_token";
exports.QUOTE_ESCROW_SEED = "quote_escrow";
exports.BASE_ASSET_INFO_SEED = "base_asset";
exports.MINT_INFO_SEED = "mint_info";
exports.EMPTY_LEG_SIZE = 32 + 2 + 4 + 8 + 1 + 1;
exports.LEG_MULTIPLIER_DECIMALS = 9;
exports.ABSOLUTE_PRICE_DECIMALS = 9;
exports.DEFAULT_SOL_FOR_SIGNERS = 100000000000;
exports.DEFAULT_TOKEN_AMOUNT = new anchor_1.BN(10000000).mul(new anchor_1.BN(10).pow(new anchor_1.BN(9)));
exports.DEFAULT_COLLATERAL_FUNDED = new anchor_1.BN(1000000).mul(new anchor_1.BN(10).pow(new anchor_1.BN(9)));
exports.DEFAULT_FEES = { takerBps: new anchor_1.BN(0), makerBps: new anchor_1.BN(0) };
exports.DEFAULT_ORDER_TYPE = types_1.OrderType.TwoWay;
exports.DEFAULT_INSTRUMENT_AMOUNT = new anchor_1.BN(1000000000);
exports.DEFAULT_INSTRUMENT_SIDE = types_1.Side.Bid;
exports.DEFAULT_PRICE = new anchor_1.BN(100).mul(new anchor_1.BN(10).pow(new anchor_1.BN(exports.ABSOLUTE_PRICE_DECIMALS)));
exports.DEFAULT_LEG_MULTIPLIER = new anchor_1.BN(1).mul(new anchor_1.BN(10).pow(new anchor_1.BN(exports.LEG_MULTIPLIER_DECIMALS)));
exports.DEFAULT_ACTIVE_WINDOW = 10;
exports.DEFAULT_SETTLING_WINDOW = 60;
exports.DEFAULT_MINT_DECIMALS = 9;
exports.INSTRUMENT_ESCROW_SEED = "escrow";
exports.BITCOIN_BASE_ASSET_INDEX = 0;
exports.SOLANA_BASE_ASSET_INDEX = 1;
// Risk engine
exports.SWITCHBOARD_BTC_ORACLE = new web3_js_1.PublicKey("8SXvChNYFhRq4EZuZvnhjrB3jJRQCv4k3P4W6hesH3Ee");
exports.SWITCHBOARD_SOL_ORACLE = new web3_js_1.PublicKey("GvDMxPzN1sCj7L26YDK2HnMRXEQmQ2aemov8YBtPS7vR");
exports.RISK_ENGINE_CONFIG_SEED = "config";
exports.DEFAULT_COLLATERAL_FOR_VARIABLE_SIZE_RFQ = new anchor_1.BN(1000000000);
exports.DEFAULT_COLLATERAL_FOR_FIXED_QUOTE_AMOUNT_RFQ = new anchor_1.BN(2000000000);
exports.DEFAULT_SAFETY_PRICE_SHIFT_FACTOR = (0, types_1.toFrational)(1, 2);
exports.DEFAULT_OVERALL_SAFETY_FACTOR = (0, types_1.toFrational)(1, 1);
exports.DEFAULT_RISK_CATEGORIES_INFO = [
    (0, types_1.toRiskCategoryInfo)((0, types_1.toFrational)(5, 2), (0, types_1.toFrational)(5, 1), [
        (0, types_1.toScenario)((0, types_1.toFrational)(2, 2), (0, types_1.toFrational)(2, 1)),
        (0, types_1.toScenario)((0, types_1.toFrational)(4, 2), (0, types_1.toFrational)(3, 1)),
        (0, types_1.toScenario)((0, types_1.toFrational)(8, 2), (0, types_1.toFrational)(4, 1)),
        (0, types_1.toScenario)((0, types_1.toFrational)(12, 2), (0, types_1.toFrational)(5, 1)),
        (0, types_1.toScenario)((0, types_1.toFrational)(2, 1), (0, types_1.toFrational)(6, 1)),
        (0, types_1.toScenario)((0, types_1.toFrational)(3, 1), (0, types_1.toFrational)(7, 1)),
    ]),
    (0, types_1.toRiskCategoryInfo)((0, types_1.toFrational)(5, 2), (0, types_1.toFrational)(8, 1), [
        (0, types_1.toScenario)((0, types_1.toFrational)(4, 2), (0, types_1.toFrational)(4, 1)),
        (0, types_1.toScenario)((0, types_1.toFrational)(8, 2), (0, types_1.toFrational)(6, 1)),
        (0, types_1.toScenario)((0, types_1.toFrational)(16, 2), (0, types_1.toFrational)(8, 1)),
        (0, types_1.toScenario)((0, types_1.toFrational)(24, 2), (0, types_1.toFrational)(1, 0)),
        (0, types_1.toScenario)((0, types_1.toFrational)(4, 1), (0, types_1.toFrational)(12, 1)),
        (0, types_1.toScenario)((0, types_1.toFrational)(6, 1), (0, types_1.toFrational)(14, 1)),
    ]),
    (0, types_1.toRiskCategoryInfo)((0, types_1.toFrational)(5, 2), (0, types_1.toFrational)(12, 1), [
        (0, types_1.toScenario)((0, types_1.toFrational)(6, 2), (0, types_1.toFrational)(6, 1)),
        (0, types_1.toScenario)((0, types_1.toFrational)(12, 2), (0, types_1.toFrational)(9, 1)),
        (0, types_1.toScenario)((0, types_1.toFrational)(24, 2), (0, types_1.toFrational)(12, 1)),
        (0, types_1.toScenario)((0, types_1.toFrational)(36, 2), (0, types_1.toFrational)(15, 1)),
        (0, types_1.toScenario)((0, types_1.toFrational)(6, 1), (0, types_1.toFrational)(18, 1)),
        (0, types_1.toScenario)((0, types_1.toFrational)(9, 1), (0, types_1.toFrational)(21, 1)),
    ]),
    (0, types_1.toRiskCategoryInfo)((0, types_1.toFrational)(5, 2), (0, types_1.toFrational)(24, 1), [
        (0, types_1.toScenario)((0, types_1.toFrational)(8, 2), (0, types_1.toFrational)(8, 1)),
        (0, types_1.toScenario)((0, types_1.toFrational)(16, 2), (0, types_1.toFrational)(12, 1)),
        (0, types_1.toScenario)((0, types_1.toFrational)(32, 2), (0, types_1.toFrational)(16, 1)),
        (0, types_1.toScenario)((0, types_1.toFrational)(48, 2), (0, types_1.toFrational)(2, 0)),
        (0, types_1.toScenario)((0, types_1.toFrational)(8, 1), (0, types_1.toFrational)(24, 1)),
        (0, types_1.toScenario)((0, types_1.toFrational)(12, 1), (0, types_1.toFrational)(28, 1)),
    ]),
    (0, types_1.toRiskCategoryInfo)((0, types_1.toFrational)(5, 2), (0, types_1.toFrational)(5, 0), [
        (0, types_1.toScenario)((0, types_1.toFrational)(1, 1), (0, types_1.toFrational)(1, 0)),
        (0, types_1.toScenario)((0, types_1.toFrational)(2, 1), (0, types_1.toFrational)(15, 1)),
        (0, types_1.toScenario)((0, types_1.toFrational)(4, 1), (0, types_1.toFrational)(2, 0)),
        (0, types_1.toScenario)((0, types_1.toFrational)(6, 1), (0, types_1.toFrational)(25, 1)),
        (0, types_1.toScenario)((0, types_1.toFrational)(1, 0), (0, types_1.toFrational)(3, 0)),
        (0, types_1.toScenario)((0, types_1.toFrational)(15, 1), (0, types_1.toFrational)(35, 1)),
    ]), // very high
];
