import { BN } from "@project-serum/anchor";
import { toAbsolutePrice, TokenChangeMeasurer, toLegMultiplier, withTokenDecimals } from "../utilities/helpers";
import { SpotInstrument } from "../utilities/spotInstrument";
import { AuthoritySide, getStandartQuote, OrderType, Side } from "../utilities/types";
import { Context, getContext, Mint } from "../utilities/wrappers";

describe("RFQ Spot instrument integration tests", () => {
  let context: Context;
  before(async () => {
    context = await getContext();
  });

  it("Create a two way rfq with one spot leg, respond and settle as bid", async () => {
    let tokenMeasurer = await TokenChangeMeasurer.takeDefaultSnapshot(context);

    // create a two way RFQ specifying 1 bitcoin as a leg
    const rfq = await context.initializeRfq({
      legs: [new SpotInstrument(context, { amount: withTokenDecimals(1), side: Side.Bid })],
    });
    // response with agreeing to sell 2 bitcoins for 22k$ or buy 5 for 21900$
    const response = await rfq.respond({
      bid: getStandartQuote(toAbsolutePrice(withTokenDecimals(22_000)), toLegMultiplier(2)),
      ask: getStandartQuote(toAbsolutePrice(withTokenDecimals(21_900)), toLegMultiplier(5)),
    });
    // taker confirms to buy 2 bitcoins
    await response.confirm(Side.Bid);
    await response.prepareToSettle(AuthoritySide.Taker);
    await response.prepareToSettle(AuthoritySide.Maker);
    // taker should receive 2 bitcoins, maker should receive 44k$
    await response.settle(context.maker.publicKey, [context.taker.publicKey]);
    await tokenMeasurer.expectChange([
      { mint: context.assetToken, user: context.taker.publicKey, delta: withTokenDecimals(2) },
      { mint: context.assetToken, user: context.maker.publicKey, delta: withTokenDecimals(-2) },
      { mint: context.quoteToken, user: context.taker.publicKey, delta: withTokenDecimals(-44_000) },
      { mint: context.quoteToken, user: context.maker.publicKey, delta: withTokenDecimals(44_000) },
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
      bid: null,
      ask: getStandartQuote(toAbsolutePrice(withTokenDecimals(90_000)), toLegMultiplier(0.5)),
    });
    // respond with quote for twice of legs once more with higher price
    const secondResponse = await rfq.respond({
      bid: null,
      ask: getStandartQuote(toAbsolutePrice(withTokenDecimals(91_000)), toLegMultiplier(2)),
    });

    // taker confirms first response
    await response.confirm(Side.Ask);
    const firstMeasurer = await TokenChangeMeasurer.takeSnapshot(
      [context.assetToken, context.quoteToken, ethMint],
      [context.taker.publicKey, context.maker.publicKey]
    );
    await response.prepareToSettle(AuthoritySide.Taker);
    await response.prepareToSettle(AuthoritySide.Maker);
    // taker should spend 2.5 bitcoins, receive 5 eth and 45k$
    await response.settle(context.taker.publicKey, [context.maker.publicKey, context.taker.publicKey]);
    await firstMeasurer.expectChange([
      { mint: context.assetToken, user: context.taker.publicKey, delta: withTokenDecimals(-2.5) },
      { mint: context.assetToken, user: context.maker.publicKey, delta: withTokenDecimals(2.5) },
      { mint: ethMint, user: context.taker.publicKey, delta: withTokenDecimals(5) },
      { mint: ethMint, user: context.maker.publicKey, delta: withTokenDecimals(-5) },
      { mint: context.quoteToken, user: context.taker.publicKey, delta: withTokenDecimals(45_000) },
      { mint: context.quoteToken, user: context.maker.publicKey, delta: withTokenDecimals(-45_000) },
    ]);

    // taker confirms second response
    await secondResponse.confirm(Side.Ask);
    const secondMeasurer = await TokenChangeMeasurer.takeSnapshot(
      [context.assetToken, context.quoteToken, ethMint],
      [context.taker.publicKey, context.maker.publicKey]
    );
    await secondResponse.prepareToSettle(AuthoritySide.Taker);
    await secondResponse.prepareToSettle(AuthoritySide.Maker);
    // taker should spend 10 bitcoins, receive 20 eth and 182k$
    await secondResponse.settle(context.taker.publicKey, [context.maker.publicKey, context.taker.publicKey]);
    await secondMeasurer.expectChange([
      { mint: context.assetToken, user: context.taker.publicKey, delta: withTokenDecimals(-10) },
      { mint: context.assetToken, user: context.maker.publicKey, delta: withTokenDecimals(10) },
      { mint: ethMint, user: context.taker.publicKey, delta: withTokenDecimals(20) },
      { mint: ethMint, user: context.maker.publicKey, delta: withTokenDecimals(-20) },
      { mint: context.quoteToken, user: context.taker.publicKey, delta: withTokenDecimals(182_000) },
      { mint: context.quoteToken, user: context.maker.publicKey, delta: withTokenDecimals(-182_000) },
    ]);
  });
});
