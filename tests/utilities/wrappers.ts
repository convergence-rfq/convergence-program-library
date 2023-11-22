import { BN, Program, workspace, AnchorProvider, setProvider } from "@coral-xyz/anchor";
import { PublicKey, Keypair, SystemProgram, SYSVAR_RENT_PUBKEY, Transaction, AccountMeta } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccount,
  mintTo,
  getAccount,
  createMint,
} from "@solana/spl-token";
import { Rfq as RfqIdl } from "../../target/types/rfq";
import { RiskEngine as RiskEngineIdl } from "../../target/types/risk_engine";
import {
  getBaseAssetPda,
  getCollateralInfoPda,
  getCollateralTokenPda,
  getMintInfoPda,
  getProtocolPda,
  getResponsePda,
  getRfqPda,
  getRiskEngineConfig,
} from "./pdas";
import {
  DEFAULT_ACTIVE_WINDOW,
  DEFAULT_ORDER_TYPE,
  DEFAULT_SETTLING_WINDOW,
  DEFAULT_TOKEN_AMOUNT,
  DEFAULT_PRICE,
  DEFAULT_LEG_MULTIPLIER,
  DEFAULT_MINT_DECIMALS,
  DEFAULT_COLLATERAL_FOR_FIXED_QUOTE_AMOUNT_RFQ,
  DEFAULT_MIN_COLLATERAL_REQUIREMENT,
  DEFAULT_SAFETY_PRICE_SHIFT_FACTOR,
  DEFAULT_OVERALL_SAFETY_FACTOR,
  DEFAULT_RISK_CATEGORIES_INFO,
  DEFAULT_ACCEPTED_ORACLE_STALENESS,
  DEFAULT_ACCEPTED_ORACLE_CONFIDENCE_INTERVAL_PORTION,
  DEFAULT_SETTLE_FEES,
  DEFAULT_DEFAULT_FEES,
  SWITCHBOARD_BTC_ORACLE,
  BITCOIN_BASE_ASSET_INDEX,
  SOLANA_BASE_ASSET_INDEX,
  PYTH_SOL_ORACLE,
  ETH_BASE_ASSET_INDEX,
} from "./constants";
import {
  AuthoritySide,
  Quote,
  QuoteSide,
  FixedSize,
  RiskCategory,
  InstrumentType,
  RiskCategoryInfo,
  OrderType,
  FeeParams,
  OracleSource,
  LegData,
  QuoteData,
} from "./types";
import { SpotInstrument } from "./instruments/spotInstrument";
import { InstrumentController } from "./instrument";
import {
  executeInParallel,
  expandComputeUnits,
  inversePubkeyToName,
  serializeLegData,
  serializeOptionQuote,
  toApiFeeParams,
  toBaseAssetAccount,
} from "./helpers";
import { loadPubkeyNaming, readKeypair } from "./fixtures";
import { PsyoptionsEuropeanInstrument } from "./instruments/psyoptionsEuropeanInstrument";
import { PsyoptionsAmericanInstrumentClass } from "./instruments/psyoptionsAmericanInstrument";
import { HxroPrintTradeProvider } from "./printTradeProviders/hxroPrintTradeProvider";

export class Context {
  public program: Program<RfqIdl>;
  public provider: AnchorProvider;
  public baseAssets: { [baseAssetIndex: number]: { oracleAddress: PublicKey | null } };

  public riskEngine!: RiskEngine;
  public protocolPda!: PublicKey;

  public dao!: Keypair;
  public taker!: Keypair;
  public maker!: Keypair;

  public btcToken!: Mint; // price is 20k$ in oracle
  public solToken!: Mint; // price is 30$ in oracle
  public ethToken!: Mint; // price is 2k$ in oracle
  public quoteToken!: Mint;
  public collateralToken!: CollateralMint;

  public pubkeyToName: { [pubkey: string]: string };
  public nameToPubkey: { [name: string]: PublicKey };

  constructor() {
    this.provider = AnchorProvider.env();
    setProvider(this.provider);
    this.program = workspace.Rfq as Program<RfqIdl>;
    this.baseAssets = {};

    this.pubkeyToName = {};
    this.nameToPubkey = {};
  }

  async basicInitialize() {
    this.riskEngine = await RiskEngine.create(this);
    this.protocolPda = getProtocolPda(this.program.programId);
  }

  async initializeFromFixtures() {
    await this.basicInitialize();

    await executeInParallel(
      async () => {
        this.pubkeyToName = await loadPubkeyNaming();
        this.nameToPubkey = inversePubkeyToName(this.pubkeyToName);
      },
      async () => (this.dao = await readKeypair("dao")),
      async () => (this.taker = await readKeypair("taker")),
      async () => (this.maker = await readKeypair("maker"))
    );

    await executeInParallel(
      async () =>
        (this.btcToken = await Mint.loadExisting(this, this.nameToPubkey["mint-btc"], true, BITCOIN_BASE_ASSET_INDEX)),
      async () =>
        (this.solToken = await Mint.loadExisting(this, this.nameToPubkey["mint-sol"], true, SOLANA_BASE_ASSET_INDEX)),
      async () =>
        (this.ethToken = await Mint.loadExisting(this, this.nameToPubkey["mint-eth"], true, ETH_BASE_ASSET_INDEX)),
      async () => (this.quoteToken = await Mint.loadExisting(this, this.nameToPubkey["mint-usd-quote"], true)),
      async () =>
        (this.collateralToken = await CollateralMint.loadExisting(this, this.nameToPubkey["mint-usd-collateral"]))
    );

    this.baseAssets[BITCOIN_BASE_ASSET_INDEX] = {
      oracleAddress: SWITCHBOARD_BTC_ORACLE,
    };
    this.baseAssets[SOLANA_BASE_ASSET_INDEX] = {
      oracleAddress: PYTH_SOL_ORACLE,
    };
    this.baseAssets[ETH_BASE_ASSET_INDEX] = { oracleAddress: null };
  }

