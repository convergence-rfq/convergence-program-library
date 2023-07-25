import { BN } from "@coral-xyz/anchor";
import { expect } from "chai";
import { DEFAULT_DEFAULT_FEES, DEFAULT_SETTLE_FEES } from "../utilities/constants";
import { attachImprovedLogDisplay, expectError } from "../utilities/helpers";
import { FEE_BPS_DECIMALS } from "../utilities/constants";
import { Context, getContext } from "../utilities/wrappers";

describe("Change protocol fees", () => {
  let context: Context;

  beforeEach(function () {
    attachImprovedLogDisplay(this, context);
  });

  before(async () => {
    context = await getContext();
  });

  it("Can change settle fees", async () => {
    await context.changeProtocolFees({
      settleFees: {
        taker: 0.5,
        maker: 0.6,
      },
    });

    const protocolState = await context.getProtocolState();
    expect(protocolState.settleFees.takerBps).to.be.bignumber.equal(new BN(0.5 * 10 ** FEE_BPS_DECIMALS));
    expect(protocolState.settleFees.makerBps).to.be.bignumber.equal(new BN(0.6 * 10 ** FEE_BPS_DECIMALS));

    await context.changeProtocolFees({
      settleFees: DEFAULT_SETTLE_FEES,
    });
  });

  it("Can change default fees", async () => {
    await context.changeProtocolFees({
      defaultFees: {
        taker: 0.4,
        maker: 0.45,
      },
    });

    const protocolState = await context.getProtocolState();
    expect(protocolState.defaultFees.takerBps).to.be.bignumber.equal(new BN(0.4 * 10 ** FEE_BPS_DECIMALS));
    expect(protocolState.defaultFees.makerBps).to.be.bignumber.equal(new BN(0.45 * 10 ** FEE_BPS_DECIMALS));

    await context.changeProtocolFees({
      defaultFees: DEFAULT_DEFAULT_FEES,
    });
  });

  it("Can't set invalid settle fees", async () => {
    const operation = context.changeProtocolFees({
      settleFees: {
        taker: 1.1,
        maker: 0.6,
      },
    });

    await expectError(operation, "InvalidValueForAFee");
  });

  it("Can't set invalid default fees", async () => {
    const operation = context.changeProtocolFees({
      defaultFees: {
        taker: 0.4,
        maker: 1.0001,
      },
    });

    await expectError(operation, "InvalidValueForAFee");
  });
});
