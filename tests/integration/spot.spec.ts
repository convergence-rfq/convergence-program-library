import { AuthoritySide } from "../utilities/types";
import { Context, getContext } from "../utilities/wrappers";

describe("RFQ Spot instrument integration tests", () => {
  let context: Context;
  before(async () => {
    context = await getContext();
  });

  it("Create, respond and settle an rfq", async () => {
    const rfq = await context.initializeRfq();
    const response = await rfq.respond();
    await response.confirm();
    await response.prepareToSettle(AuthoritySide.Taker);
    await response.prepareToSettle(AuthoritySide.Maker);
    await response.settle(context.taker.publicKey, context.taker.publicKey);
  });
});
