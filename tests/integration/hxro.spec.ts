import { Context, getContext } from "../utilities/wrappers";
import { attachImprovedLogDisplay, expectError, runInParallelWithWait, sleep } from "../utilities/helpers";
import {
  HxroPrintTradeProvider,
  HxroContext,
  getHxroContext,
  DEFAULT_SETTLEMENT_OUTCOME,
} from "../utilities/printTradeProviders/hxroPrintTradeProvider";
import { AuthoritySide, Quote, QuoteSide } from "../utilities/types";
import {
  DEFAULT_LEG_MULTIPLIER,
  DEFAULT_LEG_SIDE,
  DEFAULT_PRICE,
  SOLANA_BASE_ASSET_INDEX,
} from "../utilities/constants";
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

  it("Create a HXRO RFQ, don't verify it, try to finalize, fail and clean up", async () => {
    const rfq = await context.createPrintTradeRfq({
      printTradeProvider: new HxroPrintTradeProvider(context, hxroContext),
      verify: false,
      finalize: false,
    });
    await expectError(rfq.finalizeRfq(), "RfqIsNotInRequiredState");

    await rfq.cleanUp();
  });

  it("Create a HXRO RFQ, verify, don't finish and clean up", async () => {
    const rfq = await context.createPrintTradeRfq({
      printTradeProvider: new HxroPrintTradeProvider(context, hxroContext),
      finalize: false,
    });
    await rfq.cleanUp();
  });

  it("Create a HXRO RFQ, cancel and clean up", async () => {
    const rfq = await context.createPrintTradeRfq({
      printTradeProvider: new HxroPrintTradeProvider(context, hxroContext),
    });
    await rfq.cancel();
    await rfq.cleanUp();
  });

  it("Create a HXRO RFQ, it expires and is removed", async () => {
    const rfq = await context.createPrintTradeRfq({
      printTradeProvider: new HxroPrintTradeProvider(context, hxroContext),
      activeWindow: 1,
    });
    await sleep(1.5);
    await rfq.cleanUp();
  });

  it("Create a Hxro RFQ, respond, active period ends and remove response and rfq", async () => {
    const rfq = await context.createPrintTradeRfq({
      printTradeProvider: new HxroPrintTradeProvider(context, hxroContext),
      activeWindow: 2,
    });
    const response = await runInParallelWithWait(() => rfq.respond(), 2.5);

    await response.cleanUp();
    await rfq.cleanUp();
  });

  it("HXRO maker forgets to sign a print trade and preparations fail", async () => {
    const rfq = await context.createPrintTradeRfq({
      printTradeProvider: new HxroPrintTradeProvider(context, hxroContext),
    });
    const response = await rfq.respond();
    await response.confirm();
    await response.preparePrintTradeSettlement(AuthoritySide.Taker, DEFAULT_SETTLEMENT_OUTCOME);
    await expectError(
      response.preparePrintTradeSettlement(AuthoritySide.Maker, DEFAULT_SETTLEMENT_OUTCOME, { skipPreStep: true }),
      "ExpectedSignedPrintTrade"
    );
  });

  it("HXRO successful settlement flow", async () => {
    const rfq = await context.createPrintTradeRfq({
      printTradeProvider: new HxroPrintTradeProvider(context, hxroContext),
    });
    const response = await rfq.respond();
    await response.confirm();
    await response.preparePrintTradeSettlement(AuthoritySide.Taker, DEFAULT_SETTLEMENT_OUTCOME);
    await response.preparePrintTradeSettlement(AuthoritySide.Maker, DEFAULT_SETTLEMENT_OUTCOME);
    await response.settlePrintTrade();
    await response.cleanUp();
    await rfq.cancel();
    await rfq.cleanUp();
  });

  it("Create a Hxrp RFQ, respond, confirm, but settle after settling period ends", async () => {
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

    await response.settlePrintTrade();
    await response.cleanUp();
    await rfq.cleanUp();
  });

  it("Create a Hxro RFQ, respond and confirm, maker prepares but taker defaults", async () => {
    const rfq = await context.createPrintTradeRfq({
      printTradeProvider: new HxroPrintTradeProvider(context, hxroContext),
      activeWindow: 2,
      settlingWindow: 1,
    });

    const response = await runInParallelWithWait(async () => {
      const response = await rfq.respond();
      await response.confirm();

      await response.preparePrintTradeSettlement(AuthoritySide.Maker, DEFAULT_SETTLEMENT_OUTCOME);

      return response;
    }, 3.5);

    await response.revertPrintTradeSettlementPreparation(AuthoritySide.Maker);

    await response.cleanUp();
    await rfq.cleanUp();
  });

  it("Create a Hxro RFQ, respond and confirm, taker prepares but maker defaults", async () => {
    const rfq = await context.createPrintTradeRfq({
      printTradeProvider: new HxroPrintTradeProvider(context, hxroContext),
      activeWindow: 2,
      settlingWindow: 1,
    });

    const response = await runInParallelWithWait(async () => {
      const response = await rfq.respond();
      await response.confirm();

      await response.preparePrintTradeSettlement(AuthoritySide.Taker, DEFAULT_SETTLEMENT_OUTCOME);

      return response;
    }, 3.5);

    await response.revertPrintTradeSettlementPreparation(AuthoritySide.Taker);

    await response.cleanUp();
    await rfq.cleanUp();
  });

  it("Create a Hxro RFQ, respond and confirm, but both parties defaults", async () => {
    const rfq = await context.createPrintTradeRfq({
      printTradeProvider: new HxroPrintTradeProvider(context, hxroContext),
      activeWindow: 2,
      settlingWindow: 1,
    });

    const response = await runInParallelWithWait(async () => {
      const response = await rfq.respond();
      await response.confirm();

      return response;
    }, 3.5);

    await response.cleanUp();
    await rfq.cleanUp();
  });

  it("Create a Hxro RFQ, both parties prepare but taker does not have enough collateral", async () => {
    const printTradeProvider = new HxroPrintTradeProvider(context, hxroContext, [
      { amount: 100, side: DEFAULT_LEG_SIDE, baseAssetIndex: SOLANA_BASE_ASSET_INDEX, productIndex: 0 },
    ]);
    const rfq = await context.createPrintTradeRfq({
      printTradeProvider,
    });

    const response = await rfq.respond({ ask: Quote.getStandard(DEFAULT_PRICE, DEFAULT_LEG_MULTIPLIER) });
    await response.confirm({ side: QuoteSide.Ask });

    const expectedSettlement = { price: "-100", legs: ["100"] };

    await response.preparePrintTradeSettlement(AuthoritySide.Taker, expectedSettlement);
    await printTradeProvider.manageCollateral("unlock", AuthoritySide.Taker, expectedSettlement);

    await response.preparePrintTradeSettlement(AuthoritySide.Maker, expectedSettlement);

    await response.settlePrintTrade();

    const responseData = await response.getData();
    expect(responseData.defaultingParty).to.be.deep.equal(AuthoritySide.Taker);

    await response.revertPrintTradeSettlementPreparation(AuthoritySide.Taker);
    await response.revertPrintTradeSettlementPreparation(AuthoritySide.Maker);
    await response.cleanUp();
  });

  it("Create a Hxro RFQ, both parties prepare but maker does not have enough collateral", async () => {
    const printTradeProvider = new HxroPrintTradeProvider(context, hxroContext, [
      { amount: 200, side: DEFAULT_LEG_SIDE, baseAssetIndex: SOLANA_BASE_ASSET_INDEX, productIndex: 0 },
    ]);
    const rfq = await context.createPrintTradeRfq({
      printTradeProvider,
    });

    const response = await rfq.respond({ ask: Quote.getStandard(DEFAULT_PRICE, DEFAULT_LEG_MULTIPLIER) });
    await response.confirm({ side: QuoteSide.Ask });

    const expectedSettlement = { price: "-100", legs: ["200"] };

    await response.preparePrintTradeSettlement(AuthoritySide.Maker, expectedSettlement);
    await printTradeProvider.manageCollateral("unlock", AuthoritySide.Maker, expectedSettlement);

    await response.preparePrintTradeSettlement(AuthoritySide.Taker, expectedSettlement);

    await response.settlePrintTrade();

    const responseData = await response.getData();
    expect(responseData.defaultingParty).to.be.deep.equal(AuthoritySide.Maker);

    await response.revertPrintTradeSettlementPreparation(AuthoritySide.Taker);
    await response.revertPrintTradeSettlementPreparation(AuthoritySide.Maker);
    await response.cleanUp();
  });

  it("Create a Hxro RFQ, both parties prepare but taker cancels print trade and defauls", async () => {
    const printTradeProvider = new HxroPrintTradeProvider(context, hxroContext);
    const rfq = await context.createPrintTradeRfq({
      printTradeProvider,
    });

    const response = await rfq.respond();
    await response.confirm();

    const expectedSettlement = { price: "100", legs: ["-10"] };

    await response.preparePrintTradeSettlement(AuthoritySide.Taker, expectedSettlement);
    await response.preparePrintTradeSettlement(AuthoritySide.Maker, expectedSettlement);

    await printTradeProvider.cancelPrintTrade(response, AuthoritySide.Taker);

    await response.settlePrintTrade();

    const responseData = await response.getData();
    expect(responseData.defaultingParty).to.be.deep.equal(AuthoritySide.Taker);

    await response.revertPrintTradeSettlementPreparation(AuthoritySide.Taker);
    await response.revertPrintTradeSettlementPreparation(AuthoritySide.Maker);
    await response.cleanUp();
  });

  it("Create a Hxro RFQ, both parties prepare but maker cancels print trade and defauls", async () => {
    const printTradeProvider = new HxroPrintTradeProvider(context, hxroContext);
    const rfq = await context.createPrintTradeRfq({
      printTradeProvider,
    });

    const response = await rfq.respond();
    await response.confirm();

    const expectedSettlement = { price: "100", legs: ["-10"] };

    await response.preparePrintTradeSettlement(AuthoritySide.Taker, expectedSettlement);
    await response.preparePrintTradeSettlement(AuthoritySide.Maker, expectedSettlement);

    await printTradeProvider.cancelPrintTrade(response, AuthoritySide.Maker);

    await response.settlePrintTrade();

    const responseData = await response.getData();
    expect(responseData.defaultingParty).to.be.deep.equal(AuthoritySide.Maker);

    await response.revertPrintTradeSettlementPreparation(AuthoritySide.Taker);
    await response.revertPrintTradeSettlementPreparation(AuthoritySide.Maker);
    await response.cleanUp();
  });
});
