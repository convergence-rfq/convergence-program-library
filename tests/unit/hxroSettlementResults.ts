import { Context, getContext } from "../utilities/wrappers";
import { attachImprovedLogDisplay, toAbsolutePrice, toLegMultiplier, withTokenDecimals } from "../utilities/helpers";
import {
  HxroPrintTradeProvider,
  HxroContext,
  getHxroContext,
  getPositionChangeMeasurer,
  inverseExpectedSettlement,
  assertSettlementOutcome,
} from "../utilities/printTradeProviders/hxroPrintTradeProvider";
import { AuthoritySide, FixedSize, LegSide, OrderType, Quote, QuoteSide } from "../utilities/types";
import { SOLANA_BASE_ASSET_INDEX } from "../utilities/constants";

describe("RFQ HXRO settlement result tests", () => {
  beforeEach(function () {
    attachImprovedLogDisplay(this, context);
  });

  let context: Context;
  let hxroContext: HxroContext;

  before(async () => {
    context = await getContext();
    hxroContext = await getHxroContext(context);
  });

  it("HXRO open size two way + override, taker sells, taker prepares first", async () => {
    const positionMeasurer = await getPositionChangeMeasurer(hxroContext);
    const rfq = await context.createPrintTradeRfq({
      printTradeProvider: new HxroPrintTradeProvider(context, hxroContext, [
        {
          amount: 20,
          baseAssetIndex: SOLANA_BASE_ASSET_INDEX,
          side: LegSide.Long,
          productIndex: 0,
        },
        {
          amount: 1.5,
          baseAssetIndex: SOLANA_BASE_ASSET_INDEX,
          side: LegSide.Short,
          productIndex: 1,
        },
      ]),
      fixedSize: FixedSize.None,
      orderType: OrderType.TwoWay,
    });
    const response = await rfq.respond({
      bid: Quote.getStandard(toAbsolutePrice(withTokenDecimals(123)), toLegMultiplier(5)),
    });
    await response.confirm({ side: QuoteSide.Bid, legMultiplierBps: toLegMultiplier(3) });

    const expectedOutcome = { legs: ["-60", "4.5"], price: "369" };

    await response.preparePrintTradeSettlement(AuthoritySide.Taker, expectedOutcome);
    await response.preparePrintTradeSettlement(AuthoritySide.Maker, expectedOutcome);
    await response.settlePrintTrade();

    const difference = await positionMeasurer.measureDifference();
    assertSettlementOutcome(expectedOutcome, difference.taker);
    assertSettlementOutcome(inverseExpectedSettlement(expectedOutcome), difference.maker);
  });

  it("HXRO open size two way, taker buys, maker prepares first", async () => {
    const positionMeasurer = await getPositionChangeMeasurer(hxroContext);
    const rfq = await context.createPrintTradeRfq({
      printTradeProvider: new HxroPrintTradeProvider(context, hxroContext, [
        {
          amount: 0.1,
          baseAssetIndex: SOLANA_BASE_ASSET_INDEX,
          side: LegSide.Long,
          productIndex: 0,
        },
        {
          amount: 1.5,
          baseAssetIndex: SOLANA_BASE_ASSET_INDEX,
          side: LegSide.Short,
          productIndex: 1,
        },
      ]),
      fixedSize: FixedSize.None,
      orderType: OrderType.TwoWay,
    });
    const response = await rfq.respond({
      ask: Quote.getStandard(toAbsolutePrice(withTokenDecimals(3)), toLegMultiplier(2.5)),
    });
    await response.confirm({ side: QuoteSide.Ask });

    const expectedOutcome = { legs: ["0.25", "-3.75"], price: "-7.5" };

    await response.preparePrintTradeSettlement(AuthoritySide.Maker, expectedOutcome);
    await response.preparePrintTradeSettlement(AuthoritySide.Taker, expectedOutcome);
    await response.settlePrintTrade();

    const difference = await positionMeasurer.measureDifference();
    assertSettlementOutcome(expectedOutcome, difference.taker);
    assertSettlementOutcome(inverseExpectedSettlement(expectedOutcome), difference.maker);
  });

  it("HXRO fixed base size, duplicated legs, taker buys, taker prepares first", async () => {
    const positionMeasurer = await getPositionChangeMeasurer(hxroContext);
    const rfq = await context.createPrintTradeRfq({
      printTradeProvider: new HxroPrintTradeProvider(context, hxroContext, [
        {
          amount: 0.1,
          baseAssetIndex: SOLANA_BASE_ASSET_INDEX,
          side: LegSide.Long,
          productIndex: 0,
        },
        {
          amount: 1.5,
          baseAssetIndex: SOLANA_BASE_ASSET_INDEX,
          side: LegSide.Short,
          productIndex: 1,
        },
        {
          amount: 1.1,
          baseAssetIndex: SOLANA_BASE_ASSET_INDEX,
          side: LegSide.Long,
          productIndex: 0,
        },
        {
          amount: 4,
          baseAssetIndex: SOLANA_BASE_ASSET_INDEX,
          side: LegSide.Long,
          productIndex: 1,
        },
      ]),
      fixedSize: FixedSize.getBaseAsset(toLegMultiplier(0.1)),
      orderType: OrderType.Buy,
    });
    const response = await rfq.respond({
      ask: Quote.getFixedSize(toAbsolutePrice(withTokenDecimals(1.234))),
    });
    await response.confirm({ side: QuoteSide.Ask });

    const expectedOutcome = { legs: ["0.01", "-0.15", "0.11", "0.4"], price: "-0.1234" };
    const dedupExpectedOutcome = { legs: ["0.12", "0.25"], price: "-0.1234" };

    await response.preparePrintTradeSettlement(AuthoritySide.Taker, expectedOutcome);
    await response.preparePrintTradeSettlement(AuthoritySide.Maker, expectedOutcome);
    await response.settlePrintTrade();

    const difference = await positionMeasurer.measureDifference();
    assertSettlementOutcome(dedupExpectedOutcome, difference.taker);
    assertSettlementOutcome(inverseExpectedSettlement(dedupExpectedOutcome), difference.maker);
  });

  it("HXRO fixed size, taker sells, negative, maker prepares first", async () => {
    const positionMeasurer = await getPositionChangeMeasurer(hxroContext);
    const rfq = await context.createPrintTradeRfq({
      printTradeProvider: new HxroPrintTradeProvider(context, hxroContext, [
        {
          amount: 0.1,
          baseAssetIndex: SOLANA_BASE_ASSET_INDEX,
          side: LegSide.Short,
          productIndex: 0,
        },
        {
          amount: 1.5,
          baseAssetIndex: SOLANA_BASE_ASSET_INDEX,
          side: LegSide.Short,
          productIndex: 1,
        },
      ]),
      fixedSize: FixedSize.getBaseAsset(toLegMultiplier(10)),
      orderType: OrderType.Sell,
    });
    const response = await rfq.respond({
      bid: Quote.getFixedSize(toAbsolutePrice(withTokenDecimals(-23_000))),
    });
    await response.confirm({ side: QuoteSide.Bid });

    const expectedOutcome = { legs: ["1", "15"], price: "-230000" };

    await response.preparePrintTradeSettlement(AuthoritySide.Maker, expectedOutcome);
    await response.preparePrintTradeSettlement(AuthoritySide.Taker, expectedOutcome);
    await response.settlePrintTrade();

    const difference = await positionMeasurer.measureDifference();
    assertSettlementOutcome(expectedOutcome, difference.taker);
    assertSettlementOutcome(inverseExpectedSettlement(expectedOutcome), difference.maker);
  });

  it("HXRO fixed quote, taker sells, taker prepares first", async () => {
    const positionMeasurer = await getPositionChangeMeasurer(hxroContext);
    const rfq = await context.createPrintTradeRfq({
      printTradeProvider: new HxroPrintTradeProvider(context, hxroContext, [
        {
          amount: 5,
          baseAssetIndex: SOLANA_BASE_ASSET_INDEX,
          side: LegSide.Long,
          productIndex: 0,
        },
        {
          amount: 1.5,
          baseAssetIndex: SOLANA_BASE_ASSET_INDEX,
          side: LegSide.Short,
          productIndex: 1,
        },
      ]),
      fixedSize: FixedSize.getQuoteAsset(withTokenDecimals(20_000)),
      orderType: OrderType.Sell,
    });
    const response = await rfq.respond({
      bid: Quote.getFixedSize(toAbsolutePrice(withTokenDecimals(2_500))),
    });
    await response.confirm({ side: QuoteSide.Bid });

    const expectedOutcome = { legs: ["-40", "12"], price: "20000" };

    await response.preparePrintTradeSettlement(AuthoritySide.Taker, expectedOutcome);
    await response.preparePrintTradeSettlement(AuthoritySide.Maker, expectedOutcome);
    await response.settlePrintTrade();

    const difference = await positionMeasurer.measureDifference();
    assertSettlementOutcome(expectedOutcome, difference.taker);
    assertSettlementOutcome(inverseExpectedSettlement(expectedOutcome), difference.maker);
  });

  it("HXRO fixed quote, taker buys, maker prepares first", async () => {
    const positionMeasurer = await getPositionChangeMeasurer(hxroContext);
    const rfq = await context.createPrintTradeRfq({
      printTradeProvider: new HxroPrintTradeProvider(context, hxroContext, [
        {
          amount: 5,
          baseAssetIndex: SOLANA_BASE_ASSET_INDEX,
          side: LegSide.Long,
          productIndex: 0,
        },
        {
          amount: 1.5,
          baseAssetIndex: SOLANA_BASE_ASSET_INDEX,
          side: LegSide.Short,
          productIndex: 1,
        },
      ]),
      fixedSize: FixedSize.getQuoteAsset(withTokenDecimals(500)),
      orderType: OrderType.Buy,
    });
    const response = await rfq.respond({
      ask: Quote.getFixedSize(toAbsolutePrice(withTokenDecimals(2_500))),
    });
    await response.confirm({ side: QuoteSide.Ask });

    const expectedOutcome = { legs: ["1", "-0.3"], price: "-500" };

    await response.preparePrintTradeSettlement(AuthoritySide.Maker, expectedOutcome);
    await response.preparePrintTradeSettlement(AuthoritySide.Taker, expectedOutcome);
    await response.settlePrintTrade();

    const difference = await positionMeasurer.measureDifference();
    assertSettlementOutcome(expectedOutcome, difference.taker);
    assertSettlementOutcome(inverseExpectedSettlement(expectedOutcome), difference.maker);
  });
});
