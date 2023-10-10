import { BN } from "@coral-xyz/anchor";
import { OrderType } from "./types";

export const PROTOCOL_SEED = "protocol";
export const RFQ_SEED = "rfq";
export const RESPONSE_SEED = "response";
export const LEG_ESCROW_SEED = "leg_escrow";
export const QUOTE_ESCROW_SEED = "quote_escrow";

export const ABSOLUTE_PRICE_DECIMALS = 9;

export const DEFAULT_SOL_FOR_SIGNERS = 100_000_000_000;
export const DEFAULT_TOKEN_AMOUNT = new BN(10_000_000);

export const DEFAULT_SETTLE_FEES = { taker: 0.02, maker: 0.01 };
export const DEFAULT_DEFAULT_FEES = { taker: 0.1, maker: 0.5 };
export const DEFAULT_ORDER_TYPE = OrderType.TwoWay;
export const DEFAULT_PRICE = new BN(100).mul(new BN(10).pow(new BN(ABSOLUTE_PRICE_DECIMALS)));
export const DEFAULT_ACTIVE_WINDOW = 10;
export const DEFAULT_SETTLING_WINDOW = 60;
