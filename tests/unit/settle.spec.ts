import * as assert from "assert";
import { Quote } from "../../lib/helpers";
import { Context } from "../utilities/wrappers";
import { DEFAULT_BID_AMOUNT, DEFAULT_BID_FEE, DEFAULT_TOKEN_AMOUNT } from "../utilities/constants";
import { expectError } from "../utilities/helpers";

describe("Settle RFQ", () => {
  const context = new Context();
  before(async () => {
    await context.initialize();
    await context.initializeProtocolIfNotInitialized();
  });

  it("Successfully settles after last look", async () => {
    const rfq = await context.request({ lastLook: true });
    const order = await rfq.respond();
    await order.confirm(Quote.Bid);
    await order.lastLook();
    await rfq.settle(context.taker);
    await rfq.settle(order.maker);
    const takerAssets = await context.getQuoteTokenBalance(context.taker.publicKey);
    assert.equal(takerAssets, DEFAULT_TOKEN_AMOUNT + DEFAULT_BID_AMOUNT - DEFAULT_BID_FEE);
    const makerQuotes = await context.getAssetTokenBalance(order.maker.publicKey);
    assert.equal(makerQuotes, DEFAULT_TOKEN_AMOUNT); // Rfq amount is still held as collateral
  });

  it("Can't settle before last look", async () => {
    const rfq = await context.request({ lastLook: true });
    const order = await rfq.respond();
    await order.confirm();
    const transaction_taker = rfq.settle(context.taker);
    const transaction_maker = rfq.settle(order.maker);
    await expectError(transaction_taker, "OrderNotApproved");
    await expectError(transaction_maker, "OrderNotApproved");
  });
});
