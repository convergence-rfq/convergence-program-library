import { PublicKey } from "@saberhq/solana-contrib";
import * as assert from "assert";
import { Quote } from "../../lib/helpers";
import { Context } from "../utilities/wrappers";
import { DEFAULT_ASK_AMOUNT, DEFAULT_BID_AMOUNT, DEFAULT_TOKEN_AMOUNT } from "../utilities/constants";
import { expectError, getTimestampInFuture, sleep } from "../utilities/helpers";

describe("Return collateral", () => {
  const context = new Context();
  before(async () => {
    await context.initialize();
    await context.initializeProtocolIfNotInitialized();
  });

  const assertMakerTokens = async (makerKey: PublicKey, assets: number, quotes: number) => {
    const makerAssets = await context.getAssetTokenBalance(makerKey);
    assert.equal(makerAssets, assets);
    const makerQuotes = await context.getQuoteTokenBalance(makerKey);
    assert.equal(makerQuotes, quotes);
  };

  it("Successfully returns collateral from confirmed offer", async () => {
    const rfq = await context.request();
    const order = await rfq.respond();
    await order.confirm({ quoteType: Quote.Bid });
    await order.returnCollateral();
    await assertMakerTokens(order.maker.publicKey, DEFAULT_TOKEN_AMOUNT, DEFAULT_TOKEN_AMOUNT - DEFAULT_BID_AMOUNT);
  });

  it("Successfully returns collateral after confirmation", async () => {
    const rfq = await context.request();
    const nonConfirmedOrder = await rfq.respond({
      bidAmount: DEFAULT_BID_AMOUNT - 1,
      askAmount: DEFAULT_ASK_AMOUNT + 1,
    });
    const order = await rfq.respond();
    await order.confirm();
    await nonConfirmedOrder.returnCollateral();
    await assertMakerTokens(nonConfirmedOrder.maker.publicKey, DEFAULT_TOKEN_AMOUNT, DEFAULT_TOKEN_AMOUNT);
  });

  it("Can return after expiration", async () => {
    const rfq = await context.request({ expiry: getTimestampInFuture(2) });
    const order = await rfq.respond();
    await sleep(2000);
    await order.returnCollateral();
    const state = await order.getState();
    assert.ok(state.collateralReturned);
  });

  it("Can return after cancellation", async () => {
    const rfq = await context.request();
    const order = await rfq.respond();
    await rfq.cancel();
    await order.returnCollateral();
    const state = await order.getState();
    assert.ok(state.collateralReturned);
  });

  it("Can't return immediately after creation", async () => {
    const rfq = await context.request();
    const order = await rfq.respond();
    const transaction = order.returnCollateral();
    await expectError(transaction, "RfqActive");
  });

  it("Can't return twice", async () => {
    const rfq = await context.request();
    const order = await rfq.respond();
    await order.confirm();
    await order.returnCollateral();
    const transaction = order.returnCollateral();
    await expectError(transaction, "CollateralReturned");
  });
});
