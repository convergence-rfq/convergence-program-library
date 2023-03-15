import { BN } from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";
import { OptionType } from "@mithraic-labs/tokenized-euros";
import {
  DEFAULT_COLLATERAL_FOR_FIXED_QUOTE_AMOUNT_RFQ,
  DEFAULT_COLLATERAL_FOR_VARIABLE_SIZE_RFQ,
} from "../utilities/constants";
import { toAbsolutePrice, TokenChangeMeasurer, toLegMultiplier, withTokenDecimals } from "../utilities/helpers";
import { EuroOptionsFacade, PsyoptionsEuropeanInstrument } from "../utilities/instruments/psyoptionsEuropeanInstrument";
import { SpotInstrument } from "../utilities/instruments/spotInstrument";
import { FixedSize, OrderType, Quote, Side } from "../utilities/types";
import { Context, getContext } from "../utilities/wrappers";

describe("Required collateral calculation and lock", () => {
  let context: Context;
  let taker: PublicKey;
  let maker: PublicKey;

  before(async () => {
    context = await getContext();
    taker = context.taker.publicKey;
    maker = context.maker.publicKey;
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

  it("Correct collateral locked for fixed leg structure size spot rfq creation", async () => {
    let measurer = await TokenChangeMeasurer.takeSnapshot(context, ["unlockedCollateral"], [taker]);

    // 1 bitcoin with price of 20k$
    await context.createRfq({
      orderType: OrderType.TwoWay,
      legs: [
        SpotInstrument.createForLeg(context, {
          mint: context.assetToken,
          amount: withTokenDecimals(1),
          side: Side.Bid,
        }),
      ],
      fixedSize: FixedSize.getBaseAsset(toLegMultiplier(1)),
    });

    await measurer.expectChange([{ token: "unlockedCollateral", user: taker, delta: withTokenDecimals(-660) }]);
  });

  it("Correct collateral locked for responding to spot rfq", async () => {
    // solana rfq with 20 tokens in the leg
    const rfq = await context.createRfq({
      orderType: OrderType.TwoWay,
      legs: [
        SpotInstrument.createForLeg(context, {
          mint: context.additionalAssetToken,
          amount: withTokenDecimals(20),
          side: Side.Bid,
        }),
      ],
      fixedSize: FixedSize.None,
    });

    let measurer = await TokenChangeMeasurer.takeSnapshot(context, ["unlockedCollateral"], [maker]);
    // respond with leg multiplier of 2
    await rfq.respond({ bid: Quote.getStandard(toAbsolutePrice(new BN(20)), toLegMultiplier(2)) });
    await measurer.expectChange([{ token: "unlockedCollateral", user: maker, delta: withTokenDecimals(-92.4) }]);
  });

  it("Correct additional collateral locked for taker and unlocked for maker on lower confirmation", async () => {
    // bitcoin leg with the size of 1, solana leg with the size of 200
    const rfq = await context.createRfq({
      orderType: OrderType.TwoWay,
      legs: [
        SpotInstrument.createForLeg(context, {
          mint: context.assetToken,
          amount: withTokenDecimals(1),
          side: Side.Bid,
        }),
        SpotInstrument.createForLeg(context, {
          mint: context.additionalAssetToken,
          amount: withTokenDecimals(200),
          side: Side.Ask,
        }),
      ],
      fixedSize: FixedSize.None,
    });

    // respond with leg multiplier of 2
    const response = await rfq.respond({ bid: Quote.getStandard(toAbsolutePrice(new BN(20)), toLegMultiplier(2)) });

    let measurer = await TokenChangeMeasurer.takeSnapshot(context, ["unlockedCollateral"], [taker, maker]);
    // confirm multiplier leg multiplier of 1
    await response.confirm({ side: Side.Bid, legMultiplierBps: toLegMultiplier(1) });
    let expectedCollateral = withTokenDecimals(1122);
    await measurer.expectChange([
      {
        token: "unlockedCollateral",
        user: taker,
        delta: expectedCollateral.neg().add(DEFAULT_COLLATERAL_FOR_VARIABLE_SIZE_RFQ),
      },
      { token: "unlockedCollateral", user: maker, delta: expectedCollateral },
    ]);
  });

  it("Correct collateral locked for option rfq", async () => {
    const options = await EuroOptionsFacade.initalizeNewOptionMeta(context, {
      underlyingMint: context.assetToken,
      stableMint: context.quoteToken,
      underlyingPerContract: withTokenDecimals(0.1),
      strikePrice: withTokenDecimals(22000),
      expireIn: 90 * 24 * 60 * 60, // 90 days
    });

    let measurer = await TokenChangeMeasurer.takeSnapshot(context, ["unlockedCollateral"], [taker]);
    const rfq = await context.createRfq({
      legs: [PsyoptionsEuropeanInstrument.create(context, options, OptionType.CALL, { amount: 10000, side: Side.Bid })], // 1 contract with 4 decimals
      fixedSize: FixedSize.None,
    });
    const response = await rfq.respond({ bid: Quote.getStandard(withTokenDecimals(200), toLegMultiplier(3)) });

    await response.confirm();
    await measurer.expectChange([
      {
        token: "unlockedCollateral",
        user: taker,
        delta: withTokenDecimals(-194),
        precision: withTokenDecimals(1),
      },
    ]);
  });
});
