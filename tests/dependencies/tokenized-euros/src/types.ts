import { BN, web3 } from "@project-serum/anchor";
import { OrderParams } from "@project-serum/serum/lib/market";

export type EuroMeta = {
  underlyingMint: web3.PublicKey;
  underlyingDecimals: number;
  underlyingAmountPerContract: BN;
  stableMint: web3.PublicKey;
  stableDecimals: number;
  stablePool: web3.PublicKey;
  oracle: web3.PublicKey;
  strikePrice: BN;
  priceDecimals: number;
  callOptionMint: web3.PublicKey;
  callWriterMint: web3.PublicKey;
  putOptionMint: web3.PublicKey;
  putWriterMint: web3.PublicKey;
  underlyingPool: web3.PublicKey;
  expiration: BN;
  expirationData: web3.PublicKey;
  bumpSeed: number;
  oracleProviderId: number;
};

export enum OptionType {
  CALL = 0,
  PUT = 1,
}

export type ExpirationData = {
  expiration: BN;
  oracle: web3.PublicKey;
  priceAtExpiration: BN;
  priceSetAtTime: BN;
  priceDecimals: number;
  priceSet: boolean;
  bump: number;
  oracleProviderId: number;
};

export type OrderParamsWithFeeRate<T> = OrderParams<T> & {
  feeRate?: number;
};
