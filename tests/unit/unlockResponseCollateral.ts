import { PublicKey } from "@solana/web3.js";
import { DEFAULT_SETTLE_FEES } from "../utilities/constants";
import {
  attachImprovedLogDisplay,
  calculateFeesValue,
  toAbsolutePrice,
  TokenChangeMeasurer,
  toLegMultiplier,
  withTokenDecimals,
} from "../utilities/helpers";
import { SpotInstrument } from "../utilities/instruments/spotInstrument";

import { AuthoritySide, LegSide, Quote, QuoteSide } from "../utilities/types";
import { Context, getContext } from "../utilities/wrappers";

describe("Unlock response collateral", () => {
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

  it("Correct amount of fees is taken as result as settled response", async () => {
    let tokenMeasurer = await TokenChangeMeasurer.takeSnapshot(context, ["unlockedCollateral"], [taker, maker, dao]);
    const rfq = await context.createEscrowRfq({
      legs: [SpotInstrument.createForLeg(context, { amount: withTokenDecimals(22), side: LegSide.Long })],
    });

    const response = await rfq.respond({
      bid: Quote.getStandard(toAbsolutePrice(withTokenDecimals(22_000)), toLegMultiplier(1)),
    });

    await response.confirm({ side: QuoteSide.Bid, legMultiplierBps: toLegMultiplier(1) });
    await response.prepareEscrowSettlement(AuthoritySide.Taker);
    await response.prepareEscrowSettlement(AuthoritySide.Maker);
    await response.settleEscrow(taker, [maker]);
    const { takerCollateralLocked, makerCollateralLocked } = await response.getData();

    const takerFees = calculateFeesValue(takerCollateralLocked, DEFAULT_SETTLE_FEES.taker);
    const makerFees = calculateFeesValue(makerCollateralLocked, DEFAULT_SETTLE_FEES.maker);
    await tokenMeasurer.expectChange([
      { token: "unlockedCollateral", user: taker, delta: takerFees.neg() },
      { token: "unlockedCollateral", user: maker, delta: makerFees.neg() },
      { token: "unlockedCollateral", user: dao, delta: takerFees.add(makerFees) },
    ]);
  });
});
