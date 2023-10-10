import { BN } from "@coral-xyz/anchor";

export type OrderType = { buy: {} } | { sell: {} } | { twoWay: {} };

export const OrderType = {
  Buy: { buy: {} },
  Sell: { sell: {} },
  TwoWay: { twoWay: {} },
};

export type QuoteSide = { bid: {} } | { ask: {} };

export const QuoteSide = {
  Bid: { bid: {} },
  Ask: { ask: {} },
};

export type AuthoritySide = { taker: {} } | { maker: {} };

export const AuthoritySide = {
  Taker: { taker: {} },
  Maker: { maker: {} },
};

export type Quote =
  | {
      standard: {
        priceQuote: { absolutePrice: { amountBps: BN } };
        legAmount: BN;
      };
    }
  | {
      fixedSize: {
        priceQuote: { absolutePrice: { amountBps: BN } };
      };
    };

export const Quote = {
  getStandard: (priceBps: BN, legAmount: BN): Quote => {
    return {
      standard: {
        priceQuote: {
          absolutePrice: {
            amountBps: priceBps,
          },
        },
        legAmount,
      },
    };
  },
  getFixedSize: (priceBps: BN): Quote => {
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

export type FixedSize =
  | { none: { padding: BN } }
  | {
      baseAsset: {
        legAmount: BN;
      };
    }
  | {
      quoteAsset: {
        quoteAmount: BN;
      };
    };

export const FixedSize = {
  None: {
    none: {
      padding: new BN(0),
    },
  },
  getBaseAsset: (legAmount: BN) => {
    return {
      baseAsset: {
        legAmount,
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
