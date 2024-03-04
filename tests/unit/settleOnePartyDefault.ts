import { PublicKey } from "@solana/web3.js";
import { DEFAULT_DEFAULT_FEES } from "../utilities/constants";
import {
  attachImprovedLogDisplay,
  calculateFeesValue,
  runInParallelWithWait,
  toAbsolutePrice,
  TokenChangeMeasurer,
  toLegMultiplier,
  withTokenDecimals,
} from "../utilities/helpers";
import { SpotInstrument } from "../utilities/instruments/spotInstrument";

import { AuthoritySide, LegSide, Quote, QuoteSide } from "../utilities/types";
import { Context, getContext } from "../utilities/wrappers";

describe("Settle one party default", () => {
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

  it("Taker defaulting transfers the correct amount of fees", async () => {
    let tokenMeasurer = await TokenChangeMeasurer.takeSnapshot(context, ["unlockedCollateral"], [taker, maker, dao]);
    const rfq = await context.createEscrowRfq({
      legs: [SpotInstrument.createForLeg(context, { amount: withTokenDecimals(1), side: LegSide.Long })],
      activeWindow: 2,
      settlingWindow: 1,
    });

    const [_response, takerCollateralLocked, makerCollateralLocked] = await runInParallelWithWait(async () => {
      const response = await rfq.respond({
        bid: Quote.getStandard(toAbsolutePrice(withTokenDecimals(22_000)), toLegMultiplier(5)),
        expirationTimestamp: Date.now() / 1000 + 1,
      });

      await response.confirm({ side: QuoteSide.Bid, legMultiplierBps: toLegMultiplier(1) });
      await response.prepareEscrowSettlement(AuthoritySide.Maker);
      const responseState = await response.getData();

      return [response, responseState.takerCollateralLocked, responseState.makerCollateralLocked];
    }, 3.5);

    const totalFees = calculateFeesValue(takerCollateralLocked, DEFAULT_DEFAULT_FEES.taker).add(
      calculateFeesValue(makerCollateralLocked, DEFAULT_DEFAULT_FEES.maker)
    );

    await tokenMeasurer.expectChange([
      {
        token: "unlockedCollateral",
        user: taker,
        delta: takerCollateralLocked.neg(),
      },
      {
        token: "unlockedCollateral",
        user: maker,
        delta: takerCollateralLocked.sub(totalFees),
      },
      { token: "unlockedCollateral", user: dao, delta: totalFees },
    ]);
  });

  it("Maker defaulting transfers the correct amount of fees", async () => {
    let tokenMeasurer = await TokenChangeMeasurer.takeSnapshot(context, ["unlockedCollateral"], [taker, maker, dao]);
    const rfq = await context.createEscrowRfq({
      legs: [
        SpotInstrument.createForLeg(context, {
          mint: context.solToken,
          amount: withTokenDecimals(1),
          side: LegSide.Long,
        }),
      ],
      activeWindow: 2,
      settlingWindow: 1,
    });

    const [_response, takerCollateralLocked, makerCollateralLocked] = await runInParallelWithWait(async () => {
      const response = await rfq.respond({
        ask: Quote.getStandard(toAbsolutePrice(withTokenDecimals(30)), toLegMultiplier(1000)),
        expirationTimestamp: Date.now() / 1000 + 1,
      });

      await response.confirm({ side: QuoteSide.Ask, legMultiplierBps: toLegMultiplier(500) });
      await response.prepareEscrowSettlement(AuthoritySide.Taker);
      const responseState = await response.getData();

      return [response, responseState.takerCollateralLocked, responseState.makerCollateralLocked];
    }, 3.5);

    const totalFees = calculateFeesValue(takerCollateralLocked, DEFAULT_DEFAULT_FEES.taker).add(
      calculateFeesValue(makerCollateralLocked, DEFAULT_DEFAULT_FEES.maker)
    );

    await tokenMeasurer.expectChange([
      {
        token: "unlockedCollateral",
        user: taker,
        delta: makerCollateralLocked.sub(totalFees),
      },
      {
        token: "unlockedCollateral",
        user: maker,
        delta: makerCollateralLocked.neg(),
      },
      { token: "unlockedCollateral", user: dao, delta: totalFees },
    ]);
  });
});
