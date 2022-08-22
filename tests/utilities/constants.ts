import { BN } from "@project-serum/anchor";

export const PROTOCOL_SEED = "protocol";
export const COLLATERAL_SEED = "collateral_info";
export const COLLATERAL_TOKEN_SEED = "collateral_token";
export const QUOTE_ESCROW_SEED = "quote_escrow";

export const DEFAULT_SOL_FOR_SIGNERS = 100_000_000_000;
export const DEFAULT_TOKEN_AMOUNT = 200_000_000_000;

export const DEFAULT_FEES = { takerBps: new BN(0), makerBps: new BN(0) };
