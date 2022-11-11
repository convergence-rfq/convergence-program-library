import { BN } from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";
import { OrderType, Side } from "./types";

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

export const DEFAULT_FEES = { takerBps: new BN(0), makerBps: new BN(0) };
export const DEFAULT_ORDER_TYPE = OrderType.TwoWay;
export const DEFAULT_INSTRUMENT_AMOUNT = new BN(1_000_000_000);
export const DEFAULT_INSTRUMENT_SIDE = Side.Bid;
export const DEFAULT_PRICE = new BN(100).mul(new BN(10).pow(new BN(ABSOLUTE_PRICE_DECIMALS)));
export const DEFAULT_LEG_MULTIPLIER = new BN(1).mul(new BN(10).pow(new BN(LEG_MULTIPLIER_DECIMALS)));
export const DEFAULT_ACTIVE_WINDOW = 10;
export const DEFAULT_SETTLING_WINDOW = 60;
export const DEFAULT_MINT_DECIMALS = 9;
export const DEFAULT_COLLATERAL_FOR_VARIABLE_SIZE_RFQ = new BN(1_000_000_000);
export const DEFAULT_COLLATERAL_FOR_FIXED_QUOTE_AMOUNT_RFQ = new BN(2_000_000_000);

export const INSTRUMENT_ESCROW_SEED = "escrow";

export const BITCOIN_BASE_ASSET_INDEX = 0;
export const SOLANA_BASE_ASSET_INDEX = 1;

export const SWITCHBOARD_BTC_ORACLE = new PublicKey("8SXvChNYFhRq4EZuZvnhjrB3jJRQCv4k3P4W6hesH3Ee");
export const SWITCHBOARD_SOL_ORACLE = new PublicKey("GvDMxPzN1sCj7L26YDK2HnMRXEQmQ2aemov8YBtPS7vR");
