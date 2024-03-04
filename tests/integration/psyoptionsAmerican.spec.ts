import { BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import {
  attachImprovedLogDisplay,
  runInParallelWithWait,
  toAbsolutePrice,
  TokenChangeMeasurer,
  toLegMultiplier,
  withoutSpotQuoteFees,
  withTokenDecimals,
} from "../utilities/helpers";
import * as anchor from "@coral-xyz/anchor";
import { Context, getContext } from "../utilities/wrappers";
import { AuthoritySide, Quote, LegSide, QuoteSide, OrderType } from "../utilities/types";
import {
  PsyoptionsAmericanInstrumentClass,
  AmericanPsyoptions,
} from "../utilities/instruments/psyoptionsAmericanInstrument";
import { OptionType } from "@mithraic-labs/tokenized-euros";

describe("Psyoptions American instrument integration tests", async () => {
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

  it("Create buy RFQ for 1 option [CALL]", async () => {
    const options = await AmericanPsyoptions.initalizeNewPsyoptionsAmerican(context, context.maker);
    await options.mintPsyOptions(context.maker, new anchor.BN(1), OptionType.CALL);

    const tokenMeasurer = await TokenChangeMeasurer.takeSnapshot(
      context,
      ["quote", "asset", options.optionMint],
      [context.taker.publicKey, context.maker.publicKey]
    );

    const rfq = await context.createEscrowRfq({
      legs: [
        PsyoptionsAmericanInstrumentClass.create(context, options, OptionType.CALL, {
          amount: new BN(1),
          side: LegSide.Long,
        }),
      ],
    });

    // Response with agreeing to sell 2 options for 50$ or buy 5 for 45$
    const response = await rfq.respond({
      bid: Quote.getStandard(toAbsolutePrice(withTokenDecimals(45)), toLegMultiplier(5)),
      ask: Quote.getStandard(toAbsolutePrice(withTokenDecimals(50)), toLegMultiplier(2)),
    });

    // Taker confirms to buy 1 option
    await response.confirm({ side: QuoteSide.Ask, legMultiplierBps: toLegMultiplier(1) });
    await response.prepareEscrowSettlement(AuthoritySide.Taker);
    await response.prepareEscrowSettlement(AuthoritySide.Maker);

    // taker should receive 1 option, maker should receive 50$ and lose 1 bitcoin as option collateral
    await response.settleEscrow(maker, [taker]);
    await tokenMeasurer.expectChange([
      { token: options.optionMint, user: taker, delta: new BN(1) },
      { token: "quote", user: taker, delta: withTokenDecimals(-50) },
      { token: "quote", user: maker, delta: withoutSpotQuoteFees(withTokenDecimals(50)) },
      { token: "asset", user: maker, delta: withTokenDecimals(0) },
      { token: options.optionMint, user: maker, delta: new BN(-1) },
    ]);

    await response.cleanUp();
  });

  it("Create buy RFQ for 1 option [PUT]", async () => {
    const options = await AmericanPsyoptions.initalizeNewPsyoptionsAmerican(context, context.maker, {
      optionType: OptionType.PUT,
    });
    await options.mintPsyOptions(context.maker, new anchor.BN(1), OptionType.PUT);

    const tokenMeasurer = await TokenChangeMeasurer.takeSnapshot(
      context,
      ["quote", "asset", options.optionMint],
      [context.taker.publicKey, context.maker.publicKey]
    );

    const rfq = await context.createEscrowRfq({
      legs: [
        PsyoptionsAmericanInstrumentClass.create(context, options, OptionType.PUT, {
          amount: new BN(1),
          side: LegSide.Long,
        }),
      ],
    });

    // Response with agreeing to sell 2 options for 50$ or buy 5 for 45$
    const response = await rfq.respond({
      bid: Quote.getStandard(toAbsolutePrice(withTokenDecimals(45)), toLegMultiplier(5)),
      ask: Quote.getStandard(toAbsolutePrice(withTokenDecimals(50)), toLegMultiplier(2)),
    });

    // Taker confirms to buy 1 option
    await response.confirm({
      side: QuoteSide.Ask,
      legMultiplierBps: toLegMultiplier(1),
    });
    await response.prepareEscrowSettlement(AuthoritySide.Taker);
    await response.prepareEscrowSettlement(AuthoritySide.Maker);

    // taker should receive 1 option, maker should receive 50$ and lose 1 bitcoin as option collateral
    await response.settleEscrow(maker, [taker]);
    await tokenMeasurer.expectChange([
      { token: options.optionMint, user: taker, delta: new BN(1) },
      { token: "quote", user: taker, delta: withTokenDecimals(-50) },
      { token: "quote", user: maker, delta: withoutSpotQuoteFees(withTokenDecimals(50)) },
      { token: "asset", user: maker, delta: withTokenDecimals(0) },
      { token: options.optionMint, user: maker, delta: new BN(-1) },
    ]);

    await response.cleanUp();
  });

  it("Create sell RFQ where taker wants 2 options", async () => {
    const options = await AmericanPsyoptions.initalizeNewPsyoptionsAmerican(context, context.taker);
    await options.mintPsyOptions(context.taker, new anchor.BN(2), OptionType.CALL);
    const tokenMeasurer = await TokenChangeMeasurer.takeSnapshot(
      context,
      ["asset", "quote", options.optionMint],
      [taker, maker]
    );

    // Create a two way RFQ specifying 1 option call as a leg
    const rfq = await context.createEscrowRfq({
      legs: [
        PsyoptionsAmericanInstrumentClass.create(context, options, OptionType.CALL, {
          amount: new BN(1),
          side: LegSide.Long,
        }),
      ],
    });

    // Response with agreeing to buy 2 options for 45$
    const response = await rfq.respond({
      bid: Quote.getStandard(toAbsolutePrice(withTokenDecimals(45)), toLegMultiplier(2)),
    });
    await response.confirm({
      side: QuoteSide.Bid,
      legMultiplierBps: toLegMultiplier(2),
    });

    // taker confirms to sell 2 options

    try {
      await response.prepareEscrowSettlement(AuthoritySide.Taker);
    } catch (e) {
      console.error(e);
    }

    try {
      await response.prepareEscrowSettlement(AuthoritySide.Maker);
    } catch (e) {
      console.error(e);
    }

    // taker should redceive 90$, maker should receive 2 options
    await response.settleEscrow(taker, [maker]);

    await tokenMeasurer.expectChange([
      { token: options.optionMint, user: taker, delta: new BN(-2) },
      { token: "quote", user: taker, delta: withoutSpotQuoteFees(withTokenDecimals(90)) },
      { token: "quote", user: maker, delta: withTokenDecimals(-90) },
      { token: "asset", user: maker, delta: withTokenDecimals(0) },
      { token: options.optionMint, user: maker, delta: new BN(2) },
    ]);

    await response.cleanUp();
  });

  it("Create two-way RFQ with one Psyoptions American option leg, respond but maker defaults on settlement", async () => {
    // Create a two way RFQ specifying 1 option put as a leg
    const options = await AmericanPsyoptions.initalizeNewPsyoptionsAmerican(context, context.taker);
    await options.mintPsyOptions(context.taker, new anchor.BN(2), OptionType.CALL);

    const rfq = await context.createEscrowRfq({
      activeWindow: 2,
      settlingWindow: 1,
      legs: [
        PsyoptionsAmericanInstrumentClass.create(context, options, OptionType.CALL, {
          amount: new BN(1),
          side: LegSide.Long,
        }),
      ],
      orderType: OrderType.TwoWay,
    });

    const [response, tokenMeasurer] = await runInParallelWithWait(async () => {
      // response with agreeing to buy 5 options for 45$
      const response = await rfq.respond({
        bid: Quote.getStandard(toAbsolutePrice(withTokenDecimals(45)), toLegMultiplier(5)),
        expirationTimestamp: Date.now() / 1000 + 1,
      });

      // taker confirms to sell 2 options
      await response.confirm({ side: QuoteSide.Bid, legMultiplierBps: toLegMultiplier(2) });
      const tokenMeasurer = await TokenChangeMeasurer.takeSnapshot(context, [options.optionMint], [taker]);
      await response.prepareEscrowSettlement(AuthoritySide.Taker);

      return [response, tokenMeasurer];
    }, 3.5);

    await response.revertEscrowSettlementPreparation(AuthoritySide.Taker);

    // taker have returned his assets
    await tokenMeasurer.expectChange([{ token: options.optionMint, user: taker, delta: new BN(0) }]);

    await response.cleanUp();
    await rfq.cleanUp();
  });

  it("Create two-way RFQ with one Psyoptions American option leg, respond but taker defaults on settlement", async () => {
    // create a two way RFQ specifying 1 option put as a leg
    const options = await AmericanPsyoptions.initalizeNewPsyoptionsAmerican(context, context.taker);
    await options.mintPsyOptions(context.taker, new anchor.BN(2), OptionType.CALL);
    const rfq = await context.createEscrowRfq({
      activeWindow: 2,
      settlingWindow: 1,
      legs: [
        PsyoptionsAmericanInstrumentClass.create(context, options, OptionType.CALL, {
          amount: new BN(1),
          side: LegSide.Long,
        }),
      ],
      orderType: OrderType.TwoWay,
    });

    const [response, tokenMeasurer] = await runInParallelWithWait(async () => {
      // response with agreeing to buy 5 options for 45$
      const response = await rfq.respond({
        bid: Quote.getStandard(toAbsolutePrice(withTokenDecimals(45)), toLegMultiplier(5)),
        expirationTimestamp: Date.now() / 1000 + 1,
      });

      // taker confirms to sell 2 options
      await response.confirm({
        side: QuoteSide.Bid,
        legMultiplierBps: toLegMultiplier(2),
      });
      const tokenMeasurer = await TokenChangeMeasurer.takeSnapshot(context, ["quote"], [maker]);
      await response.prepareEscrowSettlement(AuthoritySide.Maker);
      await tokenMeasurer.expectChange([{ token: "quote", user: maker, delta: withTokenDecimals(new BN(-90)) }]);

      return [response, tokenMeasurer];
    }, 3.5);

    await response.revertEscrowSettlementPreparation(AuthoritySide.Maker);

    // taker have returned his assets
    await tokenMeasurer.expectChange([{ token: "quote", user: maker, delta: new BN(0) }]);
    await response.cleanUp();
    await rfq.cleanUp();
  });

  it("With fractional leg multiplier, rounds option amount to a bigger amount for a maker at settlement", async () => {
    const options = await AmericanPsyoptions.initalizeNewPsyoptionsAmerican(context, context.taker);
    await options.mintPsyOptions(context.taker, new anchor.BN(1), OptionType.CALL);

    const tokenMeasurer = await TokenChangeMeasurer.takeSnapshot(
      context,
      ["quote", options.optionMint],
      [taker, maker]
    );

    const rfq = await context.createEscrowRfq({
      legs: [
        PsyoptionsAmericanInstrumentClass.create(context, options, OptionType.CALL, {
          amount: new BN(1),
          side: LegSide.Long,
        }),
      ],
    });

    // Response with agreeing to sell 2 options for 50$ or buy 5 for 40$
    const response = await rfq.respond({
      bid: Quote.getStandard(toAbsolutePrice(withTokenDecimals(40)), toLegMultiplier(5)),
      ask: Quote.getStandard(toAbsolutePrice(withTokenDecimals(50)), toLegMultiplier(2)),
    });

    // Taker confirms to sell 0.4 option
    await response.confirm({ side: QuoteSide.Bid, legMultiplierBps: toLegMultiplier(0.4) });
    await response.prepareEscrowSettlement(AuthoritySide.Taker);
    await response.prepareEscrowSettlement(AuthoritySide.Maker);

    // maker should receive 1 option(0.4 rounded up), taker should receive 40 * 0.4 = 16$
    await response.settleEscrow(taker, [maker]);
    await tokenMeasurer.expectChange([
      { token: options.optionMint, user: taker, delta: new BN(-1) },
      { token: options.optionMint, user: maker, delta: new BN(1) },
      { token: "quote", user: taker, delta: withoutSpotQuoteFees(withTokenDecimals(16)) },
      { token: "quote", user: maker, delta: withTokenDecimals(-16) },
    ]);

    await response.cleanUp();
  });

  it("With fractional leg multiplier, rounds option amount to a lower amount for a taker at settlement", async () => {
    const options = await AmericanPsyoptions.initalizeNewPsyoptionsAmerican(context, context.maker);
    await options.mintPsyOptions(context.maker, new anchor.BN(2), OptionType.CALL);

    const tokenMeasurer = await TokenChangeMeasurer.takeSnapshot(
      context,
      ["quote", options.optionMint],
      [taker, maker]
    );

    const rfq = await context.createEscrowRfq({
      legs: [
        PsyoptionsAmericanInstrumentClass.create(context, options, OptionType.CALL, {
          amount: new BN(1),
          side: LegSide.Long,
        }),
      ],
    });

    // Response with agreeing to sell 2 options for 50$ or buy 5 for 40$
    const response = await rfq.respond({
      bid: Quote.getStandard(toAbsolutePrice(withTokenDecimals(40)), toLegMultiplier(5)),
      ask: Quote.getStandard(toAbsolutePrice(withTokenDecimals(50)), toLegMultiplier(2)),
    });

    // Taker confirms to buy 1.4 option
    await response.confirm({ side: QuoteSide.Ask, legMultiplierBps: toLegMultiplier(1.4) });
    await response.prepareEscrowSettlement(AuthoritySide.Taker);
    await response.prepareEscrowSettlement(AuthoritySide.Maker);

    // taker should receive 1 option(1.4 rounded down), maker should receive 50 * 1.4 = 70$
    await response.settleEscrow(maker, [taker]);
    await tokenMeasurer.expectChange([
      { token: options.optionMint, user: taker, delta: new BN(1) },
      { token: options.optionMint, user: maker, delta: new BN(-1) },
      { token: "quote", user: taker, delta: withTokenDecimals(-70) },
      { token: "quote", user: maker, delta: withoutSpotQuoteFees(withTokenDecimals(70)) },
    ]);

    await response.cleanUp();
  });
});
