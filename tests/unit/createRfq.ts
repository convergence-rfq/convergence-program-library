import { BN } from "@coral-xyz/anchor";
import { attachImprovedLogDisplay, expectError } from "../utilities/helpers";
import { getSpotInstrumentProgram, SpotInstrument } from "../utilities/instruments/spotInstrument";

import { Context, getContext } from "../utilities/wrappers";

describe("Create RFQ", () => {
  let context: Context;

  beforeEach(function () {
    attachImprovedLogDisplay(this, context);
  });

  before(async () => {
    context = await getContext();
  });

  it("Cannot create rfq with invalid legs hash", async () => {
    let fakeLegs = [SpotInstrument.createForLeg(context, { amount: new BN(999) })];
    let rfqLegs = [SpotInstrument.createForLeg(context, { amount: new BN(10) })];
    await expectError(
      context.createEscrowRfq({ legs: rfqLegs, allLegs: fakeLegs }),
      "LegsHashDoesNotMatchExpectedHash"
    );
  });

  it("Cannot create rfq with the disabled base asset", async () => {
    context.btcToken.assertRegisteredAsBaseAsset();
    await context.changeBaseAssetParametersStatus(context.btcToken.baseAssetIndex, { enabled: false });
    await expectError(
      context.createEscrowRfq({
        legs: [SpotInstrument.createForLeg(context, { mint: context.btcToken, amount: new BN(10) })],
      }),
      "BaseAssetIsDisabled"
    );
    await context.changeBaseAssetParametersStatus(context.btcToken.baseAssetIndex, { enabled: true });
  });

  it("Cannot create rfq with the disabled instrument", async () => {
    const spotInstrumentProgram = getSpotInstrumentProgram();
    await context.setInstrumentEnabledStatus(spotInstrumentProgram.programId, false);
    await expectError(
      context.createEscrowRfq({
        legs: [SpotInstrument.createForLeg(context, { mint: context.btcToken, amount: new BN(10) })],
      }),
      "InstrumentIsDisabled"
    );
    await context.setInstrumentEnabledStatus(spotInstrumentProgram.programId, true);
  });
});
