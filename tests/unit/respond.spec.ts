import { Quote } from "../../lib/helpers";
import { Context, getContext } from "../utilities/wrappers";
import { expectError } from "../utilities/helpers";
import { DEFAULT_ASK_AMOUNT, DEFAULT_BID_AMOUNT } from "../utilities/constants";

describe("Respond to RFQ", () => {
  let context: Context;
  before(async () => {
    context = await getContext();
  });

  it("Can't respond to already confirmed rfq", async () => {
    const rfq = await context.request();
    const order = await rfq.respond();
    await order.confirm(Quote.Bid);
    const transaction = rfq.respond({
      bidAmount: DEFAULT_BID_AMOUNT + 1,
      askAmount: DEFAULT_ASK_AMOUNT - 1,
    });
    await expectError(transaction, "RfqConfirmed");
  });

  it("Can't respond to already cancaled rfq", async () => {
    const rfq = await context.request();
    await rfq.cancel();
    const transaction = rfq.respond();
    await expectError(transaction, "RfqCanceled");
  });
});
