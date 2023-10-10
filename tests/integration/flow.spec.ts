import { BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import {
  attachImprovedLogDisplay,
  runInParallelWithWait,
  toAbsolutePrice,
  TokenChangeMeasurer,
} from "../utilities/helpers";
import { FixedSize, OrderType, Quote, QuoteSide } from "../utilities/types";
import { Context, getContext } from "../utilities/wrappers";

describe("RFQ Spot instrument integration tests", () => {
  let context: Context;
  let taker: PublicKey;
  let maker: PublicKey;

  beforeEach(function () {
    attachImprovedLogDisplay(this, context);
  });

  before(async () => {
    context = await getContext();
    taker = context.taker.publicKey;
    maker = context.maker.publicKey;
  });

  it("Create two-way RFQ with one spot leg, respond and settle as sell", async () => {
    let tokenMeasurer = await TokenChangeMeasurer.takeSnapshot(context, ["btc", "usdc"]);

    // create a two way RFQ for bitcoin
    const rfq = await context.createRfq({
      leg: context.btcToken,
      orderType: OrderType.TwoWay,
      fixedSize: FixedSize.None,
    });
    // response with agreeing to sell 2 bitcoins for 22k$ or buy 5 for 21900$
    const response = await rfq.respond({
      bid: Quote.getStandard(toAbsolutePrice(rfq.quote.toTokenAmount(21_900)), rfq.leg.toTokenAmount(5)),
      ask: Quote.getStandard(toAbsolutePrice(rfq.quote.toTokenAmount(22_000)), rfq.leg.toTokenAmount(2)),
    });
    // taker confirms to buy 1 bitcoin
    await response.confirm({ side: QuoteSide.Ask, legAmount: rfq.leg.toTokenAmount(1) });
    await tokenMeasurer.expectChange([
      { token: "btc", user: taker, delta: new BN(0) },
      { token: "usdc", user: taker, delta: rfq.quote.toTokenAmount(-22_000) },
    ]);
    // taker should receive 1 bitcoins, maker should receive 22k$
    await response.settle();
    await tokenMeasurer.expectChange([
      { token: "btc", user: taker, delta: rfq.leg.toTokenAmount(1) },
      { token: "btc", user: maker, delta: rfq.leg.toTokenAmount(-1) },
      { token: "usdc", user: taker, delta: rfq.quote.toTokenAmount(-22_000) },
      { token: "usdc", user: maker, delta: rfq.quote.toTokenAmount(22_000) },
    ]);

    await response.cleanUp();
    await rfq.cancel();
    await rfq.cleanUp();
  });

  it("Create fixed-size buy RFQ, respond and settle", async () => {
    let tokenMeasurer = await TokenChangeMeasurer.takeSnapshot(context, ["sol", "usdc"]);

    const rfq = await context.createRfq({
      leg: context.solToken,
      orderType: OrderType.Buy,
      fixedSize: FixedSize.getBaseAsset(context.solToken.toTokenAmount(12.5)),
    });
    const response = await rfq.respond({
      ask: Quote.getFixedSize(toAbsolutePrice(rfq.quote.toTokenAmount(2222.5))),
    });
    await response.confirm({ side: QuoteSide.Ask });
    await response.settle();
    await tokenMeasurer.expectChange([
      { token: "sol", user: taker, delta: rfq.leg.toTokenAmount(12.5) },
      { token: "sol", user: maker, delta: rfq.leg.toTokenAmount(-12.5) },
      { token: "usdc", user: taker, delta: rfq.quote.toTokenAmount(-27_781.25) },
      { token: "usdc", user: maker, delta: rfq.quote.toTokenAmount(27_781.25) },
    ]);

    await response.cleanUp();
    await rfq.cancel();
    await rfq.cleanUp();
  });

  it("Create fixed-quote sell RFQ, respond and settle", async () => {
    let tokenMeasurer = await TokenChangeMeasurer.takeSnapshot(context, ["eth", "usdc"]);

    const rfq = await context.createRfq({
      leg: context.ethToken,
      orderType: OrderType.Sell,
      fixedSize: FixedSize.getQuoteAsset(context.quoteToken.toTokenAmount(33_333.33)),
    });
    const response = await rfq.respond({
      bid: Quote.getFixedSize(toAbsolutePrice(rfq.quote.toTokenAmount(144.5))),
    });
    await response.confirm({ side: QuoteSide.Bid });
    await response.settle();
    await tokenMeasurer.expectChange([
      { token: "eth", user: taker, delta: rfq.leg.toTokenAmount(-230.680484429) },
      { token: "eth", user: maker, delta: rfq.leg.toTokenAmount(230.680484429) },
      { token: "usdc", user: taker, delta: rfq.quote.toTokenAmount(33_333.33) },
      { token: "usdc", user: maker, delta: rfq.quote.toTokenAmount(-33_333.33) },
    ]);

    await response.cleanUp();
    await rfq.cancel();
    await rfq.cleanUp();
  });

  it("Create RFQ, respond and settle multiple responses", async () => {
    let tokenMeasurer = await TokenChangeMeasurer.takeSnapshot(context, ["btc", "usdc"]);

    const rfq = await context.createRfq({
      leg: context.btcToken,
      orderType: OrderType.Sell,
      fixedSize: FixedSize.None,
    });

    const firstResponse = await rfq.respond({
      bid: Quote.getStandard(toAbsolutePrice(rfq.quote.toTokenAmount(22_300)), rfq.leg.toTokenAmount(100)),
    });
    const secondResponse = await rfq.respond({
      bid: Quote.getStandard(toAbsolutePrice(rfq.quote.toTokenAmount(22_200)), rfq.leg.toTokenAmount(5)),
    });

    await secondResponse.confirm({ side: QuoteSide.Bid });
    await secondResponse.settle();

    await firstResponse.confirm({ side: QuoteSide.Bid, legAmount: rfq.leg.toTokenAmount(2) });
    await firstResponse.settle();

    await tokenMeasurer.expectChange([
      { token: "btc", user: taker, delta: rfq.leg.toTokenAmount(-7) },
      { token: "btc", user: maker, delta: rfq.leg.toTokenAmount(7) },
      { token: "usdc", user: taker, delta: rfq.quote.toTokenAmount(22_200 * 5 + 22_300 * 2) },
      { token: "usdc", user: maker, delta: rfq.quote.toTokenAmount(-(22_200 * 5 + 22_300 * 2)) },
    ]);

    await firstResponse.cleanUp();
    await secondResponse.cleanUp();
    await rfq.cancel();
    await rfq.cleanUp();
  });

  it("Create RFQ, respond, confirm but maker fails to settle", async () => {
    let tokenMeasurer = await TokenChangeMeasurer.takeSnapshot(context, ["btc", "usdc"]);

    const rfq = await context.createRfq({
      leg: context.btcToken,
      activeWindow: 2,
    });
    const response = await runInParallelWithWait(async () => {
      const response = await rfq.respond({
        bid: Quote.getStandard(toAbsolutePrice(rfq.quote.toTokenAmount(22_300)), rfq.leg.toTokenAmount(100)),
      });
      await response.confirm({ side: QuoteSide.Bid, legAmount: rfq.leg.toTokenAmount(2) });
      return response;
    }, 2.5);

    await response.unlockResponseCollateral();
    await response.cleanUp();
    await rfq.cleanUp();

    await tokenMeasurer.expectChange([
      { token: "btc", user: taker, delta: rfq.leg.toTokenAmount(0) },
      { token: "btc", user: maker, delta: rfq.leg.toTokenAmount(0) },
      { token: "usdc", user: taker, delta: rfq.quote.toTokenAmount(0) },
      { token: "usdc", user: maker, delta: rfq.quote.toTokenAmount(0) },
    ]);
  });

  it("Create RFQ, respond, cancel response and close all", async () => {
    const rfq = await context.createRfq({ activeWindow: 2 });
    await runInParallelWithWait(async () => {
      const response = await rfq.respond();
      await response.cancel();
      await response.cleanUp();
    }, 2.5);

    await rfq.cleanUp();
  });

  it("Create RFQ, cancel it and clean up", async () => {
    const rfq = await context.createRfq();

    await rfq.cancel();
    await rfq.cleanUp();
  });
});
