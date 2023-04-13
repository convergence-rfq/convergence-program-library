import { BN } from "@project-serum/anchor";
import { SystemProgram } from "@solana/web3.js";
import { Context, getContext } from "../utilities/wrappers";
import { attachImprovedLogDisplay } from "../utilities/helpers";
import dexterity from "@hxronetwork/dexterity-ts";
import {
  HxroPrintTradeProvider,
  HxroProxy,
  mpgPubkey,
  productKey,
} from "../utilities/printTradeProviders/hxroPrintTradeProvider";
import { AuthoritySide, LegSide } from "../utilities/types";
import { BITCOIN_BASE_ASSET_INDEX } from "../utilities/constants";

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

    // {
    //   const trgTaker2 = await manifestTaker.getTRG(trgTakerKey);
    //   console.dir(trgTaker2.traderPositions.map((x) => dexterity.Fractional.From(x.position).toDecimal()));
    //   console.dir(dexterity.Fractional.From(trgTaker2.cashBalance).toDecimal());
    //   const trgMaker2 = await manifestMaker.getTRG(trgMakerKey);
    //   console.dir(trgMaker2.traderPositions.map((x) => dexterity.Fractional.From(x.position).toDecimal()));
    //   console.dir(dexterity.Fractional.From(trgMaker2.cashBalance).toDecimal());
    // }

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

    // {
    //   const trgTaker2 = await manifestTaker.getTRG(trgTakerKey);
    //   console.dir(trgTaker2.traderPositions.map((x) => dexterity.Fractional.From(x.position).toDecimal()));
    //   console.dir(dexterity.Fractional.From(trgTaker2.cashBalance).toDecimal());
    //   const trgMaker2 = await manifestMaker.getTRG(trgMakerKey);
    //   console.dir(trgMaker2.traderPositions.map((x) => dexterity.Fractional.From(x.position).toDecimal()));
    //   console.dir(dexterity.Fractional.From(trgMaker2.cashBalance).toDecimal());
    // }
  });

  it("HXRO through a print trade provider works", async () => {
    const rfq = await context.createPrintTradeRfq({
      printTradeProvider: new HxroPrintTradeProvider(context, hxroProxy, [
        { amount: 1_000, amountDecimals: 3, baseAssetIndex: BITCOIN_BASE_ASSET_INDEX, side: LegSide.Positive },
      ]),
    });
    const response = await rfq.respond();
    await response.confirm();
    await response.preparePrintTradeSettlement(AuthoritySide.Taker);
    await response.executePrintTradeSettlement(AuthoritySide.Maker);
  });
});
