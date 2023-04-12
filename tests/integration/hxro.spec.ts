import { Wallet, BN } from "@project-serum/anchor";
import { PublicKey, SystemProgram, Keypair } from "@solana/web3.js";
import { Context, getContext } from "../utilities/wrappers";
import { attachImprovedLogDisplay, executeInParallel } from "../utilities/helpers";
import dexterity from "@hxronetwork/dexterity-ts";

describe("RFQ HXRO instrument integration tests", () => {
  beforeEach(function () {
    attachImprovedLogDisplay(this, context);
  });

  let context: Context;
  let trgTakerKey: PublicKey;
  let trgMakerKey: PublicKey;
  let trgDaoKey: PublicKey;

  const productKey = new PublicKey("2Ez9E5xTbSH9zJjcHrwH71TAh85XXh2jd7sA5w7HkW2A");
  const mpgPubkey = new PublicKey("7Z1XJ8cRvVDYDDziL8kZW6W2SbFRoZhzmpeAEBoxwXxa");

  before(async () => {
    context = await getContext();

    const createTrg = async (keypair: Keypair) => {
      const manifest = await dexterity.getManifest(context.provider.connection.rpcEndpoint, true, new Wallet(keypair));
      return await manifest.createTrg(mpgPubkey);
    };

    [trgTakerKey, trgMakerKey, trgDaoKey] = await executeInParallel(
      () => createTrg(context.taker),
      () => createTrg(context.maker),
      () => createTrg(context.dao)
    );
  });

  it("HXRO direct calls work", async () => {
    const manifest = await dexterity.getManifest(
      context.provider.connection.rpcEndpoint,
      true,
      new Wallet(context.dao)
    );
    const dexProgram = manifest.fields.dexProgram;
    const [mpg, trgTaker, trgMaker] = await executeInParallel(
      () => manifest.getMPG(mpgPubkey),
      () => manifest.getTRG(trgTakerKey),
      () => manifest.getTRG(trgMakerKey)
    );
    const [printTrade] = PublicKey.findProgramAddressSync(
      [Buffer.from("print_trade"), productKey.toBuffer(), trgTakerKey.toBuffer(), trgMakerKey.toBuffer()],
      dexProgram.programId
    );

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
        creator: trgTakerKey,
        counterparty: trgMakerKey,
        operator: trgDaoKey,
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
        creator: trgTakerKey,
        counterparty: trgMakerKey,
        operator: trgDaoKey,
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
    const manifest = await dexterity.getManifest(
      context.provider.connection.rpcEndpoint,
      true,
      new Wallet(context.dao)
    );
    const dexProgram = manifest.fields.dexProgram;
    const [mpg, trgTaker, trgMaker] = await executeInParallel(
      () => manifest.getMPG(mpgPubkey),
      () => manifest.getTRGsOfOwner(context.taker.publicKey, mpgPubkey),
      () => manifest.getTRGsOfOwner(context.maker.publicKey, mpgPubkey)
    );
    const [printTrade] = PublicKey.findProgramAddressSync(
      [Buffer.from("print_trade"), productKey.toBuffer(), trgTakerKey.toBuffer(), trgMakerKey.toBuffer()],
      dexProgram.programId
    );
  });
});
