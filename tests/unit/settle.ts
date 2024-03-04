import { PublicKey } from "@solana/web3.js";
import { SpotInstrument } from "../utilities/instruments/spotInstrument";
import {
  TokenChangeMeasurer,
  attachImprovedLogDisplay,
  calculateSpotQuoteFee,
  toAbsolutePrice,
  toLegMultiplier,
  withTokenDecimals,
  withoutSpotQuoteFees,
} from "../utilities/helpers";
import { Context, getContext } from "../utilities/wrappers";
import { AuthoritySide, LegSide, Quote, QuoteSide } from "../utilities/types";

describe("Settle RFQ", () => {
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

  it("Protocol fees are correctly taken", async () => {
    let tokenMeasurer = await TokenChangeMeasurer.takeSnapshot(context, ["quote"], [taker, maker, dao]);

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
      { token: "quote", user: taker, delta: withTokenDecimals(-22_000) },
      { token: "quote", user: maker, delta: withoutSpotQuoteFees(withTokenDecimals(22_000)) },
      { token: "quote", user: dao, delta: calculateSpotQuoteFee(withTokenDecimals(22_000)) },
    ]);

    await response.cleanUp();
  });
});
