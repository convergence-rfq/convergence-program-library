import { BN } from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";
import { OrderType, Side, toFrational, toRiskCategoryInfo, toScenario } from "./types";

export const PROTOCOL_SEED = "protocol";
export const COLLATERAL_SEED = "collateral_info";
export const COLLATERAL_TOKEN_SEED = "collateral_token";
export const QUOTE_ESCROW_SEED = "quote_escrow";
export const BASE_ASSET_INFO_SEED = "base_asset";
export const MINT_INFO_SEED = "mint_info";

export const EMPTY_LEG_SIZE = 32 + 2 + 4 + 8 + 1 + 1;

export const LEG_MULTIPLIER_DECIMALS = 9;
export const ABSOLUTE_PRICE_DECIMALS = 9;

export const DEFAULT_SOL_FOR_SIGNERS = 100_000_000_000;
export const DEFAULT_TOKEN_AMOUNT = new BN(10_000_000).mul(new BN(10).pow(new BN(9)));
export const DEFAULT_COLLATERAL_FUNDED = new BN(1_000_000).mul(new BN(10).pow(new BN(9)));

export const DEFAULT_FEES = { takerBps: new BN(1), makerBps: new BN(0) };
export const DEFAULT_ORDER_TYPE = OrderType.TwoWay;
export const DEFAULT_INSTRUMENT_AMOUNT = new BN(1_000_000_000);
export const DEFAULT_INSTRUMENT_SIDE = Side.Bid;
export const DEFAULT_PRICE = new BN(100).mul(new BN(10).pow(new BN(ABSOLUTE_PRICE_DECIMALS)));
export const DEFAULT_LEG_MULTIPLIER = new BN(1).mul(new BN(10).pow(new BN(LEG_MULTIPLIER_DECIMALS)));
export const DEFAULT_ACTIVE_WINDOW = 10;
export const DEFAULT_SETTLING_WINDOW = 60;
export const DEFAULT_MINT_DECIMALS = 9;

export const INSTRUMENT_ESCROW_SEED = "escrow";

export const BITCOIN_BASE_ASSET_INDEX = 0;
export const SOLANA_BASE_ASSET_INDEX = 1;

// Risk engine

export const SWITCHBOARD_BTC_ORACLE = new PublicKey("8SXvChNYFhRq4EZuZvnhjrB3jJRQCv4k3P4W6hesH3Ee");
export const SWITCHBOARD_SOL_ORACLE = new PublicKey("GvDMxPzN1sCj7L26YDK2HnMRXEQmQ2aemov8YBtPS7vR");

export const RISK_ENGINE_CONFIG_SEED = "config";

export const DEFAULT_COLLATERAL_FOR_VARIABLE_SIZE_RFQ = new BN(1_000_000_000);
export const DEFAULT_COLLATERAL_FOR_FIXED_QUOTE_AMOUNT_RFQ = new BN(2_000_000_000);
export const DEFAULT_SAFETY_PRICE_SHIFT_FACTOR = toFrational(1, 2);
export const DEFAULT_OVERALL_SAFETY_FACTOR = toFrational(1, 1);

export const DEFAULT_RISK_CATEGORIES_INFO = [
  toRiskCategoryInfo(toFrational(5, 2), toFrational(5, 1), [
    toScenario(toFrational(2, 2), toFrational(2, 1)),
    toScenario(toFrational(4, 2), toFrational(3, 1)),
    toScenario(toFrational(8, 2), toFrational(4, 1)),
    toScenario(toFrational(12, 2), toFrational(5, 1)),
    toScenario(toFrational(2, 1), toFrational(6, 1)),
    toScenario(toFrational(3, 1), toFrational(7, 1)),
  ]), // very low
  toRiskCategoryInfo(toFrational(5, 2), toFrational(8, 1), [
    toScenario(toFrational(4, 2), toFrational(4, 1)),
    toScenario(toFrational(8, 2), toFrational(6, 1)),
    toScenario(toFrational(16, 2), toFrational(8, 1)),
    toScenario(toFrational(24, 2), toFrational(1, 0)),
    toScenario(toFrational(4, 1), toFrational(12, 1)),
    toScenario(toFrational(6, 1), toFrational(14, 1)),
  ]), // low
  toRiskCategoryInfo(toFrational(5, 2), toFrational(12, 1), [
    toScenario(toFrational(6, 2), toFrational(6, 1)),
    toScenario(toFrational(12, 2), toFrational(9, 1)),
    toScenario(toFrational(24, 2), toFrational(12, 1)),
    toScenario(toFrational(36, 2), toFrational(15, 1)),
    toScenario(toFrational(6, 1), toFrational(18, 1)),
    toScenario(toFrational(9, 1), toFrational(21, 1)),
  ]), // medium
  toRiskCategoryInfo(toFrational(5, 2), toFrational(24, 1), [
    toScenario(toFrational(8, 2), toFrational(8, 1)),
    toScenario(toFrational(16, 2), toFrational(12, 1)),
    toScenario(toFrational(32, 2), toFrational(16, 1)),
    toScenario(toFrational(48, 2), toFrational(2, 0)),
    toScenario(toFrational(8, 1), toFrational(24, 1)),
    toScenario(toFrational(12, 1), toFrational(28, 1)),
  ]), // high
  toRiskCategoryInfo(toFrational(5, 2), toFrational(5, 0), [
    toScenario(toFrational(1, 1), toFrational(1, 0)),
    toScenario(toFrational(2, 1), toFrational(15, 1)),
    toScenario(toFrational(4, 1), toFrational(2, 0)),
    toScenario(toFrational(6, 1), toFrational(25, 1)),
    toScenario(toFrational(1, 0), toFrational(3, 0)),
    toScenario(toFrational(15, 1), toFrational(35, 1)),
  ]), // very high
];
