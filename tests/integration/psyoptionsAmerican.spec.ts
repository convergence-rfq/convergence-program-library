import { BN } from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";
import { MAKER_CONFIRMED_COLLATERAL, TAKER_CONFIRMED_COLLATERAL } from "../utilities/constants";
import { sleep, toAbsolutePrice, TokenChangeMeasurer, toLegMultiplier, withTokenDecimals } from "../utilities/helpers";
import { PsyoptionsAmericanInstrument } from "../utilities/psyoptionsAmericanInstrument";
import { SpotInstrument } from "../utilities/spotInstrument";
import { AuthoritySide, FixedSize, OrderType, Quote, Side } from "../utilities/types";
import { Context, getContext, Mint } from "../utilities/wrappers";

describe("RFQ Psyoptions American instrument integration tests", () => {
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

  it("Create two-way RFQ with one spot leg and one option leg, respond and settle as sell", async () => {
    let tokenMeasurer = await TokenChangeMeasurer.takeDefaultSnapshot(context);

    const rfq = await context.initializeRfq({
      legs: [
        new SpotInstrument(context, { amount: withTokenDecimals(1), side: Side.Bid }),
        new PsyoptionsAmericanInstrument(context, { amount: withTokenDecimals(1), side: Side.Bid }),
      ],
      orderType: OrderType.TwoWay,
    });

    const response = await rfq.respond({
      bid: Quote.getStandart(toAbsolutePrice(withTokenDecimals(21_900)), toLegMultiplier(5)),
      ask: Quote.getStandart(toAbsolutePrice(withTokenDecimals(22_000)), toLegMultiplier(2)),
    });

    await response.confirm({ side: Side.Ask, legMultiplierBps: toLegMultiplier(1) });
    await response.prepareSettlement(AuthoritySide.Taker);
    await response.prepareSettlement(AuthoritySide.Maker);

    // TODO: This is kind of strange, need to pass in two takers?
    await response.settle(maker, [taker, taker]);
    //await tokenMeasurer.expectChange([
    //  { token: "asset", user: taker, delta: withTokenDecimals(1) },
    //  { token: "asset", user: maker, delta: withTokenDecimals(-1) },
    //  { token: "quote", user: taker, delta: withTokenDecimals(-22_000) },
    //  { token: "quote", user: maker, delta: withTokenDecimals(22_000) },
    //]);

    await response.unlockResponseCollateral();
    await response.cleanUp();
  });

  /*it("Create sell RFQ with two spot legs, respond and settle multiple responses", async () => {
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
      bid: Quote.getStandart(toAbsolutePrice(withTokenDecimals(90_000)), toLegMultiplier(0.5)),
    });
    // respond with quote for twice of legs once more with higher price
    const secondResponse = await rfq.respond({
      bid: Quote.getStandart(toAbsolutePrice(withTokenDecimals(91_000)), toLegMultiplier(2)),
    });

    // taker confirms first response, but only half of it
    await response.confirm({ side: Side.Bid, legMultiplierBps: toLegMultiplier(0.25) });
    const firstMeasurer = await TokenChangeMeasurer.takeSnapshot(context, ["asset", "quote", ethMint], [taker, maker]);
    await response.prepareSettlement(AuthoritySide.Taker);
    await response.prepareSettlement(AuthoritySide.Maker);
    // taker should spend 1.25 bitcoins, receive 2.5 eth and 22.5k$
    await response.settle(taker, [maker, taker]);
    await firstMeasurer.expectChange([
      { token: "asset", user: taker, delta: withTokenDecimals(-1.25) },
      { token: "asset", user: maker, delta: withTokenDecimals(1.25) },
      { token: ethMint, user: taker, delta: withTokenDecimals(2.5) },
      { token: ethMint, user: maker, delta: withTokenDecimals(-2.5) },
      { token: "quote", user: taker, delta: withTokenDecimals(22_500) },
      { token: "quote", user: maker, delta: withTokenDecimals(-22_500) },
    ]);
    await response.unlockResponseCollateral();
    await response.cleanUpResponse();

    // taker confirms second response
    await secondResponse.confirm({ side: Side.Bid });
    const secondMeasurer = await TokenChangeMeasurer.takeSnapshot(context, ["asset", "quote", ethMint], [taker, maker]);
    await secondResponse.prepareSettlement(AuthoritySide.Taker);
    await secondResponse.prepareSettlement(AuthoritySide.Maker);
    // taker should spend 10 bitcoins, receive 20 eth and 182k$
    await secondResponse.settle(taker, [maker, taker]);
    await secondMeasurer.expectChange([
      { token: "asset", user: taker, delta: withTokenDecimals(-10) },
      { token: "asset", user: maker, delta: withTokenDecimals(10) },
      { token: ethMint, user: taker, delta: withTokenDecimals(20) },
      { token: ethMint, user: maker, delta: withTokenDecimals(-20) },
      { token: "quote", user: taker, delta: withTokenDecimals(182_000) },
      { token: "quote", user: maker, delta: withTokenDecimals(-182_000) },
    ]);
    await secondResponse.unlockResponseCollateral();
    await secondResponse.cleanUpResponse();
  });

  it("Create fixed quote size buy RFQ, respond and settle response", async () => {
    // create a buy RFQ specifying 15 bitcoin as a leg(5 in leg with multiplier of 3)
    const rfq = await context.initializeRfq({
      legs: [new SpotInstrument(context, { amount: withTokenDecimals(5), side: Side.Bid })],
      fixedSize: FixedSize.getBaseAsset(toLegMultiplier(3)),
      orderType: OrderType.Buy,
    });
    // response with agreeing to sell 15 bitcoins for 103.333k$ per 5 bitcoins
    const response = await rfq.respond({
      ask: Quote.getFixedSize(toAbsolutePrice(withTokenDecimals(103_333))),
    });

    await response.confirm({ side: Side.Ask });
    let tokenMeasurer = await TokenChangeMeasurer.takeDefaultSnapshot(context);
    await response.prepareSettlement(AuthoritySide.Taker);
    await response.prepareSettlement(AuthoritySide.Maker);
    // taker should receive 15 bitcoins, maker should receive 309.999k$
    await response.settle(maker, [taker]);
    await tokenMeasurer.expectChange([
      { token: "asset", user: taker, delta: withTokenDecimals(15) },
      { token: "asset", user: maker, delta: withTokenDecimals(-15) },
      { token: "quote", user: taker, delta: withTokenDecimals(-309_999) },
      { token: "quote", user: maker, delta: withTokenDecimals(309_999) },
    ]);
    await response.unlockResponseCollateral();
    await response.cleanUpResponse();
  });

  it("Create fixed quote size sell RFQ, respond and settle response", async () => {
    // create a sell RFQ specifying 0.5 bitcoin in leg and fixed quote of 38.5k$
    const rfq = await context.initializeRfq({
      legs: [new SpotInstrument(context, { amount: withTokenDecimals(0.5), side: Side.Bid })],
      fixedSize: FixedSize.getQuoteAsset(withTokenDecimals(38_500)),
      orderType: OrderType.Sell,
    });
    // response with agreeing to buy for 11k$ per 0.5 bitcoin
    const response = await rfq.respond({
      bid: Quote.getFixedSize(toAbsolutePrice(withTokenDecimals(11_000))),
    });

    await response.confirm({ side: Side.Bid });
    let tokenMeasurer = await TokenChangeMeasurer.takeDefaultSnapshot(context);
    await response.prepareSettlement(AuthoritySide.Taker);
    await response.prepareSettlement(AuthoritySide.Maker);
    // taker should receive 1.75 bitcoins, maker should receive 38.5k$
    await response.settle(taker, [maker]);
    await tokenMeasurer.expectChange([
      { token: "asset", user: taker, delta: withTokenDecimals(-1.75) },
      { token: "asset", user: maker, delta: withTokenDecimals(1.75) },
      { token: "quote", user: taker, delta: withTokenDecimals(38_500) },
      { token: "quote", user: maker, delta: withTokenDecimals(-38_500) },
    ]);
    await response.unlockResponseCollateral();
    await response.cleanUpResponse();
  });

  it("Create RFQ, respond and confirm, taker prepares but maker defaults", async () => {
    const rfq = await context.initializeRfq({
      activeWindow: 2,
      settlingWindow: 1,
      orderType: OrderType.TwoWay,
    });
    const response = await rfq.respond();
    await response.confirm();

    let tokenMeasurer = await TokenChangeMeasurer.takeDefaultSnapshot(context);
    await response.prepareSettlement(AuthoritySide.Taker);
    await sleep(3000);
    await response.revertSettlementPreparation(AuthoritySide.Taker);
    // no assets are exchanged
    await tokenMeasurer.expectChange([
      { token: "asset", user: taker, delta: withTokenDecimals(0) },
      { token: "asset", user: maker, delta: withTokenDecimals(0) },
      { token: "quote", user: taker, delta: withTokenDecimals(0) },
      { token: "quote", user: maker, delta: withTokenDecimals(0) },
    ]);
    await response.settleOnePartyDefault();
    await response.cleanUpResponse();
    await rfq.cleanUp();
  });

  it("Create RFQ, respond and confirm, maker prepares but taker defaults", async () => {
    const rfq = await context.initializeRfq({
      activeWindow: 2,
      settlingWindow: 1,
      orderType: OrderType.TwoWay,
    });
    const response = await rfq.respond();
    await response.confirm();

    let tokenMeasurer = await TokenChangeMeasurer.takeDefaultSnapshot(context);
    await response.prepareSettlement(AuthoritySide.Maker);
    await sleep(3000);
    await response.revertSettlementPreparation(AuthoritySide.Maker);
    // no assets are exchanged
    await tokenMeasurer.expectChange([
      { token: "asset", user: taker, delta: withTokenDecimals(0) },
      { token: "asset", user: maker, delta: withTokenDecimals(0) },
      { token: "quote", user: taker, delta: withTokenDecimals(0) },
      { token: "quote", user: maker, delta: withTokenDecimals(0) },
    ]);
    await response.settleOnePartyDefault();
    await response.cleanUpResponse();
    await rfq.cleanUp();
  });

  it("Create RFQ, respond and confirm, both parties default", async () => {
    let tokenMeasurer = await TokenChangeMeasurer.takeSnapshot(context, ["unlockedCollateral"], [taker, maker, dao]);
    const rfq = await context.initializeRfq({
      activeWindow: 2,
      settlingWindow: 1,
      orderType: OrderType.TwoWay,
    });
    const response = await rfq.respond();
    await response.confirm();

    await sleep(3000);

    await response.settleTwoPartyDefault();
    await response.cleanUpResponse();
    await rfq.cleanUp();
    await tokenMeasurer.expectChange([
      { token: "unlockedCollateral", user: taker, delta: TAKER_CONFIRMED_COLLATERAL.neg() },
      { token: "unlockedCollateral", user: maker, delta: MAKER_CONFIRMED_COLLATERAL.neg() },
      { token: "unlockedCollateral", user: dao, delta: TAKER_CONFIRMED_COLLATERAL.add(MAKER_CONFIRMED_COLLATERAL) },
    ]);
  });

  it("Create RFQ, respond without confirmations and close", async () => {
    let tokenMeasurer = await TokenChangeMeasurer.takeSnapshot(context, ["unlockedCollateral"], [taker, maker]);
    const rfq = await context.initializeRfq({ activeWindow: 2, settlingWindow: 1 });
    const response = await rfq.respond();

    await sleep(2000);

    await rfq.unlockCollateral();
    await response.unlockResponseCollateral();
    await response.cleanUpResponse();
    await rfq.cleanUp();
    await tokenMeasurer.expectChange([
      { token: "unlockedCollateral", user: taker, delta: new BN(0) },
      { token: "unlockedCollateral", user: maker, delta: new BN(0) },
    ]);
  });*/
});
