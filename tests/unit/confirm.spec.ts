import { Quote } from "../../lib/helpers";
import { Context, getContext } from "../utilities/wrappers";
import { expectError } from "../utilities/helpers";
import { DEFAULT_ASK_AMOUNT, DEFAULT_BID_AMOUNT } from "../utilities/constants";

describe("Confirm RFQ", () => {
  let context: Context;
  before(async () => {
    context = await getContext();
  });

  return

  it("Can't confirm another order after first confirmation", async () => {

    const rfq = await context.request();
    const nonConfirmedOrder = await rfq.respond({
      bidAmount: DEFAULT_BID_AMOUNT - 1,
      askAmount: DEFAULT_ASK_AMOUNT + 1,
    });
    const order = await rfq.respond();
    await order.confirm(Quote.Bid);
    const transaction = nonConfirmedOrder.confirm();
    await expectError(transaction, "RfqConfirmed");
  });
});
