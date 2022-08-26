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

export function getStandartQuote(priceBps: BN, legsMultiplierBps: BN) {
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
}
