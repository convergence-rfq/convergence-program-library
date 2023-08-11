import { Context, getContext } from "../utilities/wrappers";
import { attachImprovedLogDisplay, toAbsolutePrice, toLegMultiplier, withTokenDecimals } from "../utilities/helpers";
import {
  HxroPrintTradeProvider,
  HxroContext,
  getHxroContext,
  getPositionChangeMeasurer,
} from "../utilities/printTradeProviders/hxroPrintTradeProvider";
import { AuthoritySide, FixedSize, LegSide, OrderType, Quote, QuoteSide } from "../utilities/types";
import { SOLANA_BASE_ASSET_INDEX } from "../utilities/constants";
import { expect } from "chai";

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
    await response.preparePrintTradeSettlement(AuthoritySide.Taker);
    await response.preparePrintTradeSettlement(AuthoritySide.Maker);
    await response.settlePrintTrade();

    const difference = await positionMeasurer.measureDifference();

    expect(difference.taker).to.deep.include({
      positions: ["-60", "4.5"],
      // cashBalance: "369",
    });
    expect(difference.maker).to.deep.include({
      positions: ["60", "-4.5"],
      // cashBalance: "-369",
    });
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
    await response.preparePrintTradeSettlement(AuthoritySide.Maker);
    await response.preparePrintTradeSettlement(AuthoritySide.Taker);
    await response.settlePrintTrade();

    const difference = await positionMeasurer.measureDifference();

    expect(difference.taker).to.deep.include({
      positions: ["0.25", "-3.75"],
      // cashBalance: "-7.5",
    });
    expect(difference.maker).to.deep.include({
      positions: ["-0.25", "3.75"],
      // cashBalance: "7.5",
    });
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
    await response.preparePrintTradeSettlement(AuthoritySide.Taker);
    await response.preparePrintTradeSettlement(AuthoritySide.Maker);
    await response.settlePrintTrade();

    const difference = await positionMeasurer.measureDifference();

    expect(difference.taker).to.deep.include({
      positions: ["0.12", "0.25"],
      // cashBalance: "-0.1234",
    });
    expect(difference.maker).to.deep.include({
      positions: ["-0.12", "-0.25"],
      // cashBalance: "0.1234",
    });
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
    await response.preparePrintTradeSettlement(AuthoritySide.Maker);
    await response.preparePrintTradeSettlement(AuthoritySide.Taker);
    await response.settlePrintTrade();

    const difference = await positionMeasurer.measureDifference();

    expect(difference.taker).to.deep.include({
      positions: ["1", "15"],
      // cashBalance: "-230000",
    });
    expect(difference.maker).to.deep.include({
      positions: ["-1", "-15"],
      // cashBalance: "230000",
    });
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
    await response.preparePrintTradeSettlement(AuthoritySide.Taker);
    await response.preparePrintTradeSettlement(AuthoritySide.Maker);
    await response.settlePrintTrade();

    const difference = await positionMeasurer.measureDifference();

    expect(difference.taker).to.deep.include({
      positions: ["-40", "12"],
      // cashBalance: "20000",
    });
    expect(difference.maker).to.deep.include({
      positions: ["40", "-12"],
      // cashBalance: "-20000",
    });
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
    await response.preparePrintTradeSettlement(AuthoritySide.Maker);
    await response.preparePrintTradeSettlement(AuthoritySide.Taker);
    await response.settlePrintTrade();

    const difference = await positionMeasurer.measureDifference();

    expect(difference.taker).to.deep.include({
      positions: ["1", "-0.3"],
      // cashBalance: "-500",
    });
    expect(difference.maker).to.deep.include({
      positions: ["-1", "0.3"],
      // cashBalance: "500",
    });
  });
});
