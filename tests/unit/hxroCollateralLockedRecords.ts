import { Context, getContext } from "../utilities/wrappers";
import { attachImprovedLogDisplay, expectError } from "../utilities/helpers";
import {
  HxroPrintTradeProvider,
  HxroContext,
  getHxroContext,
  DEFAULT_SETTLEMENT_OUTCOME,
  getHxroProviderProgram,
} from "../utilities/printTradeProviders/hxroPrintTradeProvider";
import { AuthoritySide, Quote, QuoteSide } from "../utilities/types";
import {
  DEFAULT_LEG_MULTIPLIER,
  DEFAULT_LEG_SIDE,
  DEFAULT_PRICE,
  SOLANA_BASE_ASSET_INDEX,
} from "../utilities/constants";
import { expect } from "chai";

describe("RFQ HXRO collateral lock records", () => {
  beforeEach(function () {
    attachImprovedLogDisplay(this, context);
  });

  let context: Context;
  let hxroContext: HxroContext;

  before(async () => {
    context = await getContext();
    hxroContext = await getHxroContext(context);
  });

  it("Successful settlement removes locks", async () => {
    const printTradeProvider = new HxroPrintTradeProvider(context, hxroContext);
    const rfq = await context.createPrintTradeRfq({
      printTradeProvider,
    });
    const response = await rfq.respond();
    await response.confirm();
    await response.preparePrintTradeSettlement(AuthoritySide.Taker, DEFAULT_SETTLEMENT_OUTCOME);
    await response.preparePrintTradeSettlement(AuthoritySide.Maker, DEFAULT_SETTLEMENT_OUTCOME);

    const hxroProgram = getHxroProviderProgram();
    const takerLockAddress = HxroPrintTradeProvider.getLockedCollateralRecordAddress(
      context.taker.publicKey,
      response.account
    );
    const makerLockAddress = HxroPrintTradeProvider.getLockedCollateralRecordAddress(
      context.maker.publicKey,
      response.account
    );
    const [takerLockBefore, makerLockBefore] = await hxroProgram.account.lockedCollateralRecord.fetchMultiple([
      takerLockAddress,
      makerLockAddress,
    ]);
    await response.settlePrintTrade();
    const [takerLockAfter, makerLockAfter] = await hxroProgram.account.lockedCollateralRecord.fetchMultiple([
      takerLockAddress,
      makerLockAddress,
    ]);

    expect(takerLockBefore).to.be.not.equal(null);
    expect(makerLockBefore).to.be.not.equal(null);
    expect(takerLockAfter).to.be.equal(null);
    expect(makerLockAfter).to.be.equal(null);
  });

  it("Successfully remove lock records after a failed settlement", async () => {
    const printTradeProvider = new HxroPrintTradeProvider(context, hxroContext, [
      { amount: 200, side: DEFAULT_LEG_SIDE, baseAssetIndex: SOLANA_BASE_ASSET_INDEX, productIndex: 0 },
    ]);
    const rfq = await context.createPrintTradeRfq({
      printTradeProvider,
    });
    const response = await rfq.respond({ ask: Quote.getStandard(DEFAULT_PRICE, DEFAULT_LEG_MULTIPLIER) });
    await response.confirm({ side: QuoteSide.Ask });

    const expectedSettlement = { price: "-100", legs: ["200"] };

    await response.preparePrintTradeSettlement(AuthoritySide.Taker, expectedSettlement);
    await printTradeProvider.manageCollateral("unlock", AuthoritySide.Taker, expectedSettlement);
    await response.preparePrintTradeSettlement(AuthoritySide.Maker, expectedSettlement);
    await response.settlePrintTrade();
    await response.revertPrintTradeSettlementPreparation(AuthoritySide.Taker);
    await response.revertPrintTradeSettlementPreparation(AuthoritySide.Maker);

    await printTradeProvider.unlockCollateralAndRemoveRecord(AuthoritySide.Maker, rfq, response);

    const hxroProgram = getHxroProviderProgram();
    const makerLockAddress = HxroPrintTradeProvider.getLockedCollateralRecordAddress(
      context.maker.publicKey,
      response.account
    );
    const makerLock = await hxroProgram.account.lockedCollateralRecord.fetchNullable(makerLockAddress);
    expect(makerLock).to.be.equal(null);
  });

  it("Can't remove record while in use", async () => {
    const printTradeProvider = new HxroPrintTradeProvider(context, hxroContext, [
      { amount: 300, side: DEFAULT_LEG_SIDE, baseAssetIndex: SOLANA_BASE_ASSET_INDEX, productIndex: 0 },
    ]);
    const rfq = await context.createPrintTradeRfq({
      printTradeProvider,
    });
    const response = await rfq.respond({ ask: Quote.getStandard(DEFAULT_PRICE, DEFAULT_LEG_MULTIPLIER) });
    await response.confirm({ side: QuoteSide.Ask });

    const expectedSettlement = { price: "-100", legs: ["300"] };

    await response.preparePrintTradeSettlement(AuthoritySide.Taker, expectedSettlement);
    await printTradeProvider.manageCollateral("unlock", AuthoritySide.Taker, expectedSettlement);
    await response.preparePrintTradeSettlement(AuthoritySide.Maker, expectedSettlement);
    await response.settlePrintTrade();

    await expectError(
      printTradeProvider.unlockCollateralAndRemoveRecord(AuthoritySide.Maker, rfq, response),
      "RecordIsInUse"
    );
  });
});
