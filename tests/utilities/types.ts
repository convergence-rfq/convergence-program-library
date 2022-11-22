import { BN } from "@project-serum/anchor";

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

export enum RiskCategory {
  VeryLow,
  Low,
  Medium,
  High,
  VeryHigh,
}

export function riskCategoryToObject(value: RiskCategory) {
  const stringValue = RiskCategory[value];
  const uncapitalizedValue = stringValue.charAt(0).toLowerCase() + stringValue.slice(1);
  return {
    [uncapitalizedValue]: {},
  };
}

export type Fraction = {
  mantissa: BN;
  decimals: number;
};

export enum InstrumentType {
  Spot,
  Option,
  TermFuture,
  PerpFuture,
}

export function instrumentTypeToObject(value: InstrumentType) {
  const stringValue = InstrumentType[value];
  const uncapitalizedValue = stringValue.charAt(0).toLowerCase() + stringValue.slice(1);
  return {
    [uncapitalizedValue]: {},
  };
}

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

export function toFrational(mantissa: BN | number, decimals: number = 0): Fraction {
  if (typeof mantissa === "number") {
    mantissa = new BN(mantissa);
  }

  return { mantissa: mantissa as BN, decimals };
}

export function toRiskCategoryInfo(interestRate: Fraction, yearlyVolatility: Fraction) {
  return {
    interestRate,
    yearlyVolatility,
  };
}
