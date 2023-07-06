import { BN } from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";
import { LegSide, OrderType, toRiskCategoryInfo, toScenario } from "./types";

export const PROTOCOL_SEED = "protocol";
export const COLLATERAL_SEED = "collateral_info";
export const COLLATERAL_TOKEN_SEED = "collateral_token";
export const RFQ_SEED = "rfq";
export const RESPONSE_SEED = "response";
export const QUOTE_ESCROW_SEED = "quote_escrow";
export const BASE_ASSET_INFO_SEED = "base_asset";
export const MINT_INFO_SEED = "mint_info";

export const EMPTY_LEG_SIZE = 32 + 2 + 4 + 8 + 1 + 1;

export const LEG_MULTIPLIER_DECIMALS = 9;
export const ABSOLUTE_PRICE_DECIMALS = 9;
export const FEE_BPS_DECIMALS = 9;

export const DEFAULT_SOL_FOR_SIGNERS = 100_000_000_000;
export const DEFAULT_TOKEN_AMOUNT = new BN(10_000_000).mul(new BN(10).pow(new BN(9)));
export const DEFAULT_COLLATERAL_FUNDED = new BN(1_000_000).mul(new BN(10).pow(new BN(9)));

export const DEFAULT_SETTLE_FEES = { taker: 0.02, maker: 0.01 };
export const DEFAULT_DEFAULT_FEES = { taker: 0.1, maker: 0.5 };
export const DEFAULT_ORDER_TYPE = OrderType.TwoWay;
export const DEFAULT_INSTRUMENT_AMOUNT = new BN(1_000_000_000);
export const DEFAULT_INSTRUMENT_SIDE = LegSide.Long;
export const DEFAULT_PRICE = new BN(100).mul(new BN(10).pow(new BN(ABSOLUTE_PRICE_DECIMALS)));
export const DEFAULT_LEG_MULTIPLIER = new BN(1).mul(new BN(10).pow(new BN(LEG_MULTIPLIER_DECIMALS)));
export const DEFAULT_ACTIVE_WINDOW = 10;
export const DEFAULT_SETTLING_WINDOW = 60;
export const DEFAULT_MINT_DECIMALS = 9;

export const INSTRUMENT_ESCROW_SEED = "escrow";

export const BITCOIN_BASE_ASSET_INDEX = 0;
export const SOLANA_BASE_ASSET_INDEX = 1;
export const ETH_BASE_ASSET_INDEX = 2;

// Risk engine

export const SWITCHBOARD_BTC_ORACLE = new PublicKey("8SXvChNYFhRq4EZuZvnhjrB3jJRQCv4k3P4W6hesH3Ee");
export const PYTH_SOL_ORACLE = new PublicKey("H6ARHf6YXhGYeQfUzQNGk6rDNnLBQKrenN712K4AQJEG");
export const ETH_IN_PLACE_PRICE = 2_000;

export const RISK_ENGINE_CONFIG_SEED = "config";

export const DEFAULT_COLLATERAL_FOR_VARIABLE_SIZE_RFQ = new BN(1_000_000_000);
export const DEFAULT_COLLATERAL_FOR_FIXED_QUOTE_AMOUNT_RFQ = new BN(2_000_000_000);
export const DEFAULT_SAFETY_PRICE_SHIFT_FACTOR = 0.01;
export const DEFAULT_OVERALL_SAFETY_FACTOR = 0.1;
export const DEFAULT_ACCEPTED_ORACLE_STALENESS = new BN(60 * 60 * 24 * 365 * 10); // 10 years, very long because fixtures would become stale otherwise
export const DEFAULT_ACCEPTED_ORACLE_CONFIDENCE_INTERVAL_PORTION = 0.01;

export const DEFAULT_RISK_CATEGORIES_INFO = [
  toRiskCategoryInfo(0.05, 0.5, [
    toScenario(0.02, 0.2),
    toScenario(0.04, 0.3),
    toScenario(0.08, 0.4),
    toScenario(0.12, 0.5),
    toScenario(0.2, 0.6),
    toScenario(0.3, 0.7),
  ]), // very low
  toRiskCategoryInfo(0.05, 0.8, [
    toScenario(0.04, 0.4),
    toScenario(0.08, 0.6),
    toScenario(0.16, 0.8),
    toScenario(0.24, 1),
    toScenario(0.4, 1.2),
    toScenario(0.6, 1.4),
  ]), // low
  toRiskCategoryInfo(0.05, 1.2, [
    toScenario(0.06, 0.6),
    toScenario(0.12, 0.9),
    toScenario(0.24, 1.2),
    toScenario(0.36, 1.5),
    toScenario(0.6, 1.8),
    toScenario(0.9, 2.1),
  ]), // medium
  toRiskCategoryInfo(0.05, 2.4, [
    toScenario(0.08, 0.8),
    toScenario(0.16, 1.2),
    toScenario(0.32, 1.6),
    toScenario(0.48, 2),
    toScenario(0.8, 2.4),
    toScenario(1.2, 2.8),
  ]), // high
  toRiskCategoryInfo(0.05, 5, [
    toScenario(0.1, 1),
    toScenario(0.2, 1.5),
    toScenario(0.4, 2),
    toScenario(0.6, 2.5),
    toScenario(1, 3),
    toScenario(1.5, 3.5),
  ]), // very high
  toRiskCategoryInfo(0.05, 10, [
    toScenario(0.2, 0.5),
    toScenario(0.3, 0.5),
    toScenario(0.4, 0.5),
    toScenario(0.5, 0.5),
    toScenario(0.6, 0.5),
    toScenario(0.7, 0.5),
  ]), // custom 1
  toRiskCategoryInfo(0.05, 15, [
    toScenario(0.2, 0.5),
    toScenario(0.3, 0.5),
    toScenario(0.4, 0.5),
    toScenario(0.5, 0.5),
    toScenario(0.6, 0.5),
    toScenario(0.7, 0.5),
  ]), // custom 2
  toRiskCategoryInfo(0.05, 20, [
    toScenario(0.2, 0.5),
    toScenario(0.3, 0.5),
    toScenario(0.4, 0.5),
    toScenario(0.5, 0.5),
    toScenario(0.6, 0.5),
    toScenario(0.7, 0.5),
  ]), // custom 3
];
