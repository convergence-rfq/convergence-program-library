import { Program, Wallet, workspace, BN } from "@project-serum/anchor";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { Context, Response, Rfq } from "../wrappers";
import { HxroPrintTradeProvider as HxroPrintTradeProviderIdl } from "../../../target/types/hxro_print_trade_provider";
import { AuthoritySide, InstrumentType, LegData, LegSide, QuoteData } from "../types";
import dexterity from "@hxronetwork/dexterity-ts";
import { executeInParallel } from "../helpers";

export const productKey = new PublicKey("2Ez9E5xTbSH9zJjcHrwH71TAh85XXh2jd7sA5w7HkW2A");
export const mpgPubkey = new PublicKey("7Z1XJ8cRvVDYDDziL8kZW6W2SbFRoZhzmpeAEBoxwXxa");

let hxroPrintTradeProviderProgram: Program<HxroPrintTradeProviderIdl> | null = null;
export function getHxroInstrumentProgram(): Program<HxroPrintTradeProviderIdl> {
  if (hxroPrintTradeProviderProgram === null) {
    hxroPrintTradeProviderProgram = workspace.HxroPrintTradeProvider as Program<HxroPrintTradeProviderIdl>;
  }

  return hxroPrintTradeProviderProgram;
}

export class HxroPrintTradeProvider {
  constructor(
    private context: Context,
    private proxy: HxroProxy,
    private legs: { amount: number; amountDecimals: number; side: LegSide; baseAssetIndex: number }[]
  ) {}

  static async addPrintTradeProvider(context: Context) {
    await context.addPrintTradeProvider(getHxroInstrumentProgram().programId, 0);
  }

  getProgramId(): PublicKey {
    return getHxroInstrumentProgram().programId;
  }

  getLegData(): LegData[] {
    return this.legs.map((leg) => {
      return {
        settlementTypeMetadata: { printTrade: { instrumentType: Number(InstrumentType.Spot) } },
        baseAssetIndex: { value: leg.baseAssetIndex },
        data: Buffer.from(Uint8Array.from([0])),
        amount: new BN(leg.amount),
        amountDecimals: leg.amountDecimals,
        side: leg.side,
      };
    });
  }

  getQuoteData(): QuoteData {
    return {
      settlementTypeMetadata: { printTrade: { instrumentType: Number(InstrumentType.Spot) } },
      data: Buffer.from([]),
      decimals: 9,
    };
  }

  getBaseAssetIndexes(): number[] {
    return this.legs.map((leg) => leg.baseAssetIndex);
  }

  getValidationAccounts() {
    return [{ pubkey: this.getProgramId(), isSigner: false, isWritable: false }];
  }

