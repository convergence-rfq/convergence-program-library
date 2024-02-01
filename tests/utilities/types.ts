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

export type LegSide = { long: {} } | { short: {} };

export const LegSide = {
  Long: { long: {} },
  Short: { short: {} },
};

export type AuthoritySide = { taker: {} } | { maker: {} };

export const AuthoritySide = {
  Taker: { taker: {} },
  Maker: { maker: {} },
};

export type RiskCategory =
  | { veryLow: {}; index: number }
  | { low: {}; index: number }
  | { medium: {}; index: number }
  | { high: {}; index: number }
  | { veryHigh: {}; index: number }
  | { custom1: {}; index: number }
  | { custom2: {}; index: number }
  | { custom3: {}; index: number };

export const RiskCategory = {
  VeryLow: { veryLow: {}, index: 0 },
  Low: { low: {}, index: 1 },
  Medium: { medium: {}, index: 2 },
  High: { high: {}, index: 3 },
  VeryHigh: { veryHigh: {}, index: 4 },
  Custom1: { custom1: {}, index: 5 },
  Custom2: { custom2: {}, index: 6 },
  Custom3: { custom3: {}, index: 7 },
};

export type Scenario = {
  baseAssetPriceChange: number;
  volatilityChange: number;
};

export type RiskCategoryInfo = {
  interestRate: number;
  annualized30DayVolatility: number;
  scenarioPerSettlementPeriod: [Scenario, Scenario, Scenario, Scenario, Scenario, Scenario];
};

export type InstrumentType = ({ spot: {} } | { option: {} } | { termFuture: {} } | { perpFuture: {} }) & {
  index: number;
};

export const InstrumentType = {
  Spot: { spot: {}, index: 1 },
  Option: { option: {}, index: 2 },
  TermFuture: { termFuture: {}, index: 3 },
  PerpFuture: { perpFuture: {}, index: 4 },
};

export type Quote =
  | {
      standard: {
        priceQuote: { absolutePrice: { amountBps: BN } };
        legsMultiplierBps: BN;
      };
    }
  | {
      fixedSize: {
        priceQuote: { absolutePrice: { amountBps: BN } };
      };
    };

export const Quote = {
  getStandard: (priceBps: BN, legsMultiplierBps: BN): Quote => {
    return {
      standard: {
        priceQuote: {
          absolutePrice: {
            amountBps: priceBps,
          },
        },
        legsMultiplierBps,
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
        legsMultiplierBps: BN;
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

export function toScenario(baseAssetPriceChange: number, volatilityChange: number): Scenario {
  return { baseAssetPriceChange, volatilityChange };
}

export function toRiskCategoryInfo(
  interestRate: number,
  annualized30DayVolatility: number,
  scenarioPerSettlementPeriod: [Scenario, Scenario, Scenario, Scenario, Scenario, Scenario]
): RiskCategoryInfo {
  return {
    interestRate,
    annualized30DayVolatility,
    scenarioPerSettlementPeriod: scenarioPerSettlementPeriod,
  };
}

export type AssetIdentifier = "quote" | { legIndex: number };

export function assetIdentifierToSeedBytes(assetIdentifier: AssetIdentifier) {
  if (assetIdentifier == "quote") {
    return Buffer.from([1, 0]);
  } else {
    return Buffer.from([0, assetIdentifier.legIndex]);
  }
}

export type FeeParams = { taker: number; maker: number };

export type OracleSource = { switchboard: {} } | { pyth: {} } | { inPlace: {} };

export const OracleSource = {
  Switchboard: { switchboard: {} },
  Pyth: { pyth: {} },
  InPlace: { inPlace: {} },
};

export type LegData = {
  settlementTypeMetadata: SettlementTypeInfo;
  baseAssetIndex: BaseAssetIndex;
  data: Buffer;
  amount: BN;
  amountDecimals: number;
  side: LegSide;
};

export type QuoteData = {
  settlementTypeMetadata: SettlementTypeInfo;
  data: Buffer;
  decimals: number;
};

export type BaseAssetIndex = {
  value: number;
};

export type SettlementTypeInfo =
  | {
      instrument: { instrumentIndex: number };
    }
  | { printTrade: { instrumentType: number } };
