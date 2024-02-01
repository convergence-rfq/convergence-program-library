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
import { expect } from "chai";

export const hxroDecimals = 9;

export const DEFAULT_SETTLEMENT_OUTCOME = { price: "100", legs: ["-10"] };

const configSeed = "config";
const operatorSeed = "operator";
const lockedCollateralRecordSeed = "locked_collateral_record";

const trgSize = 64336;

export const toHxroAmount = (value: number) => value * 10 ** hxroDecimals;

let hxroPrintTradeProviderProgram: Program<HxroPrintTradeProviderIdl> | null = null;
export function getHxroProviderProgram(): Program<HxroPrintTradeProviderIdl> {
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
    await context.addPrintTradeProvider(getHxroProviderProgram().programId, 2, true);
  }

  static async initializeConfig(context: Context, validMpg: PublicKey) {
    await getHxroProviderProgram()
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
      [mpg.toBuffer(), trg.publicKey.toBuffer(), feeModelConfig.toBuffer()],
      feesProgram
    );

    const lamports = await context.provider.connection.getMinimumBalanceForRentExemption(trgSize);
    const createAccountIx = SystemProgram.createAccount({
      fromPubkey: context.dao.publicKey,
      newAccountPubkey: trg.publicKey,
      lamports,
      space: trgSize,
      programId: dexProgram,
    });

    const sendSolIx = SystemProgram.transfer({
      fromPubkey: context.dao.publicKey,
      toPubkey: this.getOperatorAddress(),
      lamports: 1 * 10 ** 9, // 1 sol
    });

    await getHxroProviderProgram()
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
    const program = getHxroProviderProgram();
    const [address] = PublicKey.findProgramAddressSync([Buffer.from(configSeed)], program.programId);
    return address;
  }

  static getOperatorAddress() {
    const program = getHxroProviderProgram();
    const [address] = PublicKey.findProgramAddressSync([Buffer.from(operatorSeed)], program.programId);
    return address;
  }

  static getLockedCollateralRecordAddress(user: PublicKey, response: PublicKey) {
    const program = getHxroProviderProgram();
    const [address] = PublicKey.findProgramAddressSync(
      [Buffer.from(lockedCollateralRecordSeed), user.toBuffer(), response.toBuffer()],
      program.programId
    );
    return address;
  }

  getProgramId(): PublicKey {
    return getHxroProviderProgram().programId;
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
      data: Buffer.from(this.hxroContext.trgTaker.publicKey.toBytes()),
      decimals: hxroDecimals,
    };
  }

  getResponseData(): Buffer {
    return Buffer.from(this.hxroContext.trgMaker.publicKey.toBytes());
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
      { pubkey: this.hxroContext.trgTaker.publicKey, isSigner: false, isWritable: false },
      ...validationAccounts,
    ];
  }

  getValidateResponseAccounts() {
    return [
      { pubkey: this.getProgramId(), isSigner: false, isWritable: false },
      { pubkey: HxroPrintTradeProvider.getConfigAddress(), isSigner: false, isWritable: false },
      { pubkey: this.hxroContext.trgMaker.publicKey, isSigner: false, isWritable: false },
    ];
  }

  async executePrePreparePrintTradeSettlement(
    side: AuthoritySide,
    rfq: Rfq,
    response: Response,
    expectedSettlement: SettlementOutcome
  ) {
    await this.manageCollateral("lock", side, expectedSettlement);

    if (response.firstToPrepare !== null) {
      await this.signPrintTrade(side, response, expectedSettlement);
    }
  }

  async unlockCollateralAndRemoveRecord(side: AuthoritySide, rfq: Rfq, response: Response) {
    const { taker, maker } = this.context;
    const user = side == AuthoritySide.Taker ? taker : maker;
    const lockRecord = HxroPrintTradeProvider.getLockedCollateralRecordAddress(user.publicKey, response.account);
    const lockRecordData = await getHxroProviderProgram().account.lockedCollateralRecord.fetch(lockRecord);

    const locksByLegs = lockRecordData.locks.map((x) => x.size);

    await this.manageCollateralByLocks("unlock", side, locksByLegs);

    await getHxroProviderProgram()
      .methods.removeLockedCollateralRecord()
      .accountsStrict({
        user: user.publicKey,
        lockedCollateralRecord: lockRecord,
      })
      .signers([user])
      .rpc();
  }

  async manageCollateral(action: "lock" | "unlock", side: AuthoritySide, expectedSettlement: SettlementOutcome) {
    if (side === AuthoritySide.Maker) {
      expectedSettlement = inverseExpectedSettlement(expectedSettlement);
    }

    const fractionalSettlement = convertExpectedSettlementToFractional(expectedSettlement);

    await this.manageCollateralByLocks(action, side, fractionalSettlement.legs);
  }

  async manageCollateralByLocks(action: "lock" | "unlock", side: AuthoritySide, locksByLegs: { m: BN; exp: BN }[]) {
    const { taker, maker } = this.context;
    const { mpg, trgTaker, trgMaker, latestDexProgram, riskAndFeeSigner } = this.hxroContext;
    const [user, userTrg] = side == AuthoritySide.Taker ? [taker, trgTaker] : [maker, trgMaker];

    const products = [];
    for (let i = 0; i < 6; i++) {
      if (i < this.legs.length) {
        const leg = this.legs[i];
        products.push({
          productIndex: new BN(leg.productIndex),
          size: locksByLegs[i],
        });
      } else {
        products.push({ productIndex: new BN(0), size: { m: new BN(0), exp: new BN(0) } });
      }
    }

    const method = action === "lock" ? "lockCollateral" : "unlockCollateral";
    await latestDexProgram.methods[method]({
      numProducts: new BN(this.legs.length),
      products,
    })
      .accounts({
        user: user.publicKey,
        traderRiskGroup: userTrg.publicKey,
        marketProductGroup: mpg.publicKey,
        feeModelProgram: mpg.feeModelProgramId,
        feeModelConfigurationAcct: mpg.feeModelConfigurationAcct,
        feeOutputRegister: mpg.feeOutputRegister,
        riskEngineProgram: mpg.riskEngineProgramId,
        riskModelConfigurationAcct: mpg.riskModelConfigurationAcct,
        riskOutputRegister: mpg.riskOutputRegister,
        riskAndFeeSigner,
        feeStateAcct: userTrg.feeStateAccount,
        riskStateAcct: userTrg.riskStateAccount,
      })
      .remainingAccounts([
        { pubkey: this.hxroContext.getCovarianceAddress(), isSigner: false, isWritable: true },
        { pubkey: this.hxroContext.getCorrelationAddress(), isSigner: false, isWritable: true },
        { pubkey: this.hxroContext.getMarkPricesAddress(), isSigner: false, isWritable: true },
      ])
      .signers([user])
      .rpc();
  }

  async cancelPrintTrade(response: Response, canceler: AuthoritySide) {
    const { taker, maker } = this.context;
    const { mpg, trgTaker, trgMaker, trgOperator, latestDexProgram } = this.hxroContext;
    const user = canceler == AuthoritySide.Taker ? taker : maker;

    if (response.firstToPrepare === null) {
      throw new Error("Print trade not yet created");
    }
    const [creatorTrg, counterpartyTrg] = response.firstToPrepare.equals(taker.publicKey)
      ? [trgTaker, trgMaker]
      : [trgMaker, trgTaker];

    const printTrade = this.hxroContext.getPrintTradeAddress(
      response.account,
      creatorTrg.publicKey,
      counterpartyTrg.publicKey
    );

    await latestDexProgram.methods
      .cancelPrintTrade()
      .accounts({
        user: user.publicKey,
        creator: creatorTrg.publicKey,
        counterparty: counterpartyTrg.publicKey,
        operator: trgOperator.publicKey,
        marketProductGroup: mpg.publicKey,
        printTrade: printTrade,
        systemProgram: SystemProgram.programId,
        seed: response.account,
      })
      .signers([user])
      .rpc();
  }

  async signPrintTrade(side: AuthoritySide, response: Response, expectedSettlement: SettlementOutcome) {
    const { taker, maker } = this.context;
    const { mpg, trgTaker, trgMaker, latestDexProgram, trgOperator, riskAndFeeSigner } = this.hxroContext;

    const [user, userTrg, creatorTrg] =
      side === AuthoritySide.Taker ? [taker, trgTaker, trgMaker] : [maker, trgMaker, trgTaker];

    const printTrade = this.hxroContext.getPrintTradeAddress(response.account, creatorTrg.publicKey, userTrg.publicKey);

    const fractionalSettlement = convertExpectedSettlementToFractional(expectedSettlement);
    fractionalSettlement.price.m = fractionalSettlement.price.m.neg();

    const products = [];
    for (let i = 0; i < 6; i++) {
      if (i < this.legs.length) {
        const leg = this.legs[i];
        products.push({
          productIndex: new BN(leg.productIndex),
          size: fractionalSettlement.legs[i],
        });
      } else {
        products.push({ productIndex: new BN(0), size: { m: new BN(0), exp: new BN(0) } });
      }
    }

    const printTradeSide = side === AuthoritySide.Taker ? { bid: {} } : { ask: {} };

    await latestDexProgram.methods
      .signPrintTrade({
        numProducts: new BN(this.legs.length),
        products,
        operatorCounterpartyFeeProportion: { m: new BN(0), exp: new BN(0) },
        operatorCreatorFeeProportion: { m: new BN(0), exp: new BN(0) },
        price: fractionalSettlement.price,
        side: printTradeSide,
      })
      .accountsStrict({
        user: user.publicKey,
        creator: creatorTrg.publicKey,
        counterparty: userTrg.publicKey,
        operator: trgOperator.publicKey,
        marketProductGroup: mpg.publicKey,
        printTrade: printTrade,
        systemProgram: SystemProgram.programId,
        feeModelProgram: mpg.feeModelProgramId,
        feeModelConfigurationAcct: mpg.feeModelConfigurationAcct,
        feeOutputRegister: mpg.feeOutputRegister,
        riskEngineProgram: mpg.riskEngineProgramId,
        riskModelConfigurationAcct: mpg.riskModelConfigurationAcct,
        riskOutputRegister: mpg.riskOutputRegister,
        riskAndFeeSigner,
        creatorTraderFeeStateAcct: creatorTrg.feeStateAccount,
        creatorTraderRiskStateAcct: creatorTrg.riskStateAccount,
        counterpartyTraderFeeStateAcct: userTrg.feeStateAccount,
        counterpartyTraderRiskStateAcct: userTrg.riskStateAccount,
        seed: response.account,
      })
      .signers([user])
      .rpc();
  }

  getPreparePrintTradeSettlementAccounts(side: AuthoritySide, rfq: Rfq, response: Response) {
    const { mpg, trgTaker, trgMaker, trgOperator, dexProgram } = this.hxroContext;
    const { taker, maker } = this.context;
    const user = side == AuthoritySide.Taker ? taker.publicKey : maker.publicKey;
    const [userTrg, counterpartyTrg] = side == AuthoritySide.Taker ? [trgTaker, trgMaker] : [trgMaker, trgTaker];

    let printTrade;
    if (response.firstToPrepare === null) {
      printTrade = this.hxroContext.getPrintTradeAddress(
        response.account,
        userTrg.publicKey,
        counterpartyTrg.publicKey
      );
    } else {
      printTrade = this.hxroContext.getPrintTradeAddress(
        response.account,
        counterpartyTrg.publicKey,
        userTrg.publicKey
      );
    }

    return [
      { pubkey: this.getProgramId(), isSigner: false, isWritable: false },
      {
        pubkey: HxroPrintTradeProvider.getLockedCollateralRecordAddress(user, response.account),
        isSigner: false,
        isWritable: true,
      },
      { pubkey: HxroPrintTradeProvider.getOperatorAddress(), isSigner: false, isWritable: false },
      { pubkey: HxroPrintTradeProvider.getConfigAddress(), isSigner: false, isWritable: false },
      { pubkey: dexProgram.programId, isSigner: false, isWritable: false },
      { pubkey: mpg.publicKey, isSigner: false, isWritable: true },
      { pubkey: user, isSigner: true, isWritable: false },
      { pubkey: trgTaker.publicKey, isSigner: false, isWritable: true },
      { pubkey: trgMaker.publicKey, isSigner: false, isWritable: true },
      { pubkey: trgOperator.publicKey, isSigner: false, isWritable: true },
      { pubkey: printTrade, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ];
  }

  getExecutePrintTradeSettlementAccounts(rfq: Rfq, response: Response) {
    const {
      taker: { publicKey: taker },
      maker: { publicKey: maker },
    } = this.context;
    const { mpg, trgTaker, trgMaker, trgOperator, dexProgram, executionOutput, riskAndFeeSigner } = this.hxroContext;

    const [creatorTrg, counterpartyTrg] = response.firstToPrepare?.equals(this.context.taker.publicKey)
      ? [trgTaker, trgMaker]
      : [trgMaker, trgTaker];
    let printTrade = this.hxroContext.getPrintTradeAddress(
      response.account,
      creatorTrg.publicKey,
      counterpartyTrg.publicKey
    );

    return [
      { pubkey: this.getProgramId(), isSigner: false, isWritable: false },
      { pubkey: taker, isSigner: false, isWritable: true },
      { pubkey: maker, isSigner: false, isWritable: true },
      {
        pubkey: HxroPrintTradeProvider.getLockedCollateralRecordAddress(taker, response.account),
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: HxroPrintTradeProvider.getLockedCollateralRecordAddress(maker, response.account),
        isSigner: false,
        isWritable: true,
      },
      { pubkey: HxroPrintTradeProvider.getOperatorAddress(), isSigner: false, isWritable: true },
      { pubkey: HxroPrintTradeProvider.getConfigAddress(), isSigner: false, isWritable: false },
      { pubkey: dexProgram.programId, isSigner: false, isWritable: false },
      { pubkey: mpg.publicKey, isSigner: false, isWritable: true },
      { pubkey: trgTaker.publicKey, isSigner: false, isWritable: true },
      { pubkey: trgMaker.publicKey, isSigner: false, isWritable: true },
      { pubkey: trgOperator.publicKey, isSigner: false, isWritable: true },
      { pubkey: printTrade, isSigner: false, isWritable: true },
      { pubkey: executionOutput, isSigner: false, isWritable: true },
      { pubkey: mpg.feeModelProgramId, isSigner: false, isWritable: false },
      { pubkey: mpg.feeModelConfigurationAcct, isSigner: false, isWritable: false },
      { pubkey: mpg.feeOutputRegister, isSigner: false, isWritable: true },
      { pubkey: mpg.riskEngineProgramId, isSigner: false, isWritable: false },
      { pubkey: mpg.riskModelConfigurationAcct, isSigner: false, isWritable: false },
      { pubkey: mpg.riskOutputRegister, isSigner: false, isWritable: true },
      { pubkey: riskAndFeeSigner, isSigner: false, isWritable: false },
      { pubkey: creatorTrg.feeStateAccount, isSigner: false, isWritable: true },
      { pubkey: creatorTrg.riskStateAccount, isSigner: false, isWritable: true },
      { pubkey: counterpartyTrg.feeStateAccount, isSigner: false, isWritable: true },
      { pubkey: counterpartyTrg.riskStateAccount, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ];
  }

  getRevertPrintTradeSettlementPreparationAccounts(rfq: Rfq, response: Response, side: AuthoritySide) {
    const lockRecordOwner = side === AuthoritySide.Taker ? this.context.taker.publicKey : this.context.maker.publicKey;
    return [
      { pubkey: this.getProgramId(), isSigner: false, isWritable: false },
      {
        pubkey: HxroPrintTradeProvider.getLockedCollateralRecordAddress(lockRecordOwner, response.account),
        isSigner: false,
        isWritable: true,
      },
    ];
  }

  getCleanUpPrintTradeSettlementAccounts(rfq: Rfq, response: Response) {
    const { mpg, trgTaker, trgMaker, trgOperator, dexProgram } = this.hxroContext;

    const [creator, creatorTrg, counterpartyTrg] = response.firstToPrepare?.equals(this.context.taker.publicKey)
      ? [this.context.taker, trgTaker, trgMaker]
      : [this.context.maker, trgMaker, trgTaker];
    let printTrade = this.hxroContext.getPrintTradeAddress(
      response.account,
      creatorTrg.publicKey,
      counterpartyTrg.publicKey
    );

    return [
      { pubkey: this.getProgramId(), isSigner: false, isWritable: false },
      { pubkey: HxroPrintTradeProvider.getOperatorAddress(), isSigner: false, isWritable: true },
      { pubkey: HxroPrintTradeProvider.getConfigAddress(), isSigner: false, isWritable: false },
      { pubkey: dexProgram.programId, isSigner: false, isWritable: false },
      { pubkey: mpg.publicKey, isSigner: false, isWritable: true },
      { pubkey: trgTaker.publicKey, isSigner: false, isWritable: true },
      { pubkey: trgMaker.publicKey, isSigner: false, isWritable: true },
      { pubkey: trgOperator.publicKey, isSigner: false, isWritable: true },
      { pubkey: printTrade, isSigner: false, isWritable: true },
      { pubkey: creator.publicKey, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ];
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
      instrumentType: InstrumentType.PerpFuture,
      data: program.coder.types.encode("FutureCommonData", {
        underlyingAmountPerContract: new BN(1),
        underlyingAmountPerContractDecimals: 0,
      }),
    };
    // return {
    //   instrumentType: InstrumentType.Option,
    //   data: program.coder.types.encode("OptionCommonData", {
    //     optionType: { put: {} },
    //     underlyingAmountPerContract: new BN(1),
    //     underlyingAmountPerContractDecimals: 0,
    //     strikePrice: new BN(122345),
    //     strikePriceDecimals: 4,
    //     expirationTimestamp: new BN(1685404800 + 60 * 60 * 24 * 365 * 2),
    //   }),
    // };
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

  const idl = await import("../../dependencies/hxro/dex.json");
  // @ts-ignore
  const RISK_IDL: Idl = idl;
  const latestDexProgram = new Program(RISK_IDL, dexProgram.programId, context.provider);

  const mpgKey = context.nameToPubkey["mpg"];
  const trgTakerKey = context.nameToPubkey["taker-trg"];
  const trgMakerKey = context.nameToPubkey["maker-trg"];
  const executionOutput = context.nameToPubkey["execution-output"];

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
    dexProgram,
    latestDexProgram,
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
    executionOutput,

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

    getPrintTradeAddress: (response: PublicKey, creator: PublicKey, counterparty: PublicKey) => {
      const [result] = PublicKey.findProgramAddressSync(
        [Buffer.from("print_trade"), creator.toBuffer(), counterparty.toBuffer(), response.toBuffer()],
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
        legs: newTakerSnapshot.positions
          .slice(0, 2)
          .map((value, index) => value.minus(takerSnapshot.positions[index]).toString()),
        price: newTakerSnapshot.cashBalance.minus(takerSnapshot.cashBalance).toString(),
      },
      maker: {
        legs: newMakerSnapshot.positions
          .slice(0, 2)
          .map((value, index) => value.minus(makerSnapshot.positions[index]).toString()),
        price: newMakerSnapshot.cashBalance.minus(makerSnapshot.cashBalance).toString(),
      },
    };
  };

  return {
    takerSnapshot,
    makerSnapshot,
    measureDifference,
  };
}

export type SettlementOutcome = {
  price: string;
  legs: string[];
};

export const inverseExpectedSettlement = (value: SettlementOutcome): SettlementOutcome => {
  return {
    price: new BigNumber(value.price).negated().toString(),
    legs: value.legs.map((x) => new BigNumber(x).negated().toString()),
  };
};

export const convertExpectedSettlementToFractional = (value: SettlementOutcome) => {
  const toFractional = (val: string) => {
    const multiplier = new BigNumber(10).pow(9);
    const m = new BigNumber(val).multipliedBy(multiplier).toString();

    return {
      m: new BN(m),
      exp: new BN(9),
    };
  };

  return {
    price: toFractional(value.price),
    legs: value.legs.map((x) => toFractional(x)),
  };
};

export const assertSettlementOutcome = (expected: SettlementOutcome, received: SettlementOutcome) => {
  expect(expected.legs).to.deep.equal(received.legs);
  expect(Number(expected.price)).to.be.approximately(Number(received.price), Math.abs(Number(received.price) / 100));
};
