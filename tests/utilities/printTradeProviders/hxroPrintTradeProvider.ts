import { Program, Wallet, workspace, BN } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, Keypair } from "@solana/web3.js";
import { Context, Response, Rfq } from "../wrappers";
import { HxroPrintTradeProvider as HxroPrintTradeProviderIdl } from "../../../target/types/hxro_print_trade_provider";
import { AuthoritySide, InstrumentType, LegData, LegSide, QuoteData } from "../types";
import dexterity from "@hxronetwork/dexterity-ts";
import { executeInParallel } from "../helpers";
import { DEFAULT_LEG_SIDE, SOLANA_BASE_ASSET_INDEX } from "../constants";
import { getBaseAssetPda } from "../pdas";
import { RiskEngine as RiskEngineIdl } from "../../../target/types/risk_engine";
import { readHxroKeypair } from "../fixtures";
import BigNumber from "bignumber.js";

export const hxroDecimals = 9;

const configSeed = "config";
const operatorSeed = "operator";

const trgSize = 64272;
const trgLamports = 448224000;

export const toHxroAmount = (value: number) => value * 10 ** hxroDecimals;

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
    private hxroContext: HxroContext,
    private legs: {
      amount: number;
      side: LegSide;
      baseAssetIndex: number;
      productIndex: number;
    }[] = [
      {
        amount: 10,
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

  static async initializeOperatorTraderRiskGroup(
    context: Context,
    nameToPubkey: { [name: string]: PublicKey },
    trg: Keypair,
    trgRiskState: Keypair
  ) {
    const mpg = nameToPubkey["mpg"];
    const feeModelConfig = nameToPubkey["fee-config"];
    const dexProgram = nameToPubkey["dex-program"];
    const riskProgram = nameToPubkey["risk-program"];
    const feesProgram = nameToPubkey["fees-program"];

    const [traderFeeStateAcct] = PublicKey.findProgramAddressSync(
      [Buffer.from("trader_fee_acct"), trg.publicKey.toBuffer(), mpg.toBuffer()],
      feesProgram
    );

    const createAccountIx = SystemProgram.createAccount({
      fromPubkey: context.dao.publicKey,
      newAccountPubkey: trg.publicKey,
      lamports: trgLamports,
      space: trgSize,
      programId: dexProgram,
    });

    const sendSolIx = SystemProgram.transfer({
      fromPubkey: context.dao.publicKey,
      toPubkey: this.getOperatorAddress(),
      lamports: 1 * 10 ** 9, // 1 sol
    });

    await getHxroInstrumentProgram()
      .methods.initializeOperatorTraderRiskGroup()
      .accounts({
        authority: context.dao.publicKey,
        protocol: context.protocolPda,
        config: this.getConfigAddress(),
        marketProductGroup: mpg,
        operator: this.getOperatorAddress(),
        dex: dexProgram,
        operatorTrg: trg.publicKey,
        riskAndFeeSigner: dexterity.Manifest.GetRiskAndFeeSigner(mpg),
        traderRiskStateAcct: trgRiskState.publicKey,
        traderFeeStateAcct,
        riskEngineProgram: riskProgram,
        feeModelConfigAcct: feeModelConfig,
        feeModelProgram: feesProgram,
        systemProgram: SystemProgram.programId,
      })
      .preInstructions([createAccountIx, sendSolIx])
      .signers([context.dao, trg, trgRiskState])
      .rpc({ skipPreflight: true });
  }

  static getConfigAddress() {
    const program = getHxroInstrumentProgram();
    const [address] = PublicKey.findProgramAddressSync([Buffer.from(configSeed)], program.programId);
    return address;
  }

  static getOperatorAddress() {
    const program = getHxroInstrumentProgram();
    const [address] = PublicKey.findProgramAddressSync([Buffer.from(operatorSeed)], program.programId);
    return address;
  }

  getProgramId(): PublicKey {
    return getHxroInstrumentProgram().programId;
  }

  getLegData(): LegData[] {
    return this.legs.map((leg) => {
      const { data: riskEngineData, instrumentType } = getProductInfo(leg.productIndex);
      const productData = Buffer.from(Uint8Array.from([leg.productIndex]));

      return {
        settlementTypeMetadata: { printTrade: { instrumentType: instrumentType.index } },
        baseAssetIndex: { value: leg.baseAssetIndex },
        data: Buffer.concat([riskEngineData, productData]),
        amount: new BN(toHxroAmount(leg.amount)),
        amountDecimals: hxroDecimals,
        side: leg.side,
      };
    });
  }

  getQuoteData(): QuoteData {
    return {
      settlementTypeMetadata: { printTrade: { instrumentType: Number(InstrumentType.Spot) } },
      data: Buffer.from([]),
      decimals: hxroDecimals,
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
      { pubkey: this.hxroContext.mpg.publicKey, isSigner: false, isWritable: false },
      ...validationAccounts,
    ];
  }

  getPreparePrintTradeSettlementAccounts(side: AuthoritySide, rfq: Rfq, response: Response) {
    const { mpg, trgTaker, trgMaker, trgOperator, dexProgram, riskAndFeeSigner } = this.hxroContext;
    const { taker, maker } = this.context;
    const user = side == AuthoritySide.Taker ? taker.publicKey : maker.publicKey;
    const [userTrg, counterpartyTrg] = side == AuthoritySide.Taker ? [trgTaker, trgMaker] : [trgMaker, trgTaker];

    let printTrade;
    if (response.firstToPrepare === null) {
      printTrade = this.hxroContext.getPrintTradeAddress(userTrg.publicKey, counterpartyTrg.publicKey);
    } else {
      printTrade = this.hxroContext.getPrintTradeAddress(counterpartyTrg.publicKey, userTrg.publicKey);
    }

    return [
      { pubkey: this.getProgramId(), isSigner: false, isWritable: false },
      { pubkey: HxroPrintTradeProvider.getOperatorAddress(), isSigner: false, isWritable: false },
      { pubkey: HxroPrintTradeProvider.getConfigAddress(), isSigner: false, isWritable: false },
      { pubkey: dexProgram.programId, isSigner: false, isWritable: false },
      { pubkey: mpg.publicKey, isSigner: false, isWritable: true },
      { pubkey: user, isSigner: true, isWritable: false },
      { pubkey: userTrg.publicKey, isSigner: false, isWritable: true },
      { pubkey: counterpartyTrg.publicKey, isSigner: false, isWritable: true },
      { pubkey: trgOperator.publicKey, isSigner: false, isWritable: true },
      { pubkey: printTrade, isSigner: false, isWritable: true },
      { pubkey: mpg.feeModelProgramId, isSigner: false, isWritable: false },
      { pubkey: mpg.feeModelConfigurationAcct, isSigner: false, isWritable: false },
      { pubkey: mpg.feeOutputRegister, isSigner: false, isWritable: true },
      { pubkey: mpg.riskEngineProgramId, isSigner: false, isWritable: false },
      { pubkey: mpg.riskModelConfigurationAcct, isSigner: false, isWritable: false },
      { pubkey: mpg.riskOutputRegister, isSigner: false, isWritable: true },
      { pubkey: riskAndFeeSigner, isSigner: false, isWritable: false },
      { pubkey: userTrg.feeStateAccount, isSigner: false, isWritable: true },
      { pubkey: userTrg.riskStateAccount, isSigner: false, isWritable: true },
      { pubkey: counterpartyTrg.feeStateAccount, isSigner: false, isWritable: true },
      { pubkey: counterpartyTrg.riskStateAccount, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: this.hxroContext.getCovarianceAddress(), isSigner: false, isWritable: true },
      { pubkey: this.hxroContext.getCorrelationAddress(), isSigner: false, isWritable: true },
      { pubkey: this.hxroContext.getMarkPricesAddress(), isSigner: false, isWritable: true },
    ];
  }

  getExecutePrintTradeSettlementAccounts(rfq: Rfq, response: Response) {
    return [{ pubkey: this.getProgramId(), isSigner: false, isWritable: false }];
  }

  getRevertPrintTradeSettlementPreparationAccounts(rfq: Rfq, response: Response) {
    return [{ pubkey: this.getProgramId(), isSigner: false, isWritable: false }];
  }

  getCleanUpPrintTradeSettlementAccounts(rfq: Rfq, response: Response) {
    return [{ pubkey: this.getProgramId(), isSigner: false, isWritable: false }];
  }
}

function getProductInfo(productIndex: number) {
  const program = workspace.RiskEngine as Program<RiskEngineIdl>;

  if (productIndex == 0) {
    return {
      instrumentType: InstrumentType.PerpFuture,
      data: program.coder.types.encode("FutureCommonData", {
        underlyingAmountPerContract: new BN(1),
        underlyingAmountPerContractDecimals: 0,
      }),
    };
  } else if (productIndex == 1) {
    return {
      instrumentType: InstrumentType.Option,
      data: program.coder.types.encode("OptionCommonData", {
        optionType: { put: {} },
        underlyingAmountPerContract: new BN(1),
        underlyingAmountPerContractDecimals: 0,
        strikePrice: new BN(122345),
        strikePriceDecimals: 4,
        expirationTimestamp: new BN(1685404800 + 60 * 60 * 24 * 365 * 2),
      }),
    };
  } else {
    throw Error("Product missing!");
  }
}

let trgOperatorKey: PublicKey | null = null;

export async function initializeOperatorTraderRiskGroup(context: Context) {
  const operatorTrg = await readHxroKeypair("operator-trg");
  const operatorTrgRiskState = await readHxroKeypair("operator-trg-risk-state");
  await HxroPrintTradeProvider.initializeOperatorTraderRiskGroup(
    context,
    context.nameToPubkey,
    operatorTrg,
    operatorTrgRiskState
  );

  trgOperatorKey = operatorTrg.publicKey;
}

export async function getHxroContext(context: Context) {
  // Disable console.debug to clean up clutter in the console
  const debug = console.debug;
  console.debug = () => {};
  const manifest = await dexterity.getManifest(context.provider.connection.rpcEndpoint, true, new Wallet(context.dao));
  console.debug = debug;

  const dexProgram = manifest.fields.dexProgram;

  const mpgKey = context.nameToPubkey["mpg"];
  const trgTakerKey = context.nameToPubkey["taker-trg"];
  const trgMakerKey = context.nameToPubkey["maker-trg"];

  if (trgOperatorKey === null) {
    await initializeOperatorTraderRiskGroup(context);
  }

  const [mpg, trgTaker, trgMaker] = await executeInParallel(
    () => manifest.getMPG(mpgKey),
    () => manifest.getTRG(trgTakerKey),
    () => manifest.getTRG(trgMakerKey)
  );

  return {
    mpg: {
      publicKey: mpgKey,
      feeModelProgramId: mpg.feeModelProgramId,
      feeModelConfigurationAcct: mpg.feeModelConfigurationAcct,
      feeOutputRegister: mpg.feeOutputRegister,
      riskEngineProgramId: mpg.riskEngineProgramId,
      riskModelConfigurationAcct: mpg.riskModelConfigurationAcct,
      riskOutputRegister: mpg.riskOutputRegister,
    },
    dexProgram: {
      programId: dexProgram.programId,
    },
    trgTaker: {
      publicKey: trgTakerKey,
      feeStateAccount: trgTaker.feeStateAccount,
      riskStateAccount: trgTaker.riskStateAccount,
    },
    trgMaker: {
      publicKey: trgMakerKey,
      feeStateAccount: trgMaker.feeStateAccount,
      riskStateAccount: trgMaker.riskStateAccount,
    },
    trgOperator: {
      publicKey: trgOperatorKey!,
    },
    riskAndFeeSigner: dexterity.Manifest.GetRiskAndFeeSigner(mpgKey),

    getBalance: async (party: "taker" | "maker") => {
      let trgKey: PublicKey;
      if (party == "taker") {
        trgKey = trgTakerKey;
      } else {
        trgKey = trgMakerKey;
      }

      const updatedTrg = await manifest.getTRG(trgKey);

      return {
        positions: updatedTrg.traderPositions.map(
          (x: any) => new BigNumber(dexterity.Fractional.From(x.position).toString())
        ) as BigNumber[],
        cashBalance: new BigNumber(dexterity.Fractional.From(updatedTrg.cashBalance).toString()),
      };
    },

    getPrintTradeAddress: (creator: PublicKey, counterparty: PublicKey) => {
      const [result] = PublicKey.findProgramAddressSync(
        [Buffer.from("print_trade"), creator.toBuffer(), counterparty.toBuffer()],
        dexProgram.programId
      );

      return result;
    },

    getCovarianceAddress: () => {
      const [result] = PublicKey.findProgramAddressSync([Buffer.from("s"), mpgKey.toBuffer()], mpg.riskEngineProgramId);

      return result;
    },

    getCorrelationAddress: () => {
      const [result] = PublicKey.findProgramAddressSync([Buffer.from("r"), mpgKey.toBuffer()], mpg.riskEngineProgramId);

      return result;
    },

    getMarkPricesAddress: () => {
      const [result] = PublicKey.findProgramAddressSync(
        [Buffer.from("mark_prices"), mpgKey.toBuffer()],
        mpg.riskEngineProgramId
      );

      return result;
    },
  };
}

type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;
export type HxroContext = UnwrapPromise<ReturnType<typeof getHxroContext>>;

export async function getPositionChangeMeasurer(hxroContext: HxroContext) {
  const takeSnapshot = () => Promise.all([hxroContext.getBalance("taker"), hxroContext.getBalance("maker")]);
  const [takerSnapshot, makerSnapshot] = await takeSnapshot();

  const measureDifference = async () => {
    const [newTakerSnapshot, newMakerSnapshot] = await takeSnapshot();

    return {
      taker: {
        positions: newTakerSnapshot.positions
          .slice(0, 2)
          .map((value, index) => value.minus(takerSnapshot.positions[index]).toString()),
        cashBalance: newTakerSnapshot.cashBalance.minus(takerSnapshot.cashBalance).toString(),
      },
      maker: {
        positions: newMakerSnapshot.positions
          .slice(0, 2)
          .map((value, index) => value.minus(makerSnapshot.positions[index]).toString()),
        cashBalance: newMakerSnapshot.cashBalance.minus(makerSnapshot.cashBalance).toString(),
      },
    };
  };

  return {
    takerSnapshot,
    makerSnapshot,
    measureDifference,
  };
}
