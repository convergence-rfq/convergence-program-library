import { BN } from "@project-serum/anchor";
import { toAbsolutePrice, TokenChangeMeasurer, toLegMultiplier, withTokenDecimals } from "../utilities/helpers";
import { SpotInstrument } from "../utilities/spotInstrument";
import { AuthoritySide, getStandartQuote, Side } from "../utilities/types";
import { Context, getContext } from "../utilities/wrappers";

describe("RFQ Spot instrument integration tests", () => {
  let context: Context;
  before(async () => {
    context = await getContext();
  });

  it("Create, respond and settle an rfq", async () => {
    let tokenMeasurer = await TokenChangeMeasurer.takeSnapshot(context);

    // create a two way RFQ specifying 1 bitcoin as a leg
    const rfq = await context.initializeRfq({
      legs: [new SpotInstrument(context, { amount: withTokenDecimals(1), side: Side.Bid })],
    });
    // response with agreeing to sell 2 bitcoins for 22k$ or buy 5 for 21900$
    const response = await rfq.respond({
      bid: getStandartQuote(toAbsolutePrice(withTokenDecimals(22_000)), toLegMultiplier(new BN(2))),
      ask: getStandartQuote(toAbsolutePrice(withTokenDecimals(21_900)), toLegMultiplier(new BN(5))),
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
});
