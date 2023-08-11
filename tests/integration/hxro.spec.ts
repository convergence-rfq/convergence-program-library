import { Context, getContext } from "../utilities/wrappers";
import { attachImprovedLogDisplay, toAbsolutePrice, toLegMultiplier, withTokenDecimals } from "../utilities/helpers";
import {
  HxroPrintTradeProvider,
  HxroContext,
  getHxroContext,
} from "../utilities/printTradeProviders/hxroPrintTradeProvider";
import { AuthoritySide, FixedSize, LegSide, OrderType, Quote, QuoteSide } from "../utilities/types";
import { SOLANA_BASE_ASSET_INDEX } from "../utilities/constants";

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

  it("HXRO successful settlement flow", async () => {
    const rfq = await context.createPrintTradeRfq({
      printTradeProvider: new HxroPrintTradeProvider(context, hxroContext, [
        {
          amount: 20_000,
          baseAssetIndex: SOLANA_BASE_ASSET_INDEX,
          side: LegSide.Long,
          productIndex: 0,
        },
        {
          amount: 15,
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
    await response.unlockResponseCollateral();
    await response.cleanUp();
    await rfq.cancel();
    await rfq.cleanUp();
  });
});
