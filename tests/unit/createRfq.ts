import { BN } from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";
import { calculateLegsHash, expectError } from "../utilities/helpers";
import { getSpotInstrumentProgram, SpotInstrument } from "../utilities/instruments/spotInstrument";

import { Context, getContext } from "../utilities/wrappers";

describe("Create RFQ", () => {
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

  it("Cannot create rfq with invalid legs hash", async () => {
    let fakeLegs = [SpotInstrument.createForLeg(context, { amount: new BN(999) })];
    let rfqLegs = [SpotInstrument.createForLeg(context, { amount: new BN(10) })];
    await expectError(
      context.createRfq({ legs: rfqLegs, legsHash: calculateLegsHash(fakeLegs, context.program) }),
      "LegsHashDoesNotMatchExpectedHash"
    );
  });

  it("Cannot create rfq with the disabled base asset", async () => {
    await context.setBaseAssetEnabledStatus(context.assetToken.baseAssetIndex, false);
    await expectError(
      context.createRfq({
        legs: [SpotInstrument.createForLeg(context, { mint: context.assetToken, amount: new BN(10) })],
      }),
      "BaseAssetIsDisabled"
    );
    await context.setBaseAssetEnabledStatus(context.assetToken.baseAssetIndex, true);
  });

  it("Cannot create rfq with the disabled instrument", async () => {
    const spotInstrumentProgram = getSpotInstrumentProgram();
    await context.setInstrumentEnabledStatus(spotInstrumentProgram.programId, false);
    await expectError(
      context.createRfq({
        legs: [SpotInstrument.createForLeg(context, { mint: context.assetToken, amount: new BN(10) })],
      }),
      "InstrumentIsDisabled"
    );
    await context.setInstrumentEnabledStatus(spotInstrumentProgram.programId, true);
  });
});