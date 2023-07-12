import { attachImprovedLogDisplay } from "../utilities/helpers";

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
});