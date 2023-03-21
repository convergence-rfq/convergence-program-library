import { BN } from "@project-serum/anchor";
import { expectError } from "../utilities/helpers";

import { FixedSize, Quote } from "../utilities/types";
import { Context, getContext } from "../utilities/wrappers";

describe("Respond to RFQ", () => {
  let context: Context;

  before(async () => {
    context = await getContext();
  });

  it("Cannot respond with a negative price to a fixed quote asset amount rfq", async () => {
    let rfq = await context.createRfq({ fixedSize: FixedSize.getQuoteAsset(new BN(100)) });
    await expectError(rfq.respond({ bid: Quote.getFixedSize(new BN(-100)) }), "PriceShouldBePositive");
    await expectError(rfq.respond({ ask: Quote.getFixedSize(new BN(-100)) }), "PriceShouldBePositive");
  });

  it("Cannot respond with a zero price to a fixed quote asset amount rfq", async () => {
    let rfq = await context.createRfq({ fixedSize: FixedSize.getQuoteAsset(new BN(120)) });
    await expectError(rfq.respond({ bid: Quote.getFixedSize(new BN(0)) }), "PriceShouldBePositive");
    await expectError(rfq.respond({ ask: Quote.getFixedSize(new BN(0)) }), "PriceShouldBePositive");
  });
});
