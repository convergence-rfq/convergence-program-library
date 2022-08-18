import * as assert from "assert";
import { Quote } from "../../lib/helpers";
import { Context, getContext } from "../utilities/wrappers";
import { expectError } from "../utilities/helpers";
import { DEFAULT_ASK_AMOUNT, DEFAULT_BID_AMOUNT } from "../utilities/constants";

describe("Last look RFQ", () => {
  let context: Context;
  before(async () => {
    context = await getContext();
  });

  return

  it("Successfully sets last look", async () => {
    const rfq = await context.request({ lastLook: true });
    const order = await rfq.respond();
    await order.confirm(Quote.Bid);
    await order.lastLook();
    const rfqState = await rfq.getState();
    assert.ok(rfqState.lastLookApproved);
  });

  it("Can't set last look if disabled", async () => {
    const rfq = await context.request();
    const order = await rfq.respond();
    await order.confirm(Quote.Bid);
    const transaction = order.lastLook();
    await expectError(transaction, "LastLookNotSet");
  });

  it("Can't set last look before confirmation", async () => {
    const rfq = await context.request({ lastLook: true });
    const order = await rfq.respond();
    const transaction = order.lastLook();
    await expectError(transaction, "OrderNotConfirmed");
  });

  it("Can't set last look from another order", async () => {
    const rfq = await context.request({ lastLook: true });
    const nonConfirmedOrder = await rfq.respond({
      bidAmount: DEFAULT_BID_AMOUNT - 1,
      askAmount: DEFAULT_ASK_AMOUNT + 1,
    });
    const order = await rfq.respond();
    await order.confirm(Quote.Bid);
    const transaction = nonConfirmedOrder.lastLook();
    await expectError(transaction, "OrderNotConfirmed");
  });
});
