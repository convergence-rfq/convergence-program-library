import { DEFAULT_ACTIVE_WINDOW } from "../utilities/constants";
import { attachImprovedLogDisplay, sleep } from "../utilities/helpers";

import { Context, getContext } from "../utilities/wrappers";
import { expect } from "chai";

describe("Create RFQ", () => {
  let context: Context;

  beforeEach(function () {
    attachImprovedLogDisplay(this, context);
  });

  before(async () => {
    context = await getContext();
  });

  it("Confirmed responses counter gets incremented", async () => {
    const rfq = await context.createRfq();
    const rfqDataBefore = await rfq.getData();
    expect(rfqDataBefore.confirmedResponses).to.be.equal(0);

    const response = await rfq.respond();
    await response.confirm();
    const rfqDataAfter = await rfq.getData();
    expect(rfqDataAfter.confirmedResponses).to.be.equal(1);
  });

  it("Cannot Approve Response after Response is expired", async () => {
    const rfq = await context.createRfq();
    const response = await rfq.respond({
      expirationTimestamp: Date.now() / 1000 + DEFAULT_ACTIVE_WINDOW - 5,
    });

    await sleep(6);
    try {
      await response.confirm();
    } catch (e) {
      console.error("error");
    }
  });
});
