import * as assert from "assert";
import { Quote } from "../../lib/helpers";
import { Context, getContext } from "../utilities/wrappers";
import { DEFAULT_ASK_AMOUNT, DEFAULT_BID_AMOUNT, DEFAULT_ORDER_AMOUNT } from "../utilities/constants";
import { expectError, getTimestampInFuture, sleep, TokenChangeMeasurer } from "../utilities/helpers";

describe("Return collateral", () => {
  let context: Context;
  before(async () => {
    context = await getContext();
  });

  return

  it("Correctly returns collateral from confirmed bid offer", async () => {
    const rfq = await context.request();
    const order = await rfq.respond();
    await order.confirm(Quote.Bid);
    const tokenMeasurer = await TokenChangeMeasurer.takeSnapshot(context);
    await order.returnCollateral();
    await tokenMeasurer.expectChange({
      makerAssets: DEFAULT_ORDER_AMOUNT,
      makerQuotes: 0,
    });
  });

  it("Correctly returns collateral from confirmed ask offer", async () => {
    const rfq = await context.request();
    const order = await rfq.respond();
    await order.confirm(Quote.Ask);
    const tokenMeasurer = await TokenChangeMeasurer.takeSnapshot(context);
    await order.returnCollateral();
    await tokenMeasurer.expectChange({
      makerAssets: 0,
      makerQuotes: DEFAULT_BID_AMOUNT,
    });
  });

  it("Successfully returns collateral after confirmation of another offer", async () => {
    const rfq = await context.request();
    const nonConfirmedOrder = await rfq.respond({
      bidAmount: DEFAULT_BID_AMOUNT - 1,
      askAmount: DEFAULT_ASK_AMOUNT + 1,
    });
    const order = await rfq.respond();
    await order.confirm();
    const tokenMeasurer = await TokenChangeMeasurer.takeSnapshot(context);
    await nonConfirmedOrder.returnCollateral();
    await tokenMeasurer.expectChange({
      makerAssets: DEFAULT_ORDER_AMOUNT,
      makerQuotes: DEFAULT_BID_AMOUNT - 1,
    });
  });

  it("Can return after expiration", async () => {
    const rfq = await context.request({ expiry: getTimestampInFuture(1) });
    const order = await rfq.respond();
    await sleep(3000);
    await order.returnCollateral();
    const state = await order.getState();
    assert.ok(state.collateralReturned);
  });

  it("Can return after cancellation", async () => {
    const rfq = await context.request();
    const order = await rfq.respond();
    await rfq.cancel();
    await order.returnCollateral();
    const state = await order.getState();
    assert.ok(state.collateralReturned);
  });

  it("Can't return immediately after creation", async () => {
    const rfq = await context.request();
    const order = await rfq.respond();
    const transaction = order.returnCollateral();
    await expectError(transaction, "RfqActive");
  });

  it("Can't return twice", async () => {
    const rfq = await context.request();
    const order = await rfq.respond();
    await order.confirm();
    await order.returnCollateral();
    const transaction = order.returnCollateral();
    await expectError(transaction, "CollateralReturned");
  });
});
