import { PublicKey } from "@solana/web3.js";
import { expectError, TokenChangeMeasurer, withTokenDecimals } from "../utilities/helpers";
import { Context, getContext } from "../utilities/wrappers";

describe("RFQ Spot instrument integration tests", () => {
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

  it("Can withdraw unlocked collateral", async () => {
    let measurer = await TokenChangeMeasurer.takeSnapshot(context, ["walletCollateral"], [taker]);
    let withdrawAmount = withTokenDecimals(1);

    await context.withdrawCollateral(context.taker, withdrawAmount);

    await measurer.expectChange([{ token: "walletCollateral", user: taker, delta: withdrawAmount }]);
  });

  it("Cannot withdraw locked collateral", async () => {
    let fullCollateral = await context.collateralToken.getTotalCollateral(taker);

    // lock some collateral
    await context.createRfq();

    await expectError(context.withdrawCollateral(context.taker, fullCollateral), "NotEnoughCollateral");
  });
});
