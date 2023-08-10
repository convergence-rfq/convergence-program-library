import { Context, getContext } from "../utilities/wrappers";
import {
  attachImprovedLogDisplay,
  executeInParallel,
  toAbsolutePrice,
  toLegMultiplier,
  withTokenDecimals,
} from "../utilities/helpers";
import {
  HxroPrintTradeProvider,
  HxroContext,
  getHxroContext,
} from "../utilities/printTradeProviders/hxroPrintTradeProvider";
import { AuthoritySide, FixedSize, LegSide, OrderType, Quote, QuoteSide } from "../utilities/types";
import { SOLANA_BASE_ASSET_INDEX } from "../utilities/constants";
import { expect } from "chai";

describe("RFQ HXRO instrument integration tests", () => {
  beforeEach(function () {
    attachImprovedLogDisplay(this, context);
  });

  let context: Context;
  let hxroContext: HxroContext;

  before(async () => {
    context = await getContext();
    hxroContext = await getHxroContext(context);
  });

  it("HXRO sell print trade works", async () => {
    const [takerBalanceBefore, makerBalanceBefore] = await executeInParallel(
      () => hxroContext.getBalance("taker"),
      () => hxroContext.getBalance("maker")
    );

    const rfq = await context.createPrintTradeRfq({
      printTradeProvider: new HxroPrintTradeProvider(context, hxroContext, [
        {
          amount: 20_000,
          amountDecimals: 3,
          baseAssetIndex: SOLANA_BASE_ASSET_INDEX,
          side: LegSide.Long,
          productIndex: 0,
        },
        {
          amount: 15,
          amountDecimals: 1,
          baseAssetIndex: SOLANA_BASE_ASSET_INDEX,
          side: LegSide.Short,
          productIndex: 1,
        },
      ]),
      fixedSize: FixedSize.getBaseAsset(toLegMultiplier(3)),
      orderType: OrderType.Sell,
    });
    const response = await rfq.respond({ bid: Quote.getFixedSize(toAbsolutePrice(withTokenDecimals(123.456))) });
    await response.confirm({ side: QuoteSide.Bid });
    await response.preparePrintTradeSettlement(AuthoritySide.Taker);
    await response.preparePrintTradeSettlement(AuthoritySide.Maker);
    await response.settlePrintTrade();

    const [takerBalanceAfter, makerBalanceAfter] = await executeInParallel(
      () => hxroContext.getBalance("taker"),
      () => hxroContext.getBalance("maker")
    );

    expect(takerBalanceAfter.positions[0] - takerBalanceBefore.positions[0]).to.be.equal(-60);
    expect(makerBalanceAfter.positions[0] - makerBalanceBefore.positions[0]).to.be.equal(60);
    expect(takerBalanceAfter.positions[1] - takerBalanceBefore.positions[1]).to.be.equal(4.5);
    expect(makerBalanceAfter.positions[1] - makerBalanceBefore.positions[1]).to.be.equal(-4.5);
    // TODO after hxro price fix
    // expect(takerBalanceAfter.cashBalance - takerBalanceBefore.cashBalance).to.be.closeTo(123.456 * 3, 0.1);
    // expect(makerBalanceAfter.cashBalance - makerBalanceBefore.cashBalance).to.be.closeTo(-123.456 * 3, 0.1);
  });

  it("HXRO buy print trade works", async () => {
    const [takerBalanceBefore, makerBalanceBefore] = await executeInParallel(
      () => hxroContext.getBalance("taker"),
      () => hxroContext.getBalance("maker")
    );

    const rfq = await context.createPrintTradeRfq({
      printTradeProvider: new HxroPrintTradeProvider(context, hxroContext, [
        {
          amount: 1_000_000,
          amountDecimals: 6,
          baseAssetIndex: SOLANA_BASE_ASSET_INDEX,
          side: LegSide.Long,
          productIndex: 0,
        },
      ]),
      fixedSize: FixedSize.getBaseAsset(toLegMultiplier(1)),
      orderType: OrderType.Buy,
    });
    const response = await rfq.respond({ ask: Quote.getFixedSize(toAbsolutePrice(withTokenDecimals(30))) });
    await response.confirm({ side: QuoteSide.Ask });
    await response.preparePrintTradeSettlement(AuthoritySide.Taker);
    await response.preparePrintTradeSettlement(AuthoritySide.Maker);
    await response.settlePrintTrade();

    const [takerBalanceAfter, makerBalanceAfter] = await executeInParallel(
      () => hxroContext.getBalance("taker"),
      () => hxroContext.getBalance("maker")
    );

    expect(takerBalanceAfter.positions[0] - takerBalanceBefore.positions[0]).to.be.equal(1);
    expect(makerBalanceAfter.positions[0] - makerBalanceBefore.positions[0]).to.be.equal(-1);
    expect(takerBalanceAfter.cashBalance - takerBalanceBefore.cashBalance).to.be.closeTo(-30, 1);
    expect(makerBalanceAfter.cashBalance - makerBalanceBefore.cashBalance).to.be.closeTo(30, 1);
  });
});
