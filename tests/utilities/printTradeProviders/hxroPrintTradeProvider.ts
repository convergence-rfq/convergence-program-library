import { Program, Wallet, workspace, BN } from "@project-serum/anchor";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { Context, Mint, Response, Rfq } from "../wrappers";
import { HxroPrintTradeProvider as HxroPrintTradeProviderIdl } from "../../../target/types/hxro_print_trade_provider";
import { AuthoritySide, InstrumentType, LegData, LegSide, QuoteData } from "../types";
import dexterity from "@hxronetwork/dexterity-ts";
import { executeInParallel } from "../helpers";
import { BITCOIN_BASE_ASSET_INDEX, DEFAULT_LEG_AMOUNT, DEFAULT_LEG_SIDE, DEFAULT_MINT_DECIMALS } from "../constants";

export const productKey = new PublicKey("2Ez9E5xTbSH9zJjcHrwH71TAh85XXh2jd7sA5w7HkW2A");
export const mpgPubkey = new PublicKey("7Z1XJ8cRvVDYDDziL8kZW6W2SbFRoZhzmpeAEBoxwXxa");
export const cashMint = new PublicKey("HYuv5qxNmUpAVcm8u2rPCjjL2Sz5KHnVWsm56vYzZtjh");

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
    private legs: {
      amount: number;
      amountDecimals: number;
      side: LegSide;
      baseAssetIndex: number;
      productIndex: number;
    }[] = [
      {
        amount: DEFAULT_LEG_AMOUNT,
        amountDecimals: DEFAULT_MINT_DECIMALS,
        side: DEFAULT_LEG_SIDE,
        baseAssetIndex: BITCOIN_BASE_ASSET_INDEX,
        productIndex: 0,
      },
    ]
  ) {}

  static async addPrintTradeProvider(context: Context) {
    await context.addPrintTradeProvider(getHxroInstrumentProgram().programId, true, 0);
  }

  getProgramId(): PublicKey {
    return getHxroInstrumentProgram().programId;
  }

  getLegData(): LegData[] {
    return this.legs.map((leg) => {
      return {
        settlementTypeMetadata: { printTrade: { instrumentType: Number(InstrumentType.Spot) } },
        baseAssetIndex: { value: leg.baseAssetIndex },
        data: Buffer.from(Uint8Array.from([leg.productIndex])),
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
      decimals: DEFAULT_MINT_DECIMALS,
    };
  }

  getBaseAssetIndexes(): number[] {
    return this.legs.map((leg) => leg.baseAssetIndex);
  }

  getValidationAccounts() {
    return [{ pubkey: this.getProgramId(), isSigner: false, isWritable: false }];
  }

  getPreparePrintTradeSettlementAccounts(side: AuthoritySide, rfq: Rfq, response: Response) {
    return [{ pubkey: this.getProgramId(), isSigner: false, isWritable: false }];
  }

  getExecutePrintTradeSettlementAccounts(rfq: Rfq, response: Response) {
    const { trgTaker, trgMaker, trgDao, printTrade, dexProgram, mpg, riskAndFeeSigner, manifest } =
      this.proxy.hxroContext;

    return [
      { pubkey: this.getProgramId(), isSigner: false, isWritable: false },
      { pubkey: this.context.taker.publicKey, isSigner: true, isWritable: true },
      { pubkey: this.context.maker.publicKey, isSigner: false, isWritable: true },
      { pubkey: dexProgram.programId, isSigner: false, isWritable: false },
      { pubkey: trgTaker.publicKey, isSigner: false, isWritable: true },
      { pubkey: trgMaker.publicKey, isSigner: false, isWritable: true },
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
      { pubkey: trgTaker.feeStateAccount, isSigner: false, isWritable: true },
      { pubkey: trgTaker.riskStateAccount, isSigner: false, isWritable: true },
      { pubkey: trgMaker.feeStateAccount, isSigner: false, isWritable: true },
      { pubkey: trgMaker.riskStateAccount, isSigner: false, isWritable: true },
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
      const trgKey = await manifest.createTrg(mpgPubkey);
      const trader = new dexterity.Trader(manifest, trgKey);
      trader.marketProductGroup = mpgPubkey;
      trader.mpg = await manifest.getMPG(mpgPubkey);
      await trader.deposit(dexterity.Fractional.New(10_000_000, 0));
      return trgKey;
    };

    const mint = await Mint.loadExisting(context, cashMint);
    await executeInParallel(
      () => mint.createAssociatedAccountWithTokens(context.taker.publicKey),
      () => mint.createAssociatedAccountWithTokens(context.maker.publicKey),
      () => mint.createAssociatedAccountWithTokens(context.dao.publicKey)
    );

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

  async getBalance(party: "taker" | "maker" | "dao") {
    const { manifest, trgTaker, trgMaker, trgDao } = this.hxroContext;
    let trg;
    if (party == "taker") {
      trg = trgTaker;
    } else if (party == "maker") {
      trg = trgMaker;
    } else {
      trg = trgDao;
    }
    const updatedTrg = await manifest.getTRG(trg.publicKey);

    return {
      positions: updatedTrg.traderPositions.map((x: any) =>
        dexterity.Fractional.From(x.position).toDecimal()
      ) as number[],
      cashBalance: dexterity.Fractional.From(updatedTrg.cashBalance).toDecimal(),
    };
  }
}
