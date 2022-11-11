import { BN } from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";
import {
  DEFAULT_COLLATERAL_FOR_FIXED_QUOTE_AMOUNT_RFQ,
  DEFAULT_COLLATERAL_FOR_VARIABLE_SIZE_RFQ,
} from "../utilities/constants";
import {
  expectError,
  toAbsolutePrice,
  TokenChangeMeasurer,
  toLegMultiplier,
  withTokenDecimals,
} from "../utilities/helpers";
import { SpotInstrument } from "../utilities/instruments/spotInstrument";
import { FixedSize, OrderType, Quote, Side } from "../utilities/types";
import { Context, getContext, Rfq } from "../utilities/wrappers";

describe("Required collateral calculation and lock", () => {
  let context: Context;
  let taker: PublicKey;
  let maker: PublicKey;
  let dao: PublicKey;

  before(async () => {
    context = await getContext();
    taker = context.taker.publicKey;
    maker = context.maker.publicKey;
    dao = context.dao.publicKey;
  });

  it("Correct collateral locked for variable size rfq creation", async () => {
    let measurer = await TokenChangeMeasurer.takeSnapshot(context, ["unlockedCollateral"], [taker]);

    await context.createRfq({ fixedSize: FixedSize.None });

    await measurer.expectChange([
      { token: "unlockedCollateral", user: taker, delta: DEFAULT_COLLATERAL_FOR_VARIABLE_SIZE_RFQ.neg() },
    ]);
  });

  it("Correct collateral locked for fixed quote asset size rfq creation", async () => {
    let measurer = await TokenChangeMeasurer.takeSnapshot(context, ["unlockedCollateral"], [taker]);

    await context.createRfq({ fixedSize: FixedSize.getQuoteAsset(withTokenDecimals(5)) });

    await measurer.expectChange([
      { token: "unlockedCollateral", user: taker, delta: DEFAULT_COLLATERAL_FOR_FIXED_QUOTE_AMOUNT_RFQ.neg() },
    ]);
  });

  it("Correct collateral locked for fixed leg structure size rfq creation", async () => {
    let measurer = await TokenChangeMeasurer.takeSnapshot(context, ["unlockedCollateral"], [taker]);

    // 1 bitcoin with price of 20k$
    await context.createRfq({
      orderType: OrderType.TwoWay,
      legs: [
        SpotInstrument.create(context, {
          mint: context.assetToken,
          amount: withTokenDecimals(1),
          side: Side.Bid,
        }),
      ],
      fixedSize: FixedSize.getBaseAsset(toLegMultiplier(1)),
    });

    await measurer.expectChange([{ token: "unlockedCollateral", user: taker, delta: withTokenDecimals(-660) }]);
  });

  it("Correct collateral locked for responding to rfq", async () => {
    // solana rfq with 20 tokens in the leg
    const rfq = await context.createRfq({
      orderType: OrderType.TwoWay,
      legs: [
        SpotInstrument.create(context, {
          mint: context.additionalAssetToken,
          amount: withTokenDecimals(20),
          side: Side.Bid,
        }),
      ],
      fixedSize: FixedSize.None,
    });

    let measurer = await TokenChangeMeasurer.takeSnapshot(context, ["unlockedCollateral"], [maker]);
    // respond with leg multiplier of 2
    await rfq.respond({ bid: Quote.getStandart(toAbsolutePrice(new BN(20)), toLegMultiplier(2)) });
    await measurer.expectChange([{ token: "unlockedCollateral", user: maker, delta: withTokenDecimals(-39.6) }]);
  });

  it("Correct additional collateral locked for taker and unlocked for maker on lower confirmation", async () => {
    // bitcoin leg with the size of 1, solana leg with the size of 200
    const rfq = await context.createRfq({
      orderType: OrderType.TwoWay,
      legs: [
        SpotInstrument.create(context, {
          mint: context.assetToken,
          amount: withTokenDecimals(1),
          side: Side.Bid,
        }),
        SpotInstrument.create(context, {
          mint: context.additionalAssetToken,
          amount: withTokenDecimals(200),
          side: Side.Ask,
        }),
      ],
      fixedSize: FixedSize.None,
    });

    // respond with leg multiplier of 2
    const response = await rfq.respond({ bid: Quote.getStandart(toAbsolutePrice(new BN(20)), toLegMultiplier(2)) });

    let measurer = await TokenChangeMeasurer.takeSnapshot(context, ["unlockedCollateral"], [taker, maker]);
    // confirm multiplier leg multiplier of 1
    await response.confirm({ side: Side.Bid, legMultiplierBps: toLegMultiplier(1) });
    let expectedCollateral = withTokenDecimals(858);
    await measurer.expectChange([
      {
        token: "unlockedCollateral",
        user: taker,
        delta: expectedCollateral.neg().add(DEFAULT_COLLATERAL_FOR_VARIABLE_SIZE_RFQ),
      },
      { token: "unlockedCollateral", user: maker, delta: expectedCollateral },
    ]);
  });
});
