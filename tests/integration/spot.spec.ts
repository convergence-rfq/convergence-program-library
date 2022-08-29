import { PublicKey } from "@solana/web3.js";
import { toAbsolutePrice, TokenChangeMeasurer, toLegMultiplier, withTokenDecimals } from "../utilities/helpers";
import { SpotInstrument } from "../utilities/spotInstrument";
import { AuthoritySide, FixedSize, OrderType, Quote, Side } from "../utilities/types";
import { Context, getContext, Mint } from "../utilities/wrappers";

describe("RFQ Spot instrument integration tests", () => {
  let context: Context;
  let taker: PublicKey;
  let maker: PublicKey;

  before(async () => {
    context = await getContext();
    taker = context.taker.publicKey;
    maker = context.maker.publicKey;
  });

  it("Create a two way rfq with one spot leg, respond and settle as bid", async () => {
    let tokenMeasurer = await TokenChangeMeasurer.takeDefaultSnapshot(context);

    // create a two way RFQ specifying 1 bitcoin as a leg
    const rfq = await context.initializeRfq({
      legs: [new SpotInstrument(context, { amount: withTokenDecimals(1), side: Side.Bid })],
    });
    // response with agreeing to sell 2 bitcoins for 22k$ or buy 5 for 21900$
    const response = await rfq.respond({
      bid: Quote.getStandart(toAbsolutePrice(withTokenDecimals(22_000)), toLegMultiplier(2)),
      ask: Quote.getStandart(toAbsolutePrice(withTokenDecimals(21_900)), toLegMultiplier(5)),
    });
    // taker confirms to buy 2 bitcoins
    await response.confirm(Side.Bid);
    await response.prepareToSettle(AuthoritySide.Taker);
    await response.prepareToSettle(AuthoritySide.Maker);
    // taker should receive 2 bitcoins, maker should receive 44k$
    await response.settle(maker, [taker]);
    await tokenMeasurer.expectChange([
      { mint: context.assetToken, user: taker, delta: withTokenDecimals(2) },
      { mint: context.assetToken, user: maker, delta: withTokenDecimals(-2) },
      { mint: context.quoteToken, user: taker, delta: withTokenDecimals(-44_000) },
      { mint: context.quoteToken, user: maker, delta: withTokenDecimals(44_000) },
    ]);
  });

  it("Create a sell rfq with two spot legs, respond and settle multiple responses", async () => {
    const ethMint = await Mint.create(context);
    // create a sell RFQ specifying 5 bitcoin bid and 10 eth ask
    const rfq = await context.initializeRfq({
      legs: [
        new SpotInstrument(context, { amount: withTokenDecimals(5), side: Side.Bid }),
        new SpotInstrument(context, { mint: ethMint, amount: withTokenDecimals(10), side: Side.Ask }),
      ],
      orderType: OrderType.Sell,
    });
    // respond with quote for half of legs
    const response = await rfq.respond({
      ask: Quote.getStandart(toAbsolutePrice(withTokenDecimals(90_000)), toLegMultiplier(0.5)),
    });
    // respond with quote for twice of legs once more with higher price
    const secondResponse = await rfq.respond({
      ask: Quote.getStandart(toAbsolutePrice(withTokenDecimals(91_000)), toLegMultiplier(2)),
    });

    // taker confirms first response
    await response.confirm(Side.Ask);
    const firstMeasurer = await TokenChangeMeasurer.takeSnapshot(
      [context.assetToken, context.quoteToken, ethMint],
      [taker, maker]
    );
    await response.prepareToSettle(AuthoritySide.Taker);
    await response.prepareToSettle(AuthoritySide.Maker);
    // taker should spend 2.5 bitcoins, receive 5 eth and 45k$
    await response.settle(taker, [maker, taker]);
    await firstMeasurer.expectChange([
      { mint: context.assetToken, user: taker, delta: withTokenDecimals(-2.5) },
      { mint: context.assetToken, user: maker, delta: withTokenDecimals(2.5) },
      { mint: ethMint, user: taker, delta: withTokenDecimals(5) },
      { mint: ethMint, user: maker, delta: withTokenDecimals(-5) },
      { mint: context.quoteToken, user: taker, delta: withTokenDecimals(45_000) },
      { mint: context.quoteToken, user: maker, delta: withTokenDecimals(-45_000) },
    ]);

    // taker confirms second response
    await secondResponse.confirm(Side.Ask);
    const secondMeasurer = await TokenChangeMeasurer.takeSnapshot(
      [context.assetToken, context.quoteToken, ethMint],
      [taker, maker]
    );
    await secondResponse.prepareToSettle(AuthoritySide.Taker);
    await secondResponse.prepareToSettle(AuthoritySide.Maker);
    // taker should spend 10 bitcoins, receive 20 eth and 182k$
    await secondResponse.settle(taker, [maker, taker]);
    await secondMeasurer.expectChange([
      { mint: context.assetToken, user: taker, delta: withTokenDecimals(-10) },
      { mint: context.assetToken, user: maker, delta: withTokenDecimals(10) },
      { mint: ethMint, user: taker, delta: withTokenDecimals(20) },
      { mint: ethMint, user: maker, delta: withTokenDecimals(-20) },
      { mint: context.quoteToken, user: taker, delta: withTokenDecimals(182_000) },
      { mint: context.quoteToken, user: maker, delta: withTokenDecimals(-182_000) },
    ]);
  });

  it("Create a fixed legs size buy rfq, respond and settle response", async () => {
    // create a buy RFQ specifying 15 bitcoin as a leg(5 in leg with multiplier of 3)
    const rfq = await context.initializeRfq({
      legs: [new SpotInstrument(context, { amount: withTokenDecimals(5), side: Side.Bid })],
      fixedSize: FixedSize.getBaseAsset(toLegMultiplier(3)),
      orderType: OrderType.Buy,
    });
    // response with agreeing to sell 15 bitcoins for 103.333k$ per 5 bitcoins
    const response = await rfq.respond({
      bid: Quote.getFixedSize(toAbsolutePrice(withTokenDecimals(103_333))),
    });

    await response.confirm(Side.Bid);
    let tokenMeasurer = await TokenChangeMeasurer.takeDefaultSnapshot(context);
    await response.prepareToSettle(AuthoritySide.Taker);
    await response.prepareToSettle(AuthoritySide.Maker);
    // taker should receive 15 bitcoins, maker should receive 309.999k$
    await response.settle(maker, [taker]);
    await tokenMeasurer.expectChange([
      { mint: context.assetToken, user: taker, delta: withTokenDecimals(15) },
      { mint: context.assetToken, user: maker, delta: withTokenDecimals(-15) },
      { mint: context.quoteToken, user: taker, delta: withTokenDecimals(-309_999) },
      { mint: context.quoteToken, user: maker, delta: withTokenDecimals(309_999) },
    ]);
  });

  it("Create a fixed quote size sell rfq, respond and settle response", async () => {
    // create a sell RFQ specifying 0.5 bitcoin in leg and fixed quote of 38.5k$
    const rfq = await context.initializeRfq({
      legs: [new SpotInstrument(context, { amount: withTokenDecimals(0.5), side: Side.Bid })],
      fixedSize: FixedSize.getQuoteAsset(withTokenDecimals(38_500)),
      orderType: OrderType.Sell,
    });
    // response with agreeing to buy for 11k$ per 0.5 bitcoin
    const response = await rfq.respond({
      ask: Quote.getFixedSize(toAbsolutePrice(withTokenDecimals(11_000))),
    });

    await response.confirm(Side.Ask);
    let tokenMeasurer = await TokenChangeMeasurer.takeDefaultSnapshot(context);
    await response.prepareToSettle(AuthoritySide.Taker);
    await response.prepareToSettle(AuthoritySide.Maker);
    // taker should receive 1.75 bitcoins, maker should receive 38.5k$
    await response.settle(taker, [maker]);
    await tokenMeasurer.expectChange([
      { mint: context.assetToken, user: taker, delta: withTokenDecimals(-1.75) },
      { mint: context.assetToken, user: maker, delta: withTokenDecimals(1.75) },
      { mint: context.quoteToken, user: taker, delta: withTokenDecimals(38_500) },
      { mint: context.quoteToken, user: maker, delta: withTokenDecimals(-38_500) },
    ]);
  });
});
