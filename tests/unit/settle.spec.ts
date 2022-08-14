import { Quote } from "../../lib/helpers";
import { Context, getContext } from "../utilities/wrappers";
import {
  DEFAULT_ASK_AMOUNT,
  DEFAULT_BID_AMOUNT,
  DEFAULT_BID_FEE,
  DEFAULT_ORDER_AMOUNT,
  DEFAULT_ORDER_FEE,
} from "../utilities/constants";
import { expectError, TokenChangeMeasurer } from "../utilities/helpers";

describe("Settle RFQ", () => {
  let context: Context;
  before(async () => {
    context = await getContext();
  });

  it("Correctly returns tokens on settle in bid confirmation", async () => {
    const rfq = await context.request();
    const tokenMeasurer = await TokenChangeMeasurer.takeSnapshot(context);
    const order = await rfq.respond();
    await order.confirm(Quote.Bid);

    await rfq.settle(context.taker);
    await rfq.settle(context.maker);
    await order.returnCollateral();
    await tokenMeasurer.expectChange({
      makerAssets: DEFAULT_ORDER_AMOUNT,
      makerQuotes: -DEFAULT_BID_AMOUNT,
      takerAssets: -DEFAULT_ORDER_AMOUNT,
      takerQuotes: DEFAULT_BID_AMOUNT - DEFAULT_BID_FEE,
    });
  });

  it("Correctly returns tokens on settle in ask confirmation", async () => {
    const rfq = await context.request();
    const tokenMeasurer = await TokenChangeMeasurer.takeSnapshot(context);
    const order = await rfq.respond();
    await order.confirm(Quote.Ask);

    await rfq.settle(context.taker);
    await rfq.settle(context.maker);
    await order.returnCollateral();
    await tokenMeasurer.expectChange({
      makerAssets: -DEFAULT_ORDER_AMOUNT,
      makerQuotes: DEFAULT_ASK_AMOUNT,
      takerAssets: DEFAULT_ORDER_AMOUNT - DEFAULT_ORDER_FEE,
      takerQuotes: -DEFAULT_ASK_AMOUNT,
    });
  });

  it("Successfully settles after last look", async () => {
    const rfq = await context.request({ lastLook: true });
    const order = await rfq.respond();
    await order.confirm(Quote.Bid);
    await order.lastLook();
    await rfq.settle(context.taker);
    await rfq.settle(context.maker);
  });

  it("Can't settle before last look", async () => {
    const rfq = await context.request({ lastLook: true });
    const order = await rfq.respond();
    await order.confirm();
    const transaction_taker = rfq.settle(context.taker);
    await expectError(transaction_taker, "OrderNotApproved");
    const transaction_maker = rfq.settle(context.maker);
    await expectError(transaction_maker, "OrderNotApproved");
  });

  it("Can't settle before confirmation", async () => {
    const rfq = await context.request();
    const order = await rfq.respond();
    const transaction_taker = rfq.settle(context.taker, [order, Quote.Bid]);
    await expectError(transaction_taker, "RfqUnconfirmed");
    const transaction_maker = rfq.settle(context.maker, [order, Quote.Bid]);
    await expectError(transaction_maker, "RfqUnconfirmed");
  });

  it("Can't settle if another order confirmed", async () => {
    const rfq = await context.request();
    const nonConfirmedOrder = await rfq.respond({
      bidAmount: DEFAULT_BID_AMOUNT - 1,
      askAmount: DEFAULT_ASK_AMOUNT + 1,
    });
    const order = await rfq.respond();
    await order.confirm();
    const transaction_taker = rfq.settle(context.taker, [nonConfirmedOrder, Quote.Bid]);
    await expectError(transaction_taker, "RfqUnconfirmed");
    const transaction_maker = rfq.settle(context.maker, [nonConfirmedOrder, Quote.Bid]);
    await expectError(transaction_maker, "RfqUnconfirmed");
  });
});
