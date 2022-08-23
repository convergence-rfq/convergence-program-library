import { assert } from "chai";
import { Context, getContext } from "../utilities/wrappers";

describe("RFQ Spot instrument integration tests", () => {
  let context: Context;
  before(async () => {
    context = await getContext();
  });

  it("Create, respond and settle an rfq", async () => {
    await context.initializeRfq();
  });
});
