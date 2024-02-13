import { PublicKey } from "@solana/web3.js";
import { attachImprovedLogDisplay, expectError, TokenChangeMeasurer, withTokenDecimals } from "../utilities/helpers";
import { Context, getContext } from "../utilities/wrappers";

describe("Withdraw collateral instruction", () => {
  let context: Context;
  let taker: PublicKey;

  beforeEach(function () {
    attachImprovedLogDisplay(this, context);
  });

  before(async () => {
    context = await getContext();
    taker = context.taker.publicKey;
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
    await context.createEscrowRfq();

    await expectError(context.withdrawCollateral(context.taker, fullCollateral), "NotEnoughCollateral");
  });
});
