import { BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { BITCOIN_BASE_ASSET_INDEX } from "../utilities/constants";
import {
  attachImprovedLogDisplay,
  expectError,
  runInParallelWithWait,
  toAbsolutePrice,
  TokenChangeMeasurer,
  toLegMultiplier,
  withTokenDecimals,
  sleep,
  withoutSpotQuoteFees,
} from "../utilities/helpers";
import { SpotInstrument } from "../utilities/instruments/spotInstrument";
import { AuthoritySide, FixedSize, OrderType, Quote, QuoteSide, LegSide } from "../utilities/types";
import { Context, getContext, Mint } from "../utilities/wrappers";

describe("RFQ escrow settlement using spot integration tests", () => {
  let context: Context;
  let taker: PublicKey;
  let maker: PublicKey;
  let dao: PublicKey;

  beforeEach(function () {
    attachImprovedLogDisplay(this, context);
  });

  before(async () => {
    context = await getContext();
    taker = context.taker.publicKey;
    maker = context.maker.publicKey;
    dao = context.dao.publicKey;
  });

  it("Create an RFQ, fail to finalize it and remove", async () => {
    const rfq = await context.createEscrowRfq({
      allLegs: [SpotInstrument.createForLeg(context), SpotInstrument.createForLeg(context)], // wrong length of all length
      finalize: false,
    });

    await expectError(rfq.finalizeRfq(), "LegsSizeDoesNotMatchExpectedSize");
    await rfq.cleanUp();
  });

  it("Create an RFQ, cancel it and remove", async () => {
    const rfq = await context.createEscrowRfq();
    await rfq.cancel();
    await rfq.cleanUp();
  });

  it("Create an RFQ, it expires and is removed", async () => {
    const rfq = await context.createEscrowRfq({ activeWindow: 1 });
    await sleep(1.5);
    await rfq.cleanUp();
  });

  it("Create an RFQ, respond, active period ends and remove response and rfq", async () => {
    const rfq = await context.createEscrowRfq({ activeWindow: 2 });
    const response = await runInParallelWithWait(() => rfq.respond(), 2.5);

    await response.cleanUp();
    await rfq.cleanUp();
  });

  it("Create two-way RFQ with one spot leg, respond and settle as sell", async () => {
    let tokenMeasurer = await TokenChangeMeasurer.takeDefaultSnapshot(context);

    // create a two way RFQ specifying 1 bitcoin as a leg
    const rfq = await context.createEscrowRfq({
      legs: [SpotInstrument.createForLeg(context, { amount: withTokenDecimals(1), side: LegSide.Long })],
    });
    // response with agreeing to sell 2 bitcoins for 22k$ or buy 5 for 21900$
    const response = await rfq.respond({
      bid: Quote.getStandard(toAbsolutePrice(withTokenDecimals(21_900)), toLegMultiplier(5)),
      ask: Quote.getStandard(toAbsolutePrice(withTokenDecimals(22_000)), toLegMultiplier(2)),
    });
    // taker confirms to buy 1 bitcoin
    await response.confirm({ side: QuoteSide.Ask, legMultiplierBps: toLegMultiplier(1) });
    await response.prepareEscrowSettlement(AuthoritySide.Taker);
    await response.prepareEscrowSettlement(AuthoritySide.Maker);
    // taker should receive 1 bitcoins, maker should receive 22k$
    await response.settleEscrow(maker, [taker]);
    await tokenMeasurer.expectChange([
      { token: "asset", user: taker, delta: withTokenDecimals(1) },
      { token: "asset", user: maker, delta: withTokenDecimals(-1) },
      { token: "quote", user: taker, delta: withTokenDecimals(-22_000) },
      { token: "quote", user: maker, delta: withoutSpotQuoteFees(withTokenDecimals(22_000)) },
    ]);

    await response.cleanUp();
  });

  it("Successfully can settle rfq with negative prices", async () => {
    let tokenMeasurer = await TokenChangeMeasurer.takeDefaultSnapshot(context);

    // create a two way RFQ specifying 1 bitcoin ask as a leg
    const rfq = await context.createEscrowRfq({
      legs: [SpotInstrument.createForLeg(context, { amount: withTokenDecimals(1), side: LegSide.Short })],
    });
    // response with agreeing to sell 5 bitcoins for 22k$ or buy 2 for 20000$
    const response = await rfq.respond({
      bid: Quote.getStandard(toAbsolutePrice(withTokenDecimals(-22_000)), toLegMultiplier(5)),
      ask: Quote.getStandard(toAbsolutePrice(withTokenDecimals(-20_000)), toLegMultiplier(2)),
    });
    // taker confirms to sell 1.5 bitcoin
    await response.confirm({ side: QuoteSide.Ask, legMultiplierBps: toLegMultiplier(1.5) });
    await response.prepareEscrowSettlement(AuthoritySide.Taker);
    await response.prepareEscrowSettlement(AuthoritySide.Maker);
    // taker should receive 30k$, maker should receive 1.5 bitcoin
    await response.settleEscrow(taker, [maker]);
    await tokenMeasurer.expectChange([
      { token: "asset", user: taker, delta: withTokenDecimals(-1.5) },
      { token: "asset", user: maker, delta: withTokenDecimals(1.5) },
      { token: "quote", user: taker, delta: withoutSpotQuoteFees(withTokenDecimals(30_000)) },
      { token: "quote", user: maker, delta: withTokenDecimals(-30_000) },
    ]);

    await response.cleanUp();
  });

  it("Create sell RFQ with two spot legs, respond and settle multiple responses", async () => {
    // create a sell RFQ specifying 5 bitcoin bid and 1000 sol ask
    const rfq = await context.createEscrowRfq({
      legs: [
        SpotInstrument.createForLeg(context, {
          amount: withTokenDecimals(5),
          side: LegSide.Long,
        }),
        SpotInstrument.createForLeg(context, {
          mint: context.solToken,
          amount: withTokenDecimals(1000),
          side: LegSide.Short,
        }),
      ],
      orderType: OrderType.Sell,
    });
    // respond with quote for half of legs
    const response = await rfq.respond({
      bid: Quote.getStandard(toAbsolutePrice(withTokenDecimals(70_000)), toLegMultiplier(0.5)),
    });
    // respond with quote for twice of legs once more with higher price
    const secondResponse = await rfq.respond({
      bid: Quote.getStandard(toAbsolutePrice(withTokenDecimals(71_000)), toLegMultiplier(2)),
    });

    // taker confirms first response, but only half of it
    await response.confirm({
      side: QuoteSide.Bid,
      legMultiplierBps: toLegMultiplier(0.25),
    });
    const firstMeasurer = await TokenChangeMeasurer.takeSnapshot(
      context,
      ["asset", "quote", "additionalAsset"],
      [taker, maker]
    );
    await response.prepareEscrowSettlement(AuthoritySide.Taker);
    await response.prepareEscrowSettlement(AuthoritySide.Maker);
    // taker should spend 1.25 bitcoins, receive 250 sol and 17.5k$
    await response.settleEscrow(taker, [maker, taker]);
    await firstMeasurer.expectChange([
      { token: "asset", user: taker, delta: withTokenDecimals(-1.25) },
      { token: "asset", user: maker, delta: withTokenDecimals(1.25) },
      { token: "additionalAsset", user: taker, delta: withTokenDecimals(250) },
      { token: "additionalAsset", user: maker, delta: withTokenDecimals(-250) },
      { token: "quote", user: taker, delta: withoutSpotQuoteFees(withTokenDecimals(17_500)) },
      { token: "quote", user: maker, delta: withTokenDecimals(-17_500) },
    ]);
    await response.cleanUp();

    // taker confirms second response
    await secondResponse.confirm({ side: QuoteSide.Bid });
    const secondMeasurer = await TokenChangeMeasurer.takeSnapshot(
      context,
      ["asset", "quote", "additionalAsset"],
      [taker, maker]
    );
    await secondResponse.prepareEscrowSettlement(AuthoritySide.Taker);
    await secondResponse.prepareEscrowSettlement(AuthoritySide.Maker);
    // taker should spend 10 bitcoins, receive 2000 sol and 142k$
    await secondResponse.settleEscrow(taker, [maker, taker]);
    await secondMeasurer.expectChange([
      { token: "asset", user: taker, delta: withTokenDecimals(-10) },
      { token: "asset", user: maker, delta: withTokenDecimals(10) },
      { token: "additionalAsset", user: taker, delta: withTokenDecimals(2000) },
      {
        token: "additionalAsset",
        user: maker,
        delta: withTokenDecimals(-2000),
      },
      { token: "quote", user: taker, delta: withoutSpotQuoteFees(withTokenDecimals(142_000)) },
      { token: "quote", user: maker, delta: withTokenDecimals(-142_000) },
    ]);
    await secondResponse.cleanUp();
  });

  it("Create fixed leg size buy RFQ, respond and settle response", async () => {
    // create a buy RFQ specifying 15 bitcoin as a leg(5 in leg with multiplier of 3)
    const rfq = await context.createEscrowRfq({
      legs: [SpotInstrument.createForLeg(context, { amount: withTokenDecimals(5), side: LegSide.Long })],
      fixedSize: FixedSize.getBaseAsset(toLegMultiplier(3)),
      orderType: OrderType.Buy,
    });
    // response with agreeing to sell 15 bitcoins for 103.333k$ per 5 bitcoins
    const response = await rfq.respond({
      ask: Quote.getFixedSize(toAbsolutePrice(withTokenDecimals(103_333))),
    });

    await response.confirm({ side: QuoteSide.Ask });
    let tokenMeasurer = await TokenChangeMeasurer.takeDefaultSnapshot(context);
    await response.prepareEscrowSettlement(AuthoritySide.Taker);
    await response.prepareEscrowSettlement(AuthoritySide.Maker);
    // taker should receive 15 bitcoins, maker should receive 309.999k$
    await response.settleEscrow(maker, [taker]);
    await tokenMeasurer.expectChange([
      { token: "asset", user: taker, delta: withTokenDecimals(15) },
      { token: "asset", user: maker, delta: withTokenDecimals(-15) },
      { token: "quote", user: taker, delta: withTokenDecimals(-309_999) },
      { token: "quote", user: maker, delta: withoutSpotQuoteFees(withTokenDecimals(309_999)) },
    ]);
    await response.cleanUp();
  });

  it("Create fixed quote size sell RFQ, respond and settle response", async () => {
    // create a sell RFQ specifying 0.5 bitcoin in leg and fixed quote of 38.5k$
    const rfq = await context.createEscrowRfq({
      legs: [SpotInstrument.createForLeg(context, { amount: withTokenDecimals(0.5), side: LegSide.Long })],
      fixedSize: FixedSize.getQuoteAsset(withTokenDecimals(38_500)),
      orderType: OrderType.Sell,
    });
    // response with agreeing to buy for 11k$ per 0.5 bitcoin
    const response = await rfq.respond({
      bid: Quote.getFixedSize(toAbsolutePrice(withTokenDecimals(11_000))),
    });

    await response.confirm({ side: QuoteSide.Bid });
    let tokenMeasurer = await TokenChangeMeasurer.takeDefaultSnapshot(context);
    await response.prepareEscrowSettlement(AuthoritySide.Taker);
    await response.prepareEscrowSettlement(AuthoritySide.Maker);
    // taker should receive 1.75 bitcoins, maker should receive 38.5k$
    await response.settleEscrow(taker, [maker]);
    await tokenMeasurer.expectChange([
      { token: "asset", user: taker, delta: withTokenDecimals(-1.75) },
      { token: "asset", user: maker, delta: withTokenDecimals(1.75) },
      { token: "quote", user: taker, delta: withoutSpotQuoteFees(withTokenDecimals(38_500)) },
      { token: "quote", user: maker, delta: withTokenDecimals(-38_500) },
    ]);
    await response.cleanUp();
  });

  it("Create RFQ, respond, confirm, but settle after settling period ends", async () => {
    const rfq = await context.createEscrowRfq({ activeWindow: 2, settlingWindow: 1 });
    const response = await runInParallelWithWait(async () => {
      const response = await rfq.respond();
      await response.confirm();

      await response.prepareEscrowSettlement(AuthoritySide.Taker);
      await response.prepareEscrowSettlement(AuthoritySide.Maker);
      return response;
    }, 3.5);

    await response.settleEscrow(taker, [maker]);
    await response.cleanUp();
    await rfq.cleanUp();
  });

  it("Create RFQ, respond and confirm, taker prepares but maker defaults", async () => {
    const rfq = await context.createEscrowRfq({ activeWindow: 2, settlingWindow: 1 });

    const [response, tokenMeasurer] = await runInParallelWithWait(async () => {
      const response = await rfq.respond({
        expirationTimestamp: Date.now() / 1000 + 1,
      });
      await response.confirm();

      let tokenMeasurer = await TokenChangeMeasurer.takeDefaultSnapshot(context);
      await response.prepareEscrowSettlement(AuthoritySide.Taker);

      return [response, tokenMeasurer];
    }, 3.5);

    await response.revertEscrowSettlementPreparation(AuthoritySide.Taker);
    // no assets are exchanged
    await tokenMeasurer.expectChange([
      { token: "asset", user: taker, delta: withTokenDecimals(0) },
      { token: "asset", user: maker, delta: withTokenDecimals(0) },
      { token: "quote", user: taker, delta: withTokenDecimals(0) },
      { token: "quote", user: maker, delta: withTokenDecimals(0) },
    ]);
    await response.cleanUp();
    await rfq.cleanUp();
  });

  it("Create RFQ, respond and confirm, taker prepares but maker only partly prepares and defaults", async () => {
    const rfq = await context.createEscrowRfq({
      legs: [
        SpotInstrument.createForLeg(context, { mint: context.btcToken }),
        SpotInstrument.createForLeg(context, { mint: context.solToken, side: LegSide.Short }),
      ],
      activeWindow: 2,
      settlingWindow: 1,
    });

    const response = await runInParallelWithWait(async () => {
      const response = await rfq.respond();
      await response.confirm();

      await response.prepareEscrowSettlement(AuthoritySide.Taker);
      await response.prepareEscrowSettlement(AuthoritySide.Maker, 1);

      return response;
    }, 3.5);

    await response.revertEscrowSettlementPreparation(AuthoritySide.Maker, 1);
    await response.revertEscrowSettlementPreparation(AuthoritySide.Taker);

    await response.cleanUp();
    await rfq.cleanUp();
  });

  it("Create RFQ, respond and confirm, maker prepares but taker defaults", async () => {
    const rfq = await context.createEscrowRfq({ activeWindow: 2, settlingWindow: 1 });

    const [response, tokenMeasurer] = await runInParallelWithWait(async () => {
      const response = await rfq.respond({
        expirationTimestamp: Date.now() / 1000 + 1,
      });
      await response.confirm();

      let tokenMeasurer = await TokenChangeMeasurer.takeDefaultSnapshot(context);
      await response.prepareEscrowSettlement(AuthoritySide.Maker);

      return [response, tokenMeasurer];
    }, 3.5);

    await response.revertEscrowSettlementPreparation(AuthoritySide.Maker);
    // no assets are exchanged
    await tokenMeasurer.expectChange([
      { token: "asset", user: taker, delta: withTokenDecimals(0) },
      { token: "asset", user: maker, delta: withTokenDecimals(0) },
      { token: "quote", user: taker, delta: withTokenDecimals(0) },
      { token: "quote", user: maker, delta: withTokenDecimals(0) },
    ]);
    await response.cleanUp();
    await rfq.cleanUp();
  });

  it("Create RFQ, respond and confirm, maker prepares but taker only partly prepares and defaults", async () => {
    const rfq = await context.createEscrowRfq({
      legs: [
        SpotInstrument.createForLeg(context, { mint: context.btcToken }),
        SpotInstrument.createForLeg(context, { mint: context.solToken, side: LegSide.Short }),
      ],
      activeWindow: 2,
      settlingWindow: 1,
    });

    const response = await runInParallelWithWait(async () => {
      const response = await rfq.respond();
      await response.confirm();

      await response.prepareEscrowSettlement(AuthoritySide.Maker);
      await response.prepareEscrowSettlement(AuthoritySide.Taker, 1);

      return response;
    }, 3.5);

    await response.revertEscrowSettlementPreparation(AuthoritySide.Maker);
    await response.revertEscrowSettlementPreparation(AuthoritySide.Taker, 1);

    await response.cleanUp();
    await rfq.cleanUp();
  });

  it("Create RFQ, respond and confirm, both parties default", async () => {
    let tokenMeasurer = await TokenChangeMeasurer.takeSnapshot(context, ["unlockedCollateral"], [taker, maker, dao]);
    const rfq = await context.createEscrowRfq({ activeWindow: 2, settlingWindow: 1 });

    const response = await runInParallelWithWait(async () => {
      const response = await rfq.respond({
        expirationTimestamp: Date.now() / 1000 + 1,
      });
      await response.confirm();

      return response;
    }, 3.5);

    await response.cleanUp();
    await rfq.cleanUp();
    await tokenMeasurer.expectChange([
      {
        token: "unlockedCollateral",
        user: taker,
        delta: withTokenDecimals(0),
      },
      {
        token: "unlockedCollateral",
        user: maker,
        delta: withTokenDecimals(0),
      },
      {
        token: "unlockedCollateral",
        user: dao,
        delta: withTokenDecimals(0),
      },
    ]);
  });

  it("Create RFQ, respond and confirm, both parties only partly prepare and default", async () => {
    const rfq = await context.createEscrowRfq({
      legs: [
        SpotInstrument.createForLeg(context, { mint: context.btcToken }),
        SpotInstrument.createForLeg(context, { mint: context.solToken, side: LegSide.Short }),
      ],
      activeWindow: 2,
      settlingWindow: 1,
    });
    const response = await runInParallelWithWait(async () => {
      const response = await rfq.respond();
      await response.confirm();
      await response.prepareEscrowSettlement(AuthoritySide.Taker, 1);
      await response.prepareEscrowSettlement(AuthoritySide.Maker, 1);

      return response;
    }, 3.5);

    await response.revertEscrowSettlementPreparation(AuthoritySide.Taker, 1);
    await response.revertEscrowSettlementPreparation(AuthoritySide.Maker, 1);
    await response.cleanUp(1);
    await rfq.cleanUp();
  });

  it("Create RFQ, respond, cancel response and close all", async () => {
    let tokenMeasurer = await TokenChangeMeasurer.takeSnapshot(context, ["unlockedCollateral"], [taker, maker]);
    const rfq = await context.createEscrowRfq({ activeWindow: 2, settlingWindow: 1 });
    await runInParallelWithWait(async () => {
      const response = await rfq.respond({
        expirationTimestamp: Date.now() / 1000 + 1,
      });
      await response.cancel();
      await response.cleanUp();
    }, 2.5);
    await rfq.cleanUp();
    await tokenMeasurer.expectChange([
      { token: "unlockedCollateral", user: taker, delta: new BN(0) },
      { token: "unlockedCollateral", user: maker, delta: new BN(0) },
    ]);
  });

  it("Create RFQ, cancel it and clean up", async () => {
    const rfq = await context.createEscrowRfq();
    await rfq.cancel();
    await rfq.cleanUp();
  });

  it("Create RFQ with a lot of spot legs and settle it", async () => {
    const legAmount = 10;
    const mints = await Promise.all(
      [...Array(legAmount)].map(async () => {
        const mint = await Mint.create(context);
        await mint.register(BITCOIN_BASE_ASSET_INDEX);
        return mint;
      })
    );
    const legs = mints.map((mint) =>
      SpotInstrument.createForLeg(context, {
        mint,
      })
    );
    const rfq = await context.createEscrowRfq({
      legs: legs.slice(0, legAmount / 2),
      allLegs: legs,
      finalize: false,
    });
    await rfq.addLegs(legs.slice(legAmount / 2), false);
    await rfq.finalizeRfq();
    const response = await rfq.respond();
    await response.confirm();
    await response.prepareEscrowSettlement(AuthoritySide.Taker, legAmount / 2);
    await response.prepareMoreEscrowLegsSettlement(AuthoritySide.Taker, legAmount / 2, legAmount / 2);
    await response.prepareEscrowSettlement(AuthoritySide.Maker, legAmount / 2);
    await response.prepareMoreEscrowLegsSettlement(AuthoritySide.Maker, legAmount / 2, legAmount / 2);
    await response.partiallySettleEscrowLegs(
      [...Array(legAmount / 2)].map(() => maker),
      legAmount / 2
    );
    await response.settleEscrow(
      taker,
      [...Array(legAmount / 2)].map(() => maker),
      legAmount / 2
    );

    await response.cleanUpEscrowLegs(legAmount / 2);
    await response.cleanUp(legAmount / 2);
  });

  it("Create RFQ with a lot of spot legs and default with partial preparation", async () => {
    const legAmount = 8;
    const mints = await Promise.all(
      [...Array(legAmount)].map(async () => {
        const mint = await Mint.create(context);
        await mint.register(BITCOIN_BASE_ASSET_INDEX);
        return mint;
      })
    );
    const legs = mints.map((mint) =>
      SpotInstrument.createForLeg(context, {
        mint,
      })
    );
    const rfq = await context.createEscrowRfq({
      legs: legs.slice(0, legAmount / 2),
      allLegs: legs,
      finalize: false,
      activeWindow: 3,
      settlingWindow: 1,
    });
    await rfq.addLegs(legs.slice(legAmount / 2));

    const response = await runInParallelWithWait(async () => {
      const response = await rfq.respond({
        expirationTimestamp: Date.now() / 1000 + 2,
      });
      await response.confirm();
      await response.prepareEscrowSettlement(AuthoritySide.Taker, legAmount / 2);
      await response.prepareMoreEscrowLegsSettlement(AuthoritySide.Taker, legAmount / 2, legAmount / 2);
      await response.prepareEscrowSettlement(AuthoritySide.Maker, legAmount / 2);

      return response;
    }, 4.5);

    await response.partlyRevertEscrowSettlementPreparation(AuthoritySide.Taker, legAmount / 2);
    await response.revertEscrowSettlementPreparation(AuthoritySide.Taker, legAmount / 2);
    await response.revertEscrowSettlementPreparation(AuthoritySide.Maker, legAmount / 2);

    await response.cleanUpEscrowLegs(legAmount / 2);
    await response.cleanUp(legAmount / 2);
  });

  it("Create two-way RFQ with one spot leg add a whitelist of 3 addresses , respond", async () => {
    // create a two way RFQ specifying 1 bitcoin as a leg
    const rfq = await context.createEscrowRfq({
      legs: [
        SpotInstrument.createForLeg(context, {
          amount: withTokenDecimals(1),
          side: LegSide.Long,
        }),
      ],
      activeWindow: 2,
      whitelistPubkeyList: [maker, taker, dao],
    });
    const response = await rfq.respond({
      bid: Quote.getStandard(toAbsolutePrice(withTokenDecimals(21_900)), toLegMultiplier(5)),
      ask: Quote.getStandard(toAbsolutePrice(withTokenDecimals(22_000)), toLegMultiplier(2)),
      expirationTimestamp: Date.now() / 1000 + 1,
    });
    await response.cancel();
    await response.cleanUp();
    await sleep(2);
    await rfq.cleanUp();
  });

  it("Create two-way RFQ with one spot leg add a whitelist of 3 addresses , respond but maker not in list", async () => {
    const newPubkey = new PublicKey("2Jpwh3rvtHe2X67TxpAGEB4x751FNMwWzDyQHhBjqfKg");

    // create a two way RFQ specifying 1 bitcoin as a leg
    const rfq = await context.createEscrowRfq({
      legs: [
        SpotInstrument.createForLeg(context, {
          amount: withTokenDecimals(1),
          side: LegSide.Long,
        }),
      ],
      whitelistPubkeyList: [newPubkey],
    });

    await expectError(
      rfq.respond({
        bid: Quote.getStandard(toAbsolutePrice(withTokenDecimals(21_900)), toLegMultiplier(5)),
        ask: Quote.getStandard(toAbsolutePrice(withTokenDecimals(22_000)), toLegMultiplier(2)),
      }),
      "MakerAddressNotWhitelisted"
    );
  });

  // Skipping as it takes too long to complete
  it.skip("Create RFQ with max amount of legs and settle it", async () => {
    const legAmount = 25;
    const mints = await Promise.all(
      [...Array(legAmount)].map(async () => {
        const mint = await Mint.create(context);
        await mint.register(BITCOIN_BASE_ASSET_INDEX);
        return mint;
      })
    );
    const legs = mints.map((mint) =>
      SpotInstrument.createForLeg(context, {
        mint,
      })
    );
    const rfq = await context.createEscrowRfq({
      legs: legs.slice(0, 7),
      allLegs: legs,
      finalize: false,
    });
    await rfq.addLegs(legs.slice(7, 16), false);
    await rfq.addLegs(legs.slice(16), false);
    await rfq.finalizeRfq();
    const response = await rfq.respond();
    await response.confirm();

    await response.prepareEscrowSettlement(AuthoritySide.Taker, 5);
    await response.prepareMoreEscrowLegsSettlement(AuthoritySide.Taker, 5, 6);
    await response.prepareMoreEscrowLegsSettlement(AuthoritySide.Taker, 11, 6);
    await response.prepareMoreEscrowLegsSettlement(AuthoritySide.Taker, 17, 6);
    await response.prepareMoreEscrowLegsSettlement(AuthoritySide.Taker, 23, 2);

    await response.prepareEscrowSettlement(AuthoritySide.Maker, 5);
    await response.prepareMoreEscrowLegsSettlement(AuthoritySide.Maker, 5, 6);
    await response.prepareMoreEscrowLegsSettlement(AuthoritySide.Maker, 11, 6);
    await response.prepareMoreEscrowLegsSettlement(AuthoritySide.Maker, 17, 6);
    await response.prepareMoreEscrowLegsSettlement(AuthoritySide.Maker, 23, 2);

    await response.partiallySettleEscrowLegs(Array(legAmount).fill(maker), 8);
    await response.partiallySettleEscrowLegs(Array(legAmount).fill(maker), 8, 8);
    await response.partiallySettleEscrowLegs(Array(legAmount).fill(maker), 8, 16);
    await response.settleEscrow(taker, Array(legAmount).fill(maker), 24);

    await response.cleanUpEscrowLegs(10, 25);
    await response.cleanUpEscrowLegs(10, 15);
    await response.cleanUp(5);

    await rfq.cancel();
    await rfq.cleanUp();
  });

  // Skipping as it takes too long to complete
  it.skip("Create RFQ with max amount of legs and one party defaults", async () => {
    const legAmount = 25;
    const mints = await Promise.all(
      [...Array(legAmount)].map(async () => {
        const mint = await Mint.create(context);
        await mint.register(BITCOIN_BASE_ASSET_INDEX);
        return mint;
      })
    );
    const legs = mints.map((mint) =>
      SpotInstrument.createForLeg(context, {
        mint,
      })
    );
    const rfq = await context.createEscrowRfq({
      legs: legs.slice(0, 7),
      allLegs: legs,
      finalize: false,
      activeWindow: 3,
      settlingWindow: 1,
    });
    await rfq.addLegs(legs.slice(7, 16), false);
    await rfq.addLegs(legs.slice(16), false);
    await rfq.finalizeRfq();

    const response = await runInParallelWithWait(async () => {
      const response = await rfq.respond();
      await response.confirm();
      await response.prepareEscrowSettlement(AuthoritySide.Maker, 5);
      await response.prepareMoreEscrowLegsSettlement(AuthoritySide.Maker, 5, 6);
      await response.prepareMoreEscrowLegsSettlement(AuthoritySide.Maker, 11, 6);
      await response.prepareMoreEscrowLegsSettlement(AuthoritySide.Maker, 17, 6);
      await response.prepareMoreEscrowLegsSettlement(AuthoritySide.Maker, 23, 2);

      return response;
    }, 4.5);

    await response.partlyRevertEscrowSettlementPreparation(AuthoritySide.Maker, 12);
    await response.partlyRevertEscrowSettlementPreparation(AuthoritySide.Maker, 12, 13);
    await response.revertEscrowSettlementPreparation(AuthoritySide.Maker, 1);

    await response.cleanUpEscrowLegs(10, 25);
    await response.cleanUpEscrowLegs(10, 15);
    await response.cleanUp(5);

    await rfq.cleanUp();
  });
});
