import { BN } from "@project-serum/anchor";
import { OrderType, Side } from "./types";

export const PROTOCOL_SEED = "protocol";
export const COLLATERAL_SEED = "collateral_info";
export const COLLATERAL_TOKEN_SEED = "collateral_token";
export const QUOTE_ESCROW_SEED = "quote_escrow";

export const LEG_MULTIPLIER_DECIMALS = 9;
export const ABSOLUTE_PRICE_DECIMALS = 9;

export const DEFAULT_SOL_FOR_SIGNERS = 100_000_000_000;
export const DEFAULT_TOKEN_AMOUNT = 1_000_000_000_000_000;
export const DEFAULT_COLLATERAL_FUNDED = 100_000_000_000;

export const DEFAULT_FEES = { takerBps: new BN(0), makerBps: new BN(0) };
export const DEFAULT_ORDER_TYPE = OrderType.TwoWay;
export const DEFAULT_INSTRUMENT_AMOUNT = new BN(1_000_000_000);
export const DEFAULT_INSTRUMENT_SIDE = Side.Bid;
export const DEFAULT_PRICE = new BN(100).mul(new BN(10).pow(new BN(ABSOLUTE_PRICE_DECIMALS)));
export const DEFAULT_LEG_MULTIPLIER = new BN(1).mul(new BN(10).pow(new BN(LEG_MULTIPLIER_DECIMALS)));
export const DEFAULT_ACTIVE_WINDOW = 10;
export const DEFAULT_SETTLING_WINDOW = 60;

/// Spot
export const SPOT_ESCROW_SEED = "escrow";
