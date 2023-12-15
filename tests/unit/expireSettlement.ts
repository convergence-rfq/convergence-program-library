import { attachImprovedLogDisplay, executeInParallel, expectError, runInParallelWithWait } from "../utilities/helpers";
import { AuthoritySide, OrderType } from "../utilities/types";
import { Context, getContext } from "../utilities/wrappers";
import {
  HxroPrintTradeProvider,
  HxroContext,
  getHxroContext,
  DEFAULT_SETTLEMENT_OUTCOME,
} from "../utilities/printTradeProviders/hxroPrintTradeProvider";

describe("Expire settlement", () => {
  let context: Context;
  let hxroContext: HxroContext;

  beforeEach(function () {
    attachImprovedLogDisplay(this, context);
  });

  before(async () => {
    context = await getContext();
    hxroContext = await getHxroContext(context);
  });

  it("Can't expire unrelated response", async () => {
    const [rfq1, rfq2] = await executeInParallel(
      () => context.createEscrowRfq({ orderType: OrderType.Sell }),
      () => context.createEscrowRfq({ orderType: OrderType.Buy })
    );

    const response = await rfq1.respond();

    await expectError(response.expireSettlement({ accountOverrides: { rfq: rfq2.account } }), "ResponseForAnotherRfq");
  });

  it("Can't expire escrow rfq", async () => {
    const rfq = await context.createEscrowRfq({ orderType: OrderType.TwoWay });
    const response = await rfq.respond();

    await expectError(response.expireSettlement(), "InvalidSettlingFlow");
  });

  it("Can't expire if not settling", async () => {
    const rfq = await context.createPrintTradeRfq({
      printTradeProvider: new HxroPrintTradeProvider(context, hxroContext),
    });
    const response = await rfq.respond();
    await response.confirm();

    await expectError(response.expireSettlement(), "ResponseIsNotInRequiredState");
  });

  it("Can't expire if expiration buffer haven't ended", async () => {
    const rfq = await context.createPrintTradeRfq({
      printTradeProvider: new HxroPrintTradeProvider(context, hxroContext),
      activeWindow: 3,
      settlingWindow: 1,
    });

    const response = await runInParallelWithWait(async () => {
      const response = await rfq.respond();
      await response.confirm();
      await response.preparePrintTradeSettlement(AuthoritySide.Taker, DEFAULT_SETTLEMENT_OUTCOME);
      await response.preparePrintTradeSettlement(AuthoritySide.Maker, DEFAULT_SETTLEMENT_OUTCOME);
      return response;
    }, 4.5);

    await expectError(response.expireSettlement(), "TooEarlyForExpiration");
  });
});