  async initializeProtocol({ settleFees = DEFAULT_SETTLE_FEES, defaultFees = DEFAULT_DEFAULT_FEES } = {}) {
    await this.program.methods
      .initializeProtocol(toApiFeeParams(settleFees), toApiFeeParams(defaultFees))
      .accounts({
        signer: this.dao.publicKey,
        protocol: this.protocolPda,
        riskEngine: this.riskEngine.programId,
        collateralMint: this.collateralToken.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([this.dao])
      .rpc();
  }

  async addInstrument(
    programId: PublicKey,
    canBeUsedAsQuote: boolean,
    validateDataAccounts: number,
    prepareToSettleAccounts: number,
    settleAccounts: number,
    revertPreparationAccounts: number,
    cleanUpAccounts: number
  ) {
    await this.program.methods
      .addInstrument(
        canBeUsedAsQuote,
        validateDataAccounts,
        prepareToSettleAccounts,
        settleAccounts,
        revertPreparationAccounts,
        cleanUpAccounts
      )
      .accounts({
        authority: this.dao.publicKey,
        protocol: this.protocolPda,
        instrumentProgram: programId,
      })
      .signers([this.dao])
      .rpc();
  }

  async addPrintTradeProvider(programId: PublicKey, settlementCanExpire: boolean) {
    await this.program.methods
      .addPrintTradeProvider(settlementCanExpire)
      .accounts({
        authority: this.dao.publicKey,
        protocol: this.protocolPda,
        printTradeProviderProgram: programId,
      })
      .signers([this.dao])
      .rpc();
  }

  async addBaseAsset(
    baseAssetIndex: number,
    ticker: string,
    riskCategory: RiskCategory,
    oracleSource: OracleSource,
    switchboardOracle: PublicKey | null,
    pythOracle: PublicKey | null,
    inPlacePrice: number | null
  ) {
    const baseAssetPda = await getBaseAssetPda(baseAssetIndex, this.program.programId);

    await this.program.methods
      .addBaseAsset(
        { value: baseAssetIndex },
        ticker,
        riskCategory,
        oracleSource,
        switchboardOracle,
        pythOracle,
        inPlacePrice
      )
      .accounts({
        authority: this.dao.publicKey,
        protocol: this.protocolPda,
        baseAsset: baseAssetPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([this.dao])
      .rpc();

    const oracleAddress =
      oracleSource == OracleSource.Switchboard
        ? switchboardOracle
        : oracleSource == OracleSource.Pyth
        ? pythOracle
        : null;
    this.baseAssets[baseAssetIndex] = {
      oracleAddress,
    };

    return { baseAssetPda };
  }

  async changeProtocolFees({
    settleFees = null,
    defaultFees = null,
  }: { settleFees?: FeeParams | null; defaultFees?: FeeParams | null } = {}) {
    let serializedSettleFees = settleFees ? toApiFeeParams(settleFees) : null;
    let serializedDettleFees = defaultFees ? toApiFeeParams(defaultFees) : null;
    await this.program.methods
      .changeProtocolFees(serializedSettleFees, serializedDettleFees)
      .accounts({
        authority: this.dao.publicKey,
        protocol: this.protocolPda,
      })
      .signers([this.dao])
      .rpc();
  }

  async registerMint(mint: Mint, baseAssetIndex: number | null) {
    let baseAsset = PublicKey.default;
    if (baseAssetIndex !== null) {
      baseAsset = await getBaseAssetPda(baseAssetIndex, this.program.programId);
    }

    await this.program.methods
      .registerMint()
      .accounts({
        authority: this.dao.publicKey,
        protocol: this.protocolPda,
        mintInfo: await getMintInfoPda(mint.publicKey, this.program.programId),
        baseAsset,
        systemProgram: SystemProgram.programId,
        mint: mint.publicKey,
      })
      .signers([this.dao])
      .rpc();
  }

  async changeBaseAssetParametersStatus(
    index: number,
    {
      enabled = null,
      riskCategory = null,
      oracleSource = null,
      switchboardOracle,
      pythOracle,
      inPlacePrice,
      signers,
      accountOverrides = {},
    }: {
      enabled?: boolean | null;
      riskCategory?: RiskCategory | null;
      oracleSource?: OracleSource | null;
      switchboardOracle?: PublicKey | null;
      pythOracle?: PublicKey | null;
      inPlacePrice?: number | null;
      signers?: Keypair[];
      accountOverrides?: { [key: string]: PublicKey };
    }
  ) {
    const baseAsset = await getBaseAssetPda(index, this.program.programId);

    const wrapInCustomOption = <T>(value: T | null | undefined) =>
      value !== undefined ? { some: { value } } : { none: {} };

    await this.program.methods
      .changeBaseAssetParameters(
        enabled,
        riskCategory,
        oracleSource,
        wrapInCustomOption(switchboardOracle),
        wrapInCustomOption(pythOracle),
        wrapInCustomOption(inPlacePrice)
      )
      .accounts({
        authority: this.dao.publicKey,
        protocol: this.protocolPda,
        baseAsset,
        ...accountOverrides,
      })
      .signers(signers ?? [this.dao])
      .rpc();
  }

  async setInstrumentEnabledStatus(instrument: PublicKey, statusToSet: boolean) {
    await this.program.methods
      .setInstrumentEnabledStatus(instrument, statusToSet)
      .accounts({
        authority: this.dao.publicKey,
        protocol: this.protocolPda,
      })
      .signers([this.dao])
      .rpc();
  }

  async initializeCollateral(user: Keypair) {
    await this.program.methods
      .initializeCollateral()
      .accounts({
        user: user.publicKey,
        protocol: this.protocolPda,
        collateralInfo: await getCollateralInfoPda(user.publicKey, this.program.programId),
        collateralToken: await getCollateralTokenPda(user.publicKey, this.program.programId),
        collateralMint: this.collateralToken.publicKey,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([user])
      .rpc();
  }

  async fundCollateral(user: Keypair, amount: BN) {
    await this.program.methods
      .fundCollateral(new BN(amount))
      .accounts({
        user: user.publicKey,
        userTokens: await this.collateralToken.getAssociatedAddress(user.publicKey),
        protocol: this.protocolPda,
        collateralInfo: await getCollateralInfoPda(user.publicKey, this.program.programId),
        collateralToken: await getCollateralTokenPda(user.publicKey, this.program.programId),
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([user])
      .rpc();
  }

  async withdrawCollateral(user: Keypair, amount: BN) {
    await this.program.methods
      .withdrawCollateral(new BN(amount))
      .accounts({
        user: user.publicKey,
        userTokens: await this.collateralToken.getAssociatedAddress(user.publicKey),
        protocol: this.protocolPda,
        collateralInfo: await getCollateralInfoPda(user.publicKey, this.program.programId),
        collateralToken: await getCollateralTokenPda(user.publicKey, this.program.programId),
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([user])
      .rpc();
  }

  async createEscrowRfq({
    legs = [SpotInstrument.createForLeg(this)],
    quote = SpotInstrument.createForQuote(this, this.quoteToken),
    orderType = DEFAULT_ORDER_TYPE,
    fixedSize = FixedSize.None,
    activeWindow = DEFAULT_ACTIVE_WINDOW,
    settlingWindow = DEFAULT_SETTLING_WINDOW,
    allLegs = legs,
    finalize = true,
  }: {
    legs?: InstrumentController[];
    quote?: InstrumentController;
    orderType?: OrderType;
    fixedSize?: FixedSize;
    activeWindow?: number;
    settlingWindow?: number;
    allLegs?: InstrumentController[];
    finalize?: boolean;
  } = {}) {
    const quoteAccounts = await quote.getValidationAccounts();
    const baseAssetIndexes = await legs.map((leg) => leg.getBaseAssetIndex());
    const baseAssetAccounts = baseAssetIndexes.map((index) => {
      return {
        pubkey: getBaseAssetPda(index, this.program.programId),
        isSigner: false,
        isWritable: false,
      };
    });
    const legAccounts = await (await Promise.all(legs.map(async (x) => await x.getValidationAccounts()))).flat();

    return await this.createRfqInner(
      legs.map((x) => x.toLegData()),
      allLegs.map((x) => x.toLegData()),
      quote.toQuoteData(),
      [...quoteAccounts, ...baseAssetAccounts, ...legAccounts],
      { type: "instrument", legs, quote },
      orderType,
      fixedSize,
      activeWindow,
      settlingWindow,
      true,
      finalize
    );
  }

  async createPrintTradeRfq({
    printTradeProvider,
    orderType = DEFAULT_ORDER_TYPE,
    fixedSize = FixedSize.None,
    activeWindow = DEFAULT_ACTIVE_WINDOW,
    settlingWindow = DEFAULT_SETTLING_WINDOW,
    verify = true,
    finalize = true,
  }: {
    printTradeProvider: HxroPrintTradeProvider;
    orderType?: OrderType;
    fixedSize?: FixedSize;
    activeWindow?: number;
    settlingWindow?: number;
    verify?: boolean;
    finalize?: boolean;
  }) {
    const baseAssetIndecies = printTradeProvider.getBaseAssetIndexes();
    const baseAssetAccounts = baseAssetIndecies.map((index) => toBaseAssetAccount(index, this.program));

    return await this.createRfqInner(
      printTradeProvider.getLegData(),
      printTradeProvider.getLegData(),
      printTradeProvider.getQuoteData(),
      baseAssetAccounts,
      { type: "printTradeProvider", provider: printTradeProvider },
      orderType,
      fixedSize,
      activeWindow,
      settlingWindow,
      verify,
      finalize
    );
  }

  private async createRfqInner(
    legData: LegData[],
    allLegData: LegData[],
    quoteData: QuoteData,
    accounts: AccountMeta[],
    rfqContent: RfqContent,
    orderType: OrderType,
    fixedSize: FixedSize,
    activeWindow: number,
    settlingWindow: number,
    verify: boolean,
    finalize: boolean
  ) {
    const serializedLegData = serializeLegData(allLegData, this.program);

    const currentTimestamp = new BN(Math.floor(Date.now() / 1000));
    const printTradeProvider = rfqContent.type == "printTradeProvider" ? rfqContent.provider.getProgramId() : null;
    const rfq = await getRfqPda(
      this.taker.publicKey,
      serializedLegData.hash,
      printTradeProvider,
      orderType,
      quoteData,
      fixedSize,
      activeWindow,
      settlingWindow,
      currentTimestamp,
      this.program
    );

    let txConstructor = await this.program.methods
      .createRfq(
        serializedLegData.data.length,
        Array.from(serializedLegData.hash),
        legData,
        printTradeProvider,
        orderType,
        quoteData as any,
        fixedSize as any,
        activeWindow,
        settlingWindow,
        new BN(currentTimestamp)
      )
      .accounts({
        taker: this.taker.publicKey,
        protocol: this.protocolPda,
        rfq,
        systemProgram: SystemProgram.programId,
      })
      .remainingAccounts(accounts)
      .preInstructions([expandComputeUnits])
      .signers([this.taker]);

    const rfqObject = new Rfq(this, rfq, rfqContent);

    const postInstructions = [];
    if (verify && rfqContent.type == "printTradeProvider") {
      postInstructions.push(await rfqObject.getValidateByPrintTradeProviderInstruction());
    }
    if (finalize) {
      postInstructions.push(await rfqObject.getFinalizeConstructionInstruction());
    }
    txConstructor.postInstructions(postInstructions);

    await txConstructor.rpc();

    return rfqObject;
  }

  async getProtocolState() {
    return await this.program.account.protocolState.fetch(this.protocolPda);
  }

  async getBaseAsset(index: number) {
    const address = await getBaseAssetPda(index, this.program.programId);
    return this.program.account.baseAssetInfo.fetch(address);
  }
}

export class RiskEngine {
  private constructor(
    private context: Context,
    public program: Program<RiskEngineIdl>,
    public programId: PublicKey,
    public configAddress: PublicKey
  ) {}

  static async create(context: Context) {
    const program = workspace.RiskEngine as Program<RiskEngineIdl>;
    const programId = program.programId;
    const configAddress = await getRiskEngineConfig(programId);

    return new RiskEngine(context, program, programId, configAddress);
  }

  async initializeDefaultConfig() {
    this.configAddress = await getRiskEngineConfig(this.programId);

    await this.program.methods
      .initializeConfig(
        DEFAULT_MIN_COLLATERAL_REQUIREMENT,
        DEFAULT_COLLATERAL_FOR_FIXED_QUOTE_AMOUNT_RFQ,
        DEFAULT_MINT_DECIMALS,
        DEFAULT_SAFETY_PRICE_SHIFT_FACTOR,
        DEFAULT_OVERALL_SAFETY_FACTOR,
        DEFAULT_ACCEPTED_ORACLE_STALENESS,
        DEFAULT_ACCEPTED_ORACLE_CONFIDENCE_INTERVAL_PORTION
      )
      .accounts({
        authority: this.context.dao.publicKey,
        protocol: this.context.protocolPda,
        config: this.configAddress,
        systemProgram: SystemProgram.programId,
      })
      .signers([this.context.dao])
      .rpc();

    await executeInParallel(
      async () => {
        await this.setRiskCategoriesInfo([
          {
            riskCategory: RiskCategory.VeryLow,
            newValue: DEFAULT_RISK_CATEGORIES_INFO[0],
          },
          {
            riskCategory: RiskCategory.Low,
            newValue: DEFAULT_RISK_CATEGORIES_INFO[1],
          },
          {
            riskCategory: RiskCategory.Medium,
            newValue: DEFAULT_RISK_CATEGORIES_INFO[2],
          },
        ]);
      },
      async () => {
        await this.setRiskCategoriesInfo([
          {
            riskCategory: RiskCategory.High,
            newValue: DEFAULT_RISK_CATEGORIES_INFO[3],
          },
          {
            riskCategory: RiskCategory.VeryHigh,
            newValue: DEFAULT_RISK_CATEGORIES_INFO[4],
          },
          {
            riskCategory: RiskCategory.Custom1,
            newValue: DEFAULT_RISK_CATEGORIES_INFO[5],
          },
        ]);
      },
      async () => {
        await this.setRiskCategoriesInfo([
          {
            riskCategory: RiskCategory.Custom2,
            newValue: DEFAULT_RISK_CATEGORIES_INFO[6],
          },
          {
            riskCategory: RiskCategory.Custom3,
            newValue: DEFAULT_RISK_CATEGORIES_INFO[7],
          },
        ]);
      },
      async () => {
        await SpotInstrument.setRiskEngineInstrumentType(this.context);
      },
      async () => {
        await PsyoptionsEuropeanInstrument.setRiskEngineInstrumentType(this.context);
      },
      async () => {
        await PsyoptionsAmericanInstrumentClass.setRiskEngineInstrumentType(this.context);
      }
    );
  }

  async closeConfig({ signer = this.context.dao } = {}) {
    this.configAddress = await getRiskEngineConfig(this.programId);

    await this.program.methods
      .closeConfig()
      .accounts({
        authority: signer.publicKey,
        protocol: this.context.protocolPda,
        config: this.configAddress,
      })
      .signers([signer])
      .rpc();
  }

  async updateConfig({
    minCollateralRequirement = null,
    collateralForFixedQuoteAmountRfq = null,
    collateralMintDecimals = null,
    safetyPriceShiftFactor = null,
    overallSafetyFactor = null,
    defaultAcceptedOracleStaleness = null,
    defaultAcceptedOracleConfidenceIntervalPortion = null,
  }: {
    minCollateralRequirement?: number | null;
    collateralForFixedQuoteAmountRfq?: number | null;
    collateralMintDecimals?: number | null;
    safetyPriceShiftFactor?: number | null;
    overallSafetyFactor?: number | null;
    defaultAcceptedOracleStaleness?: number | null;
    defaultAcceptedOracleConfidenceIntervalPortion?: number | null;
  } = {}) {
    await this.program.methods
      .updateConfig(
        minCollateralRequirement,
        collateralForFixedQuoteAmountRfq,
        collateralMintDecimals,
        safetyPriceShiftFactor,
        overallSafetyFactor,
        defaultAcceptedOracleStaleness,
        defaultAcceptedOracleConfidenceIntervalPortion
      )
      .accounts({
        authority: this.context.dao.publicKey,
        protocol: this.context.protocolPda,
        config: this.configAddress,
      })
      .signers([this.context.dao])
      .rpc();
  }

  async setInstrumentType(instrumentIndex: number, instrumentType: InstrumentType) {
    await this.program.methods
      .setInstrumentType(instrumentIndex, instrumentType)
      .accounts({
        authority: this.context.dao.publicKey,
        protocol: this.context.protocolPda,
        config: this.configAddress,
      })
      .signers([this.context.dao])
      .rpc();
  }

  async setRiskCategoriesInfo(
    changes: {
      riskCategory: RiskCategory;
      newValue: RiskCategoryInfo;
    }[]
  ) {
    let changesForInstruction = changes.map((x) => {
      return {
        riskCategoryIndex: x.riskCategory.index,
        newValue: x.newValue,
      };
    });

    await this.program.methods
      .setRiskCategoriesInfo(changesForInstruction)
      .accounts({
        authority: this.context.dao.publicKey,
        protocol: this.context.protocolPda,
        config: this.configAddress,
      })
      .signers([this.context.dao])
      .rpc();
  }

  async getConfig() {
    return this.program.account.config.fetchNullable(this.configAddress);
  }
}

export class Mint {
  public publicKey: PublicKey;
  public decimals: number;
  public baseAssetIndex: number | null;
  public mintInfoAddress: PublicKey | null;

  protected constructor(protected context: Context, address: PublicKey) {
    this.publicKey = address;
    this.decimals = DEFAULT_MINT_DECIMALS;
    this.baseAssetIndex = null;
    this.mintInfoAddress = null;
  }

  public static async wrap(context: Context, address: PublicKey) {
    const mint = new Mint(context, address);

    await executeInParallel(
      async () => await mint.createAssociatedTokenAccount(context.taker.publicKey),
      async () => await mint.createAssociatedTokenAccount(context.maker.publicKey),
      async () => await mint.createAssociatedTokenAccount(context.dao.publicKey)
    );

    return mint;
  }

  public static async loadExisting(
    context: Context,
    mintAddress: PublicKey,
    isRegistered?: boolean,
    baseAssetIndex?: number
  ) {
    const mint = new Mint(context, mintAddress);
    if (isRegistered) {
      mint.mintInfoAddress = await getMintInfoPda(mintAddress, context.program.programId);
    }
    mint.baseAssetIndex = baseAssetIndex ?? null;
    return mint;
  }

  public static async create(context: Context, keypair?: Keypair) {
    const token = await createMint(
      context.provider.connection,
      context.dao,
      context.dao.publicKey,
      null,
      DEFAULT_MINT_DECIMALS,
      keypair
    );
    const mint = new Mint(context, token);
    await executeInParallel(
      async () => await mint.createAssociatedAccountWithTokens(context.taker.publicKey),
      async () => await mint.createAssociatedAccountWithTokens(context.maker.publicKey),
      async () => await mint.createAssociatedAccountWithTokens(context.dao.publicKey)
    );

    return mint;
  }

  public async register(baseAssetIndex: number | null) {
    await this.context.registerMint(this, baseAssetIndex);
    this.baseAssetIndex = baseAssetIndex;
    this.mintInfoAddress = await getMintInfoPda(this.publicKey, this.context.program.programId);
  }

  public async createAssociatedAccountWithTokens(address: PublicKey, amount = DEFAULT_TOKEN_AMOUNT) {
    const account = await this.createAssociatedTokenAccount(address);
    await mintTo(
      this.context.provider.connection,
      this.context.dao,
      this.publicKey,
      account,
      this.context.dao,
      amount.toString()
    );
  }

  public async createAssociatedTokenAccount(address: PublicKey) {
    return await createAssociatedTokenAccount(
      this.context.provider.connection,
      this.context.dao,
      this.publicKey,
      address
    );
  }

  public async getAssociatedAddress(address: PublicKey) {
    return await getAssociatedTokenAddress(this.publicKey, address);
  }

  public async getAssociatedBalance(address: PublicKey) {
    const account = await getAccount(this.context.provider.connection, await this.getAssociatedAddress(address));
    return new BN(account.amount);
  }

  public assertRegisteredAsBaseAsset(): asserts this is {
    baseAssetIndex: number;
    mintInfoAddress: PublicKey;
  } {
    if (this.baseAssetIndex === null || this.mintInfoAddress === null) {
      throw new Error(`Mint ${this.publicKey.toString()} is not registered as base asset!`);
    }
  }

  public assertRegistered(): asserts this is { mintInfoAddress: PublicKey } {
    if (this.mintInfoAddress === null) {
      throw new Error(`Mint ${this.publicKey.toString()} is not registered!`);
    }
  }
}

export class CollateralMint extends Mint {
  public static async create(context: Context, keypair?: Keypair) {
    const mint = await Mint.create(context, keypair);
    return new CollateralMint(context, mint.publicKey);
  }

  public static async loadExisting(context: Context, mintAddress: PublicKey) {
    return new CollateralMint(context, mintAddress);
  }

  public async getTotalCollateral(address: PublicKey) {
    const account = await getAccount(this.context.provider.connection, await this.getTokenPda(address));
    return account.amount;
  }

  public async getUnlockedCollateral(address: PublicKey) {
    const tokenAccount = await getAccount(this.context.provider.connection, await this.getTokenPda(address));
    const collateralInfo = await this.context.program.account.collateralInfo.fetch(await this.getInfoPda(address));
    return new BN(tokenAccount.amount).sub(collateralInfo.lockedTokensAmount);
  }

  public async getTokenPda(address: PublicKey) {
    return await getCollateralTokenPda(address, this.context.program.programId);
  }

  public async getInfoPda(address: PublicKey) {
    return await getCollateralInfoPda(address, this.context.program.programId);
  }
}

type RfqContent =
  | { type: "instrument"; quote: InstrumentController; legs: InstrumentController[] }
  | { type: "printTradeProvider"; provider: HxroPrintTradeProvider };

export class Rfq {
  private activeWindowExpiration?: number;
  public constructor(public context: Context, public account: PublicKey, public content: RfqContent) {}

  async getActiveWindowExpiration() {
    if (this.activeWindowExpiration === undefined) {
      const data = await this.getData();
      this.activeWindowExpiration = (data.creationTimestamp.toNumber() as number) + data.activeWindow;
    }

    return this.activeWindowExpiration;
  }

  async respond({
    bid = null,
    ask = null,
    expirationTimestamp = null,
  }: {
    bid?: Quote | null;
    ask?: Quote | null;
    expirationTimestamp?: BN | null;
  } = {}) {
    if (bid === null && ask === null) {
      bid = Quote.getStandard(DEFAULT_PRICE, DEFAULT_LEG_MULTIPLIER);
    }
    if (expirationTimestamp === null) {
      expirationTimestamp = await this.getActiveWindowExpiration();
    }

    const response = await getResponsePda(
      this.account,
      this.context.maker.publicKey,
      this.context.program.programId,
      serializeOptionQuote(bid, this.context.program),
      serializeOptionQuote(ask, this.context.program),
      0
    );

    await this.context.program.methods
      .respondToRfq(bid as any, ask as any, 0, new BN(expirationTimestamp))
      .accounts({
        maker: this.context.maker.publicKey,
        protocol: this.context.protocolPda,
        rfq: this.account,
        response,
        collateralInfo: await getCollateralInfoPda(this.context.maker.publicKey, this.context.program.programId),
        collateralToken: await getCollateralTokenPda(this.context.maker.publicKey, this.context.program.programId),
        riskEngine: this.context.riskEngine.programId,
        systemProgram: SystemProgram.programId,
      })
      .remainingAccounts(await this.getRiskEngineAccounts())
      .signers([this.context.maker])
      .preInstructions([expandComputeUnits])
      .rpc();

    return new Response(this.context, this, this.context.maker, response);
  }

  async unlockCollateral() {
    await this.context.program.methods
      .unlockRfqCollateral()
      .accounts({
        protocol: this.context.protocolPda,
        rfq: this.account,
        collateralInfo: await getCollateralInfoPda(this.context.taker.publicKey, this.context.program.programId),
      })
      .rpc();
  }

  async cleanUp() {
    await this.context.program.methods
      .cleanUpRfq()
      .accounts({
        taker: this.context.taker.publicKey,
        protocol: this.context.protocolPda,
        rfq: this.account,
      })
      .rpc();
  }

  async cancel() {
    await this.context.program.methods
      .cancelRfq()
      .accounts({
        taker: this.context.taker.publicKey,
        protocol: this.context.protocolPda,
        rfq: this.account,
      })
      .signers([this.context.taker])
      .rpc();
  }

  async addLegs(legs: InstrumentController[], finalize = true) {
    if (this.content.type != "instrument") {
      throw Error("Not settled by instruments!");
    }
    this.content.legs = this.content.legs.concat(legs);

    const legData = legs.map((x) => x.toLegData());

    const baseAssetIndexes = legs.map((leg) => leg.getBaseAssetIndex());
    const baseAssetAccounts = baseAssetIndexes.map((index) => toBaseAssetAccount(index, this.context.program));
    const legAccounts = await (await Promise.all(legs.map(async (x) => await x.getValidationAccounts()))).flat();

    let txConstructor = this.context.program.methods
      .addLegsToRfq(legData)
      .accounts({
        taker: this.context.taker.publicKey,
        protocol: this.context.protocolPda,
        rfq: this.account,
      })
      .remainingAccounts([...baseAssetAccounts, ...legAccounts])
      .preInstructions([expandComputeUnits])
      .signers([this.context.taker]);

    if (finalize) {
      txConstructor = txConstructor.postInstructions([await this.getFinalizeConstructionInstruction()]);
    }

    await txConstructor.rpc();
  }

  async validatePrintTradeRfq() {
    let tx = new Transaction();
    let ix = await this.getValidateByPrintTradeProviderInstruction();
    tx.add(ix);
    await this.context.provider.sendAndConfirm(tx, [this.context.taker]);
  }

  async finalizeRfq() {
    let tx = new Transaction();
    let ix = await this.getFinalizeConstructionInstruction();
    tx.add(ix);
    await this.context.provider.sendAndConfirm(tx, [this.context.taker]);
  }

  getFinalizeConstructionInstruction() {
    return this.context.program.methods
      .finalizeRfqConstruction()
      .accounts({
        taker: this.context.taker.publicKey,
        protocol: this.context.protocolPda,
        rfq: this.account,
        collateralInfo: getCollateralInfoPda(this.context.taker.publicKey, this.context.program.programId),
        collateralToken: getCollateralTokenPda(this.context.taker.publicKey, this.context.program.programId),
        riskEngine: this.context.riskEngine.programId,
      })
      .remainingAccounts(this.getRiskEngineAccounts())
      .instruction();
  }

  getValidateByPrintTradeProviderInstruction() {
    if (this.content.type !== "printTradeProvider") {
      throw Error("Is only supported for print trade RFQs!");
    }

    return this.context.program.methods
      .validateRfqByPrintTradeProvider()
      .accounts({
        taker: this.context.taker.publicKey,
        protocol: this.context.protocolPda,
        rfq: this.account,
      })
      .remainingAccounts(this.content.provider.getValidationAccounts())
      .instruction();
  }

  async getData() {
    return await this.context.program.account.rfq.fetch(this.account);
  }

  getRiskEngineAccounts(): AccountMeta[] {
    const config = { pubkey: this.context.riskEngine.configAddress, isSigner: false, isWritable: false };

    const allIndecies =
      this.content.type == "instrument"
        ? this.content.legs.map((leg) => leg.getBaseAssetIndex())
        : this.content.provider.getBaseAssetIndexes();
    let uniqueIndecies = Array.from(new Set(allIndecies));
    const baseAssets = uniqueIndecies.map((index) => toBaseAssetAccount(index, this.context.program));

    const oracles = uniqueIndecies
      .map((index) => this.context.baseAssets[index].oracleAddress)
      .filter((address) => address !== null)
      .map((address) => {
        return {
          pubkey: address as PublicKey,
          isSigner: false,
          isWritable: false,
        };
      });

    return [config, ...baseAssets, ...oracles];
  }
}

export class Response {
  //storing single here assumes all legs are prepared by the same single side
  public firstToPrepare: PublicKey | null;

  constructor(public context: Context, public rfq: Rfq, public maker: Keypair, public account: PublicKey) {
    this.firstToPrepare = null;
  }

  async confirm({
    side = QuoteSide.Bid,
    legMultiplierBps = null,
  }: {
    side?: QuoteSide;
    legMultiplierBps?: BN | null;
  } = {}) {
    await this.context.program.methods
      .confirmResponse(side, legMultiplierBps)
      .accounts({
        taker: this.context.taker.publicKey,
        protocol: this.context.protocolPda,
        rfq: this.rfq.account,
        response: this.account,
        collateralInfo: await getCollateralInfoPda(this.context.taker.publicKey, this.context.program.programId),
        makerCollateralInfo: await getCollateralInfoPda(this.context.maker.publicKey, this.context.program.programId),
        collateralToken: await getCollateralTokenPda(this.context.taker.publicKey, this.context.program.programId),
        riskEngine: this.context.riskEngine.programId,
      })
      .remainingAccounts(await this.rfq.getRiskEngineAccounts())
      .preInstructions([expandComputeUnits])
      .signers([this.context.taker])
      .rpc();
  }

  async prepareEscrowSettlement(side: AuthoritySide, legAmount?: number) {
    if (this.rfq.content.type != "instrument") {
      throw Error("Not settled by instruments!");
    }

    const { legs, quote } = this.rfq.content;
    legAmount = legAmount || legs.length;
    const caller = side == AuthoritySide.Taker ? this.context.taker : this.context.maker;

    if (this.firstToPrepare === null) {
      this.firstToPrepare = caller.publicKey;
    }
    const quoteAccounts = await quote.getPrepareSettlementAccounts(side, "quote", this.rfq, this);
    const legAccounts = await (
      await Promise.all(
        legs
          .slice(0, legAmount)
          .map(async (x, index) => await x.getPrepareSettlementAccounts(side, { legIndex: index }, this.rfq, this))
      )
    ).flat();

    await this.context.program.methods
      .prepareEscrowSettlement(side, legAmount)
      .accounts({
        caller: caller.publicKey,
        protocol: this.context.protocolPda,
        rfq: this.rfq.account,
        response: this.account,
      })
      .signers([caller])
      .remainingAccounts([...quoteAccounts, ...legAccounts])
      .preInstructions([expandComputeUnits])
      .rpc();
  }

  async preparePrintTradeSettlement(side: AuthoritySide) {
    if (this.rfq.content.type != "printTradeProvider") {
      throw Error("Not settled by print trade provider!");
    }

    const caller = side == AuthoritySide.Taker ? this.context.taker : this.context.maker;
    const accounts = this.rfq.content.provider.getPreparePrintTradeSettlementAccounts(side, this.rfq, this);

    if (this.firstToPrepare === null) {
      this.firstToPrepare = caller.publicKey;
    }

    await this.context.program.methods
      .preparePrintTradeSettlement(side)
      .accounts({
        caller: caller.publicKey,
        protocol: this.context.protocolPda,
        rfq: this.rfq.account,
        response: this.account,
      })
      .signers([caller])
      .remainingAccounts(accounts)
      .preInstructions([expandComputeUnits])
      .rpc();
  }

  async prepareMoreEscrowLegsSettlement(side: AuthoritySide, from: number, legAmount: number) {
    if (this.rfq.content.type != "instrument") {
      throw Error("Not settled by instruments!");
    }

    const { legs } = this.rfq.content;
    const caller = side == AuthoritySide.Taker ? this.context.taker : this.context.maker;
    const remainingAccounts = await (
      await Promise.all(
        legs
          .slice(from, from + legAmount)
          .map(
            async (x, index) => await x.getPrepareSettlementAccounts(side, { legIndex: from + index }, this.rfq, this)
          )
      )
    ).flat();

    await this.context.program.methods
      .prepareMoreEscrowLegsSettlement(side, legAmount)
      .accounts({
        caller: caller.publicKey,
        protocol: this.context.protocolPda,
        rfq: this.rfq.account,
        response: this.account,
      })
      .signers([caller])
      .remainingAccounts(remainingAccounts)
      .preInstructions([expandComputeUnits])
      .rpc();
  }

  async settleEscrow(quoteReceiver: PublicKey, assetReceivers: PublicKey[], alreadySettledLegs = 0) {
    if (this.rfq.content.type != "instrument") {
      throw Error("Not settled by instruments!");
    }

    const { legs, quote } = this.rfq.content;
    const quoteAccounts = await quote.getSettleAccounts(quoteReceiver, "quote", this.rfq, this);
    const legAccounts = await (
      await Promise.all(
        legs
          .slice(alreadySettledLegs)
          .map(
            async (x, index) =>
              await x.getSettleAccounts(assetReceivers[index], { legIndex: alreadySettledLegs + index }, this.rfq, this)
          )
      )
    ).flat();

    await this.context.program.methods
      .settleEscrow()
      .accounts({
        protocol: this.context.protocolPda,
        rfq: this.rfq.account,
        response: this.account,
      })
      .remainingAccounts([...legAccounts, ...quoteAccounts])
      .preInstructions([expandComputeUnits])
      .rpc();
  }

  async settlePrintTrade() {
    if (this.rfq.content.type != "printTradeProvider") {
      throw Error("Not settled by print trade provider!");
    }

    const accounts = this.rfq.content.provider.getExecutePrintTradeSettlementAccounts(this.rfq, this);

    await this.context.program.methods
      .settlePrintTrade()
      .accounts({
        protocol: this.context.protocolPda,
        rfq: this.rfq.account,
        response: this.account,
      })
      .remainingAccounts(accounts)
      .preInstructions([expandComputeUnits])
      .rpc();
  }

  async expireSettlement({ accountOverrides = {} }: { accountOverrides?: { [id: string]: PublicKey } } = {}) {
    await this.context.program.methods
      .expireSettlement()
      .accounts({
        protocol: this.context.protocolPda,
        rfq: this.rfq.account,
        response: this.account,
        ...accountOverrides,
      })
      .rpc();
  }

  async partiallySettleEscrowLegs(assetReceivers: PublicKey[], legsToSettle: number, alreadySettledLegs = 0) {
    if (this.rfq.content.type != "instrument") {
      throw Error("Not settled by instruments!");
    }

    const remainingAccounts = await (
      await Promise.all(
        this.rfq.content.legs
          .slice(alreadySettledLegs, alreadySettledLegs + legsToSettle)
          .map(
            async (x, index) =>
              await x.getSettleAccounts(assetReceivers[index], { legIndex: alreadySettledLegs + index }, this.rfq, this)
          )
      )
    ).flat();

    await this.context.program.methods
      .partiallySettleEscrowLegs(legsToSettle)
      .accounts({
        protocol: this.context.protocolPda,
        rfq: this.rfq.account,
        response: this.account,
      })
      .remainingAccounts(remainingAccounts)
      .preInstructions([expandComputeUnits])
      .rpc();
  }

  async revertEscrowSettlementPreparation(side: { taker: {} } | { maker: {} }, preparedLegs?: number) {
    if (this.rfq.content.type != "instrument") {
      throw Error("Not settled by instruments!");
    }

    const { legs, quote } = this.rfq.content;
    preparedLegs = preparedLegs || legs.length;
    const quoteAccounts = await quote.getRevertSettlementPreparationAccounts(side, "quote", this.rfq, this);
    const legAccounts = await (
      await Promise.all(
        legs
          .slice(0, preparedLegs)
          .map(
            async (x, index) =>
              await x.getRevertSettlementPreparationAccounts(side, { legIndex: index }, this.rfq, this)
          )
      )
    ).flat();
    const remainingAccounts = [...legAccounts, ...quoteAccounts];

    await this.context.program.methods
      .revertEscrowSettlementPreparation(side)
      .accounts({
        protocol: this.context.protocolPda,
        rfq: this.rfq.account,
        response: this.account,
      })
      .remainingAccounts(remainingAccounts)
      .preInstructions([expandComputeUnits])
      .rpc();
  }

  async revertPrintTradeSettlementPreparation(side: { taker: {} } | { maker: {} }) {
    if (this.rfq.content.type != "printTradeProvider") {
      throw Error("Not settled by print trade!");
    }

    const remainingAccounts = this.rfq.content.provider.getRevertPrintTradeSettlementPreparationAccounts(
      this.rfq,
      this
    );

    await this.context.program.methods
      .revertPrintTradeSettlementPreparationPreparation(side)
      .accounts({
        protocol: this.context.protocolPda,
        rfq: this.rfq.account,
        response: this.account,
      })
      .remainingAccounts(remainingAccounts)
      .preInstructions([expandComputeUnits])
      .rpc();
  }

  async partlyRevertEscrowSettlementPreparation(
    side: { taker: {} } | { maker: {} },
    legAmount: number,
    preparedLegs?: number
  ) {
    if (this.rfq.content.type != "instrument") {
      throw Error("Not settled by instruments!");
    }

    const { legs } = this.rfq.content;
    const _preparedLegs = preparedLegs || legs.length;

    const remainingAccounts = await (
      await Promise.all(
        legs
          .slice(_preparedLegs - legAmount, preparedLegs)
          .map(
            async (x, index) =>
              await x.getRevertSettlementPreparationAccounts(
                side,
                { legIndex: _preparedLegs - legAmount + index },
                this.rfq,
                this
              )
          )
      )
    ).flat();

    await this.context.program.methods
      .partlyRevertEscrowSettlementPreparation(side, legAmount)
      .accounts({
        protocol: this.context.protocolPda,
        rfq: this.rfq.account,
        response: this.account,
      })
      .remainingAccounts(remainingAccounts)
      .rpc();
  }

  async unlockResponseCollateral() {
    await this.context.program.methods
      .unlockResponseCollateral()
      .accounts({
        protocol: this.context.protocolPda,
        rfq: this.rfq.account,
        response: this.account,
        takerCollateralInfo: await getCollateralInfoPda(this.context.taker.publicKey, this.context.program.programId),
        makerCollateralInfo: await getCollateralInfoPda(this.context.maker.publicKey, this.context.program.programId),
        takerCollateralTokens: await getCollateralTokenPda(
          this.context.taker.publicKey,
          this.context.program.programId
        ),
        makerCollateralTokens: await getCollateralTokenPda(
          this.context.maker.publicKey,
          this.context.program.programId
        ),
        protocolCollateralTokens: await getCollateralTokenPda(
          this.context.dao.publicKey,
          this.context.program.programId
        ),
      })
      .rpc();
  }

  async settleOnePartyDefault() {
    await this.context.program.methods
      .settleOnePartyDefault()
      .accounts({
        protocol: this.context.protocolPda,
        rfq: this.rfq.account,
        response: this.account,
        takerCollateralInfo: await getCollateralInfoPda(this.context.taker.publicKey, this.context.program.programId),
        makerCollateralInfo: await getCollateralInfoPda(this.context.maker.publicKey, this.context.program.programId),
        takerCollateralTokens: await getCollateralTokenPda(
          this.context.taker.publicKey,
          this.context.program.programId
        ),
        makerCollateralTokens: await getCollateralTokenPda(
          this.context.maker.publicKey,
          this.context.program.programId
        ),
        protocolCollateralTokens: await getCollateralTokenPda(
          this.context.dao.publicKey,
          this.context.program.programId
        ),
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();
  }

  async settleTwoPartyDefault() {
    await this.context.program.methods
      .settleTwoPartyDefault()
      .accounts({
        protocol: this.context.protocolPda,
        rfq: this.rfq.account,
        response: this.account,
        takerCollateralInfo: await getCollateralInfoPda(this.context.taker.publicKey, this.context.program.programId),
        makerCollateralInfo: await getCollateralInfoPda(this.context.maker.publicKey, this.context.program.programId),
        takerCollateralTokens: await getCollateralTokenPda(
          this.context.taker.publicKey,
          this.context.program.programId
        ),
        makerCollateralTokens: await getCollateralTokenPda(
          this.context.maker.publicKey,
          this.context.program.programId
        ),
        protocolCollateralTokens: await getCollateralTokenPda(
          this.context.dao.publicKey,
          this.context.program.programId
        ),
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();
  }

  async cleanUp(preparedLegs?: number) {
    let remainingAccounts: AccountMeta[] = [];
    if (this.firstToPrepare) {
      const content = this.rfq.content;
      if (content.type === "instrument") {
        const { legs, quote } = content;
        preparedLegs = preparedLegs || legs.length;
        const quoteAccounts = await quote.getCleanUpAccounts("quote", this.rfq, this);
        const legAccounts = await (
          await Promise.all(
            legs
              .slice(0, preparedLegs)
              .map(async (x, index) => await x.getCleanUpAccounts({ legIndex: index }, this.rfq, this))
          )
        ).flat();

        remainingAccounts = [...legAccounts, ...quoteAccounts];
      } else {
        remainingAccounts = content.provider.getCleanUpPrintTradeSettlementAccounts(this.rfq, this);
      }
    }

    await this.context.program.methods
      .cleanUpResponse()
      .accounts({
        maker: this.context.maker.publicKey,
        protocol: this.context.protocolPda,
        rfq: this.rfq.account,
        response: this.account,
      })
      .remainingAccounts(remainingAccounts)
      .preInstructions([expandComputeUnits])
      .rpc();
  }

  async cleanUpEscrowLegs(legAmount: number, preparedLegs?: number) {
    if (this.rfq.content.type != "instrument") {
      throw Error("Not settled by instruments!");
    }

    const { legs } = this.rfq.content;
    const _preparedLegs = preparedLegs || legs.length;

    let remainingAccounts: AccountMeta[] = [];
    if (this.firstToPrepare) {
      remainingAccounts = await (
        await Promise.all(
          legs
            .slice(_preparedLegs - legAmount, preparedLegs)
            .map(
              async (x, index) =>
                await x.getCleanUpAccounts({ legIndex: _preparedLegs - legAmount + index }, this.rfq, this)
            )
        )
      ).flat();
    }

    await this.context.program.methods
      .cleanUpResponseEscrowLegs(legAmount)
      .accounts({
        protocol: this.context.protocolPda,
        rfq: this.rfq.account,
        response: this.account,
      })
      .remainingAccounts(remainingAccounts)
      .preInstructions([expandComputeUnits])
      .rpc();
  }

  async cancel() {
    await this.context.program.methods
      .cancelResponse()
      .accounts({
        maker: this.context.maker.publicKey,
        protocol: this.context.protocolPda,
        rfq: this.rfq.account,
        response: this.account,
      })
      .signers([this.context.maker])
      .rpc();
  }

  async getData() {
    return await this.context.program.account.response.fetch(this.account);
  }
}

let globalContext: Context | null = null;
export async function getContext() {
  if (globalContext !== null) {
    return globalContext;
  }

  let context = new Context();
  globalContext = context;
  await context.initializeFromFixtures();

  return context;
}
