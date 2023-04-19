import { attachImprovedLogDisplay, executeInParallel, expectError, runInParallelWithWait } from "../utilities/helpers";
import { AuthoritySide, OrderType } from "../utilities/types";
import { Context, getContext } from "../utilities/wrappers";
import { HxroPrintTradeProvider, HxroProxy } from "../utilities/printTradeProviders/hxroPrintTradeProvider";

describe("Expire settlement", () => {
  let context: Context;
  let hxroProxy: HxroProxy;

  beforeEach(function () {
    attachImprovedLogDisplay(this, context);
  });

  before(async () => {
    context = await getContext();
    hxroProxy = await HxroProxy.create(context);
  });

  it("Can't expire unrelated response", async () => {
    const [rfq1, rfq2] = await executeInParallel(
      () => context.createEscrowRfq({ orderType: OrderType.TwoWay }),
      () => context.createEscrowRfq({ orderType: OrderType.Sell })
    );

    const response = await rfq1.respond();

    await expectError(response.expireSettlement({ accountOverrides: { rfq: rfq2.account } }), "ResponseForAnotherRfq");
  });

  it("Can't expire escrow rfq", async () => {
    const rfq = await context.createEscrowRfq();
    const response = await rfq.respond();

    await expectError(response.expireSettlement(), "InvalidSettlingFlow");
  });

  it("Can't expire if not settling", async () => {
    const rfq = await context.createPrintTradeRfq({
      printTradeProvider: new HxroPrintTradeProvider(context, hxroProxy),
    });
    const response = await rfq.respond();
    await response.confirm();

    await expectError(response.expireSettlement(), "ResponseIsNotInRequiredState");
  });

  it("Can't expire if expiration buffer haven't ended", async () => {
    const rfq = await context.createPrintTradeRfq({
      printTradeProvider: new HxroPrintTradeProvider(context, hxroProxy),
      activeWindow: 2,
      settlingWindow: 1,
    });

    const response = await runInParallelWithWait(async () => {
      const response = await rfq.respond();
      await response.confirm();
      await response.preparePrintTradeSettlement(AuthoritySide.Taker);
      await response.preparePrintTradeSettlement(AuthoritySide.Maker);
      return response;
    }, 3.5);

    await expectError(response.expireSettlement(), "TooEarlyForExpiration");
  });
});
