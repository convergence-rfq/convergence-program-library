import { BN } from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";

export const OrderType = {
  Buy: { buy: {} },
  Sell: { sell: {} },
  TwoWay: { twoWay: {} },
};

export const Side = {
  Bid: { bid: {} },
  Ask: { ask: {} },
};

export const AuthoritySide = {
  Taker: { taker: {} },
  Maker: { maker: {} },
};

export const Quote = {
  getStandart: (priceBps: BN, legsMultiplierBps: BN) => {
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
  getFixedSize: (priceBps: BN) => {
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

export const FixedSize = {
  None: {
    none: {
      padding: new BN(0),
    },
  },
  getBaseAsset: (legsMultiplierBps: BN) => {
    return {
      baseAsset: {
        legsMultiplierBps,
      },
    };
  },
  getQuoteAsset: (quoteAmount: BN) => {
    return {
      quoteAsset: {
        quoteAmount,
      },
    };
  },
};
