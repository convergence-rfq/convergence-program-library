import { Program, Wallet, workspace, BN } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { Context, Response, Rfq, RiskEngine } from "../wrappers";
import { HxroPrintTradeProvider as HxroPrintTradeProviderIdl } from "../../../target/types/hxro_print_trade_provider";
import { AuthoritySide, InstrumentType, LegData, LegSide, QuoteData } from "../types";
import dexterity from "@hxronetwork/dexterity-ts";
import { executeInParallel } from "../helpers";
import { DEFAULT_LEG_AMOUNT, DEFAULT_LEG_SIDE, DEFAULT_MINT_DECIMALS, SOLANA_BASE_ASSET_INDEX } from "../constants";
import { getBaseAssetPda } from "../pdas";
import { RiskEngine as RiskEngineIdl } from "../../../target/types/risk_engine";

const configSeed = "config";

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
        baseAssetIndex: SOLANA_BASE_ASSET_INDEX,
        productIndex: 0,
      },
    ]
  ) {}

  static async addPrintTradeProvider(context: Context) {
    await context.addPrintTradeProvider(getHxroInstrumentProgram().programId, true);
  }

  static async initializeConfig(context: Context, validMpg: PublicKey) {
    await getHxroInstrumentProgram()
      .methods.initializeConfig(validMpg)
      .accounts({
        authority: context.dao.publicKey,
        protocol: context.protocolPda,
        config: this.getConfigAddress(),
        systemProgram: SystemProgram.programId,
      })
      .signers([context.dao])
      .rpc();
  }

  static getConfigAddress() {
    const program = getHxroInstrumentProgram();
    const [address] = PublicKey.findProgramAddressSync([Buffer.from(configSeed)], program.programId);
    return address;
  }

  getProgramId(): PublicKey {
    return getHxroInstrumentProgram().programId;
  }

  getLegData(): LegData[] {
    return this.legs.map((leg) => {
      const riskEngineData = serializeRiskEngineProduct(leg.productIndex);
      const productData = Buffer.from(Uint8Array.from([leg.productIndex]));

      return {
        settlementTypeMetadata: { printTrade: { instrumentType: InstrumentType.PerpFuture.index } },
        baseAssetIndex: { value: leg.baseAssetIndex },
        data: Buffer.concat([riskEngineData, productData]),
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
    const validationAccounts = this.legs
      .map((leg) => {
        const accountName = "product-" + String(leg.productIndex);
        const productAccountInfo = {
          pubkey: this.context.nameToPubkey[accountName],
          isSigner: false,
          isWritable: false,
        };
        const baseAssetAccountInfo = {
          pubkey: getBaseAssetPda(leg.baseAssetIndex, this.context.program.programId),
          isSigner: false,
          isWritable: false,
        };

        return [productAccountInfo, baseAssetAccountInfo];
      })
      .flat();

    return [
      { pubkey: this.getProgramId(), isSigner: false, isWritable: false },
      { pubkey: HxroPrintTradeProvider.getConfigAddress(), isSigner: false, isWritable: false },
      { pubkey: this.proxy.hxroContext.mpg.publicKey, isSigner: false, isWritable: false },
      ...validationAccounts,
    ];
  }

  getPreparePrintTradeSettlementAccounts(side: AuthoritySide, rfq: Rfq, response: Response) {
    return [{ pubkey: this.getProgramId(), isSigner: false, isWritable: false }];
  }

  getExecutePrintTradeSettlementAccounts(rfq: Rfq, response: Response) {
    // const { trgTaker, trgMaker, trgDao, printTrade, dexProgram, mpg, riskAndFeeSigner, manifest } =
    //   this.proxy.hxroContext;

    return [
      { pubkey: this.getProgramId(), isSigner: false, isWritable: false },
      // { pubkey: this.context.taker.publicKey, isSigner: true, isWritable: true },
      // { pubkey: this.context.maker.publicKey, isSigner: false, isWritable: true },
      // { pubkey: dexProgram.programId, isSigner: false, isWritable: false },
      // { pubkey: trgTaker.publicKey, isSigner: false, isWritable: true },
      // { pubkey: trgMaker.publicKey, isSigner: false, isWritable: true },
      // { pubkey: trgDao.publicKey, isSigner: false, isWritable: true },
      // { pubkey: mpgPubkey, isSigner: false, isWritable: true },
      // { pubkey: productKey, isSigner: false, isWritable: false },
      // { pubkey: printTrade, isSigner: false, isWritable: true },
      // { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      // { pubkey: mpg.feeModelProgramId, isSigner: false, isWritable: false },
      // { pubkey: mpg.feeModelConfigurationAcct, isSigner: false, isWritable: false },
      // { pubkey: mpg.feeOutputRegister, isSigner: false, isWritable: true },
      // { pubkey: mpg.riskEngineProgramId, isSigner: false, isWritable: false },
      // { pubkey: mpg.riskModelConfigurationAcct, isSigner: false, isWritable: false },
      // { pubkey: mpg.riskOutputRegister, isSigner: false, isWritable: true },
      // { pubkey: riskAndFeeSigner, isSigner: false, isWritable: false },
      // { pubkey: trgTaker.feeStateAccount, isSigner: false, isWritable: true },
      // { pubkey: trgTaker.riskStateAccount, isSigner: false, isWritable: true },
      // { pubkey: trgMaker.feeStateAccount, isSigner: false, isWritable: true },
      // { pubkey: trgMaker.riskStateAccount, isSigner: false, isWritable: true },
      // { pubkey: manifest.getRiskS(mpgPubkey), isSigner: false, isWritable: true },
      // { pubkey: manifest.getRiskR(mpgPubkey), isSigner: false, isWritable: true },
      // { pubkey: manifest.getMarkPricesAccount(mpgPubkey), isSigner: false, isWritable: true },
    ];
  }
}

function serializeRiskEngineProduct(productIndex: number) {
  const program = workspace.RiskEngine as Program<RiskEngineIdl>;

  if (productIndex == 0) {
    return program.coder.types.encode("FutureCommonData", {
      underlyingAmountPerContract: new BN(1),
      underlyingAmountPerContractDecimals: 0,
    });
  } else if (productIndex == 1) {
    return program.coder.types.encode("OptionCommonData", {
      optionType: { call: {} },
      underlyingAmountPerContract: new BN(1),
      underlyingAmountPerContractDecimals: 0,
      strikePrice: new BN(54323),
      strikePriceDecimals: 2,
      expirationTimestamp: new BN(1685404800 + 60 * 60 * 24 * 365 * 2),
    });
  } else {
    throw Error("Product missing!");
  }
}

export class HxroProxy {
  private constructor(
    private context: Context,
    public hxroContext: {
      manifest: any;
      dexProgram: any;
      mpg: { publicKey: PublicKey } & any;
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

    const mpgPubkey = context.nameToPubkey["mpg"];
    const trgDaoKey = context.nameToPubkey["operator-trg"];
    const trgTakerKey = context.nameToPubkey["taker-trg"];
    const trgMakerKey = context.nameToPubkey["maker-trg"];

    const [mpg, trgTaker, trgMaker, trgDao] = await executeInParallel(
      () => manifest.getMPG(mpgPubkey),
      () => manifest.getTRG(trgTakerKey),
      () => manifest.getTRG(trgMakerKey),
      () => manifest.getTRG(trgDaoKey)
    );
    const [printTrade] = PublicKey.findProgramAddressSync(
      [Buffer.from("print_trade"), trgTakerKey.toBuffer(), trgMakerKey.toBuffer()],
      dexProgram.programId
    );

    return new HxroProxy(context, {
      manifest,
      dexProgram,
      mpg: { publicKey: mpgPubkey, ...mpg },
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