  getPreparePrintTradeSettlementAccounts(side: AuthoritySide, rfq: Rfq, response: Response) {
    const caller = side == AuthoritySide.Taker ? this.context.taker : this.context.maker;
    const { trgTaker, trgMaker, trgDao, printTrade, dexProgram } = this.proxy.hxroContext;
    const { trgCreator, trgCounterparty } =
      side == AuthoritySide.Taker
        ? { trgCreator: trgTaker, trgCounterparty: trgMaker }
        : { trgCreator: trgMaker, trgCounterparty: trgTaker };

    return [
      { pubkey: this.getProgramId(), isSigner: false, isWritable: false },
      { pubkey: dexProgram.programId, isSigner: false, isWritable: false },
      { pubkey: caller.publicKey, isSigner: true, isWritable: true },
      { pubkey: trgCreator.publicKey, isSigner: false, isWritable: false },
      { pubkey: trgCounterparty.publicKey, isSigner: false, isWritable: false },
      { pubkey: trgDao.publicKey, isSigner: false, isWritable: false },
      { pubkey: mpgPubkey, isSigner: false, isWritable: true },
      { pubkey: productKey, isSigner: false, isWritable: false },
      { pubkey: printTrade, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ];
  }

  getExecutePrintTradeSettlementAccounts(side: AuthoritySide, rfq: Rfq, response: Response) {
    const caller = side == AuthoritySide.Taker ? this.context.taker : this.context.maker;
    const { trgTaker, trgMaker, trgDao, printTrade, dexProgram, mpg, riskAndFeeSigner, manifest } =
      this.proxy.hxroContext;
    const { trgCreator, trgCounterparty } =
      side == AuthoritySide.Taker
        ? { trgCreator: trgMaker, trgCounterparty: trgTaker }
        : { trgCreator: trgTaker, trgCounterparty: trgMaker };

    return [
      { pubkey: this.getProgramId(), isSigner: false, isWritable: false },
      { pubkey: dexProgram.programId, isSigner: false, isWritable: false },
      { pubkey: caller.publicKey, isSigner: true, isWritable: true },
      { pubkey: trgCreator.publicKey, isSigner: false, isWritable: true },
      { pubkey: trgCounterparty.publicKey, isSigner: false, isWritable: true },
      { pubkey: trgDao.publicKey, isSigner: false, isWritable: true },
      { pubkey: mpgPubkey, isSigner: false, isWritable: true },
      { pubkey: productKey, isSigner: false, isWritable: false },
      { pubkey: printTrade, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: mpg.feeModelProgramId, isSigner: false, isWritable: false },
      { pubkey: mpg.feeModelConfigurationAcct, isSigner: false, isWritable: false },
      { pubkey: mpg.feeOutputRegister, isSigner: false, isWritable: true },
      { pubkey: mpg.riskEngineProgramId, isSigner: false, isWritable: false },
      { pubkey: mpg.riskModelConfigurationAcct, isSigner: false, isWritable: false },
      { pubkey: mpg.riskOutputRegister, isSigner: false, isWritable: true },
      { pubkey: riskAndFeeSigner, isSigner: false, isWritable: false },
      { pubkey: trgCreator.feeStateAccount, isSigner: false, isWritable: true },
      { pubkey: trgCreator.riskStateAccount, isSigner: false, isWritable: true },
      { pubkey: trgCounterparty.feeStateAccount, isSigner: false, isWritable: true },
      { pubkey: trgCounterparty.riskStateAccount, isSigner: false, isWritable: true },
      { pubkey: manifest.getRiskS(mpgPubkey), isSigner: false, isWritable: true },
      { pubkey: manifest.getRiskR(mpgPubkey), isSigner: false, isWritable: true },
      { pubkey: manifest.getMarkPricesAccount(mpgPubkey), isSigner: false, isWritable: true },
    ];
  }
}

export class HxroProxy {
  private constructor(
    private context: Context,
    public hxroContext: {
      manifest: any;
      dexProgram: any;
      mpg: any;
      trgTaker: { publicKey: PublicKey } & any;
      trgMaker: { publicKey: PublicKey } & any;
      trgDao: { publicKey: PublicKey } & any;
      printTrade: PublicKey;
      riskAndFeeSigner: PublicKey;
    }
  ) {}

  static async create(context: Context) {
    const manifest = await dexterity.getManifest(
      context.provider.connection.rpcEndpoint,
      true,
      new Wallet(context.dao)
    );
    const dexProgram = manifest.fields.dexProgram;

    const createTrg = async (keypair: Keypair) => {
      const manifest = await dexterity.getManifest(context.provider.connection.rpcEndpoint, true, new Wallet(keypair));
      return await manifest.createTrg(mpgPubkey);
    };

    const [trgTakerKey, trgMakerKey, trgDaoKey] = await executeInParallel(
      () => createTrg(context.taker),
      () => createTrg(context.maker),
      () => createTrg(context.dao)
    );

    const [mpg, trgTaker, trgMaker, trgDao] = await executeInParallel(
      () => manifest.getMPG(mpgPubkey),
      () => manifest.getTRG(trgTakerKey),
      () => manifest.getTRG(trgMakerKey),
      () => manifest.getTRG(trgDaoKey)
    );
    const [printTrade] = PublicKey.findProgramAddressSync(
      [Buffer.from("print_trade"), productKey.toBuffer(), trgTakerKey.toBuffer(), trgMakerKey.toBuffer()],
      dexProgram.programId
    );

    return new HxroProxy(context, {
      manifest,
      dexProgram,
      mpg,
      trgTaker: { publicKey: trgTakerKey, ...trgTaker },
      trgMaker: { publicKey: trgMakerKey, ...trgMaker },
      trgDao: { publicKey: trgDaoKey, ...trgDao },
      printTrade,
      riskAndFeeSigner: dexterity.Manifest.GetRiskAndFeeSigner(mpgPubkey),
    });
  }
}
