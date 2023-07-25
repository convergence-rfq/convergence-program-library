import { BN } from "@coral-xyz/anchor";
import { SystemProgram } from "@solana/web3.js";
import { Context, getContext } from "../utilities/wrappers";
import {
  attachImprovedLogDisplay,
  executeInParallel,
  toAbsolutePrice,
  toLegMultiplier,
  withTokenDecimals,
} from "../utilities/helpers";
import dexterity from "@hxronetwork/dexterity-ts";
import {
  HxroPrintTradeProvider,
  HxroProxy,
  mpgPubkey,
  productKey,
} from "../utilities/printTradeProviders/hxroPrintTradeProvider";
import { AuthoritySide, FixedSize, LegSide, OrderType, Quote, QuoteSide } from "../utilities/types";
import { BITCOIN_BASE_ASSET_INDEX } from "../utilities/constants";
import { expect } from "chai";

describe("RFQ HXRO instrument integration tests", () => {
  beforeEach(function () {
    attachImprovedLogDisplay(this, context);
  });

  let context: Context;
  let hxroProxy: HxroProxy;

  before(async () => {
    context = await getContext();
    hxroProxy = await HxroProxy.create(context);
  });

  it("HXRO direct calls work", async () => {
    const { manifest, dexProgram, printTrade, mpg, trgTaker, trgMaker, trgDao } = hxroProxy.hxroContext;

    await dexProgram.methods
      .initializePrintTrade({
        productIndex: new BN(0),
        size: { m: new BN(42), exp: new BN(1) },
        price: { m: new BN(1), exp: new BN(1) },
        side: { bid: {} },
      })
      .accounts({
        user: context.taker.publicKey,
        creator: trgTaker.publicKey,
        counterparty: trgMaker.publicKey,
        operator: trgDao.publicKey,
        marketProductGroup: mpgPubkey,
        product: productKey,
        printTrade,
        systemProgram: SystemProgram.programId,
      })
      .signers([context.taker])
      .rpc();

    // const d = await manifestTaker.getMarkPrices(manifestMaker.getMarkPricesAccount(mpgPubkey));
    // console.dir(d);

    // const traderTaker = new dexterity.Trader(manifestTaker, trgTakerKey);
    // await traderTaker.update();
    // await traderTaker.updateMarkPrices();

    const tx = await dexProgram.methods
      .signPrintTrade({
        productIndex: new BN(0),
        size: { m: new BN(42), exp: new BN(1) },
        price: { m: new BN(1), exp: new BN(1) },
        side: { ask: {} },
      })
      .accounts({
        user: context.maker.publicKey,
        creator: trgTaker.publicKey,
        counterparty: trgMaker.publicKey,
        operator: trgDao.publicKey,
        marketProductGroup: mpgPubkey,
        product: productKey,
        printTrade,
        systemProgram: SystemProgram.programId,
        feeModelProgram: mpg.feeModelProgramId,
        feeModelConfigurationAcct: mpg.feeModelConfigurationAcct,
        feeOutputRegister: mpg.feeOutputRegister,
        riskEngineProgram: mpg.riskEngineProgramId,
        riskModelConfigurationAcct: mpg.riskModelConfigurationAcct,
        riskOutputRegister: mpg.riskOutputRegister,
        riskAndFeeSigner: dexterity.Manifest.GetRiskAndFeeSigner(mpgPubkey),
        creatorTraderFeeStateAcct: trgTaker.feeStateAccount,
        creatorTraderRiskStateAcct: trgTaker.riskStateAccount,
        counterpartyTraderFeeStateAcct: trgMaker.feeStateAccount,
        counterpartyTraderRiskStateAcct: trgMaker.riskStateAccount,
      })
      .remainingAccounts([
        { pubkey: manifest.getRiskS(mpgPubkey), isSigner: false, isWritable: true },
        { pubkey: manifest.getRiskR(mpgPubkey), isSigner: false, isWritable: true },
        { pubkey: manifest.getMarkPricesAccount(mpgPubkey), isSigner: false, isWritable: true },
      ])
      .signers([context.maker])
      .rpc();

    // await context.provider.connection.confirmTransaction(t, "confirmed");
    // const x = await context.provider.connection.getTransaction(t, { commitment: "confirmed" });
    // console.dir(x);

    // t.recentBlockhash = (await context.provider.connection.getLatestBlockhash()).blockhash;
    // t.feePayer = context.maker.publicKey;
    // t.sign(context.maker);
    // const ser = t.serialize();
    // console.log(ser.length);
  });

  it.skip("HXRO sell print trade works", async () => {
    const [takerBalanceBefore, makerBalanceBefore] = await executeInParallel(
      () => hxroProxy.getBalance("taker"),
      () => hxroProxy.getBalance("maker")
    );

    const rfq = await context.createPrintTradeRfq({
      printTradeProvider: new HxroPrintTradeProvider(context, hxroProxy, [
        {
          amount: 1_000,
          amountDecimals: 3,
          baseAssetIndex: BITCOIN_BASE_ASSET_INDEX,
          side: LegSide.Long,
          productIndex: 0,
        },
      ]),
      fixedSize: FixedSize.getBaseAsset(toLegMultiplier(1)),
      orderType: OrderType.Sell,
    });
    const response = await rfq.respond({ bid: Quote.getFixedSize(toAbsolutePrice(withTokenDecimals(21_333))) });
    await response.confirm();
    await response.preparePrintTradeSettlement(AuthoritySide.Taker);
    await response.preparePrintTradeSettlement(AuthoritySide.Maker);
    await response.settlePrintTrade();

    const [takerBalanceAfter, makerBalanceAfter] = await executeInParallel(
      () => hxroProxy.getBalance("taker"),
      () => hxroProxy.getBalance("maker")
    );

    expect(takerBalanceAfter.positions[0] - takerBalanceBefore.positions[0]).to.be.equal(-2);
    expect(makerBalanceAfter.positions[0] - makerBalanceBefore.positions[0]).to.be.equal(2);
    expect(takerBalanceAfter.cashBalance - takerBalanceBefore.cashBalance).to.be.closeTo(21_333, 100);
    expect(makerBalanceAfter.cashBalance - makerBalanceBefore.cashBalance).to.be.closeTo(-21_333, 100);
  });

  it.skip("HXRO buy print trade works", async () => {
    const [takerBalanceBefore, makerBalanceBefore] = await executeInParallel(
      () => hxroProxy.getBalance("taker"),
      () => hxroProxy.getBalance("maker")
    );

    const rfq = await context.createPrintTradeRfq({
      printTradeProvider: new HxroPrintTradeProvider(context, hxroProxy, [
        {
          amount: 1_000_000,
          amountDecimals: 6,
          baseAssetIndex: BITCOIN_BASE_ASSET_INDEX,
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
      () => hxroProxy.getBalance("taker"),
      () => hxroProxy.getBalance("maker")
    );

    expect(takerBalanceAfter.positions[0] - takerBalanceBefore.positions[0]).to.be.equal(1);
    expect(makerBalanceAfter.positions[0] - makerBalanceBefore.positions[0]).to.be.equal(-1);
    expect(takerBalanceAfter.cashBalance - takerBalanceBefore.cashBalance).to.be.closeTo(-30, 1);
    expect(makerBalanceAfter.cashBalance - makerBalanceBefore.cashBalance).to.be.closeTo(30, 1);
  });
});
