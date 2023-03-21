import { BN, Program, Provider, workspace, AnchorProvider, setProvider } from "@project-serum/anchor";
import {
  PublicKey,
  Keypair,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Transaction,
  AccountMeta,
  Signer,
  ConfirmOptions,
  TransactionSignature,
} from "@solana/web3.js";
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
  DEFAULT_COLLATERAL_FUNDED,
  DEFAULT_ORDER_TYPE,
  DEFAULT_SETTLING_WINDOW,
  DEFAULT_SOL_FOR_SIGNERS,
  DEFAULT_TOKEN_AMOUNT,
  DEFAULT_PRICE,
  DEFAULT_LEG_MULTIPLIER,
  BITCOIN_BASE_ASSET_INDEX,
  SOLANA_BASE_ASSET_INDEX,
  DEFAULT_MINT_DECIMALS,
  SWITCHBOARD_BTC_ORACLE,
  SWITCHBOARD_SOL_ORACLE,
  DEFAULT_COLLATERAL_FOR_FIXED_QUOTE_AMOUNT_RFQ,
  DEFAULT_COLLATERAL_FOR_VARIABLE_SIZE_RFQ,
  DEFAULT_SAFETY_PRICE_SHIFT_FACTOR,
  DEFAULT_OVERALL_SAFETY_FACTOR,
  DEFAULT_RISK_CATEGORIES_INFO,
  DEFAULT_ACCEPTED_ORACLE_STALENESS,
  DEFAULT_ACCEPTED_ORACLE_CONFIDENCE_INTERVAL_PORTION,
  DEFAULT_SETTLE_FEES,
  DEFAULT_DEFAULT_FEES,
} from "./constants";
import {
  AuthoritySide,
  Quote,
  Side,
  FixedSize,
  RiskCategory,
  riskCategoryToObject,
  InstrumentType,
  instrumentTypeToObject,
  RiskCategoryInfo,
  OrderType,
  FeeParams,
} from "./types";
import { SpotInstrument } from "./instruments/spotInstrument";
import { InstrumentController } from "./instrument";
import {
  calculateLegsHash,
  calculateLegsSize,
  executeInParallel,
  expandComputeUnits,
  serializeOptionQuote,
  toApiFeeParams,
} from "./helpers";
import { PsyoptionsEuropeanInstrument } from "./instruments/psyoptionsEuropeanInstrument";
import { PsyoptionsAmericanInstrumentClass } from "./instruments/psyoptionsAmericanInstrument";

export class Context {
  public program: Program<RfqIdl>;
  public riskEngine!: RiskEngine;
  public provider: Provider & {
    sendAndConfirm: (tx: Transaction, signers?: Signer[], opts?: ConfirmOptions) => Promise<TransactionSignature>;
  };
  public dao!: Keypair;
  public taker!: Keypair;
  public maker!: Keypair;
  public assetToken!: Mint; // BTC with the price of 20k$ in oracle
  public additionalAssetToken!: Mint; // SOL with the price of 30$ in oracle
  public quoteToken!: Mint;
  public collateralToken!: CollateralMint;
  public protocolPda!: PublicKey;
  public baseAssets: { [baseAssetIndex: number]: { oracleAddress: PublicKey } };

  constructor() {
    this.provider = AnchorProvider.env();
    this.assertProvider();
    setProvider(this.provider);
    this.program = workspace.Rfq as Program<RfqIdl>;
    this.baseAssets = {};
  }

  assertProvider(): asserts this is {
    provider: {
      sendAndConfirm: (tx: Transaction, signers?: Signer[], opts?: ConfirmOptions) => Promise<TransactionSignature>;
    };
  } {
    if (!this.provider.sendAndConfirm) {
      throw Error("Provider doesn't support send and confirm!");
    }
  }

  async initialize() {
    this.riskEngine = await RiskEngine.create(this);

    await executeInParallel(
      async () => (this.dao = await this.createPayer()),
      async () => (this.taker = await this.createPayer()),
      async () => (this.maker = await this.createPayer())
    );

    this.protocolPda = await getProtocolPda(this.program.programId);

    await executeInParallel(
      async () => (this.assetToken = await Mint.create(this)),
      async () => (this.additionalAssetToken = await Mint.create(this)),
      async () => (this.quoteToken = await Mint.create(this)),
      async () => (this.collateralToken = await CollateralMint.create(this))
    );
  }

  async createPayer() {
    const payer = Keypair.generate();

    await this.provider.connection.confirmTransaction(
      await this.provider.connection.requestAirdrop(payer.publicKey, DEFAULT_SOL_FOR_SIGNERS),
      "confirmed"
    );

    return payer;
  }

  async createMint() {
    return await createMint(this.provider.connection, this.dao, this.dao.publicKey, null, DEFAULT_MINT_DECIMALS);
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

  async addBaseAsset(baseAssetIndex: number, ticker: string, riskCategory: RiskCategory, oracle: PublicKey) {
    await this.program.methods // @ts-ignore Strange error with anchor IDL parsing
      .addBaseAsset({ value: baseAssetIndex }, ticker, riskCategoryToObject(riskCategory), {
        switchboard: { address: oracle },
      })
      .accounts({
        authority: this.dao.publicKey,
        protocol: this.protocolPda,
        baseAsset: await getBaseAssetPda(baseAssetIndex, this.program.programId),
        systemProgram: SystemProgram.programId,
      })
      .signers([this.dao])
      .rpc();

    this.baseAssets[baseAssetIndex] = {
      oracleAddress: oracle,
    };
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

  async setBaseAssetEnabledStatus(index: number, statusToSet: boolean) {
    const baseAsset = await getBaseAssetPda(index, this.program.programId);
    await this.program.methods
      .setBaseAssetEnabledStatus(statusToSet)
      .accounts({
        authority: this.dao.publicKey,
        protocol: this.protocolPda,
        baseAsset,
      })
      .signers([this.dao])
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

  async createRfq({
    legs = [SpotInstrument.createForLeg(this)],
    quote = SpotInstrument.createForQuote(this, this.quoteToken),
    orderType = DEFAULT_ORDER_TYPE,
    fixedSize = FixedSize.None,
    activeWindow = DEFAULT_ACTIVE_WINDOW,
    settlingWindow = DEFAULT_SETTLING_WINDOW,
    legsSize = calculateLegsSize(legs),
    legsHash = calculateLegsHash(legs, this.program),
    finalize = true,
  }: {
    legs?: InstrumentController[];
    quote?: InstrumentController;
    orderType?: OrderType;
    fixedSize?: FixedSize;
    activeWindow?: number;
    settlingWindow?: number;
    legsSize?: number;
    legsHash?: Uint8Array;
    finalize?: boolean;
  } = {}) {
    const legData = legs.map((x) => x.toLegData());
    const quoteAccounts = await quote.getValidationAccounts();
    const baseAssetAccounts = await Promise.all(legs.map((leg) => leg.getBaseAssetAccount(this.program.programId)));
    const legAccounts = await (await Promise.all(legs.map(async (x) => await x.getValidationAccounts()))).flat();
    const currentTimestamp = new BN(Math.floor(Date.now() / 1000) - 1); // -1 second because for some reason local validator is late for 1 second
    const rfq = await getRfqPda(
      this.taker.publicKey,
      legsHash,
      orderType,
      quote,
      fixedSize,
      activeWindow,
      settlingWindow,
      currentTimestamp,
      this.program
    );
    const rfqObject = new Rfq(this, rfq, quote, legs);

    let txConstructor = await this.program.methods
      .createRfq(
        legsSize,
        Array.from(legsHash),
        legData,
        orderType,
        quote.toQuoteData(),
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
      .remainingAccounts([...quoteAccounts, ...baseAssetAccounts, ...legAccounts])
      .preInstructions([expandComputeUnits])
      .signers([this.taker]);

    if (finalize) {
      txConstructor = txConstructor.postInstructions([await rfqObject.getFinalizeConstructionInstruction()]);
    }

    await txConstructor.rpc();

    return rfqObject;
  }

  async getProtocolState() {
    return await this.program.account.protocolState.fetch(this.protocolPda);
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
        DEFAULT_COLLATERAL_FOR_VARIABLE_SIZE_RFQ,
        DEFAULT_COLLATERAL_FOR_FIXED_QUOTE_AMOUNT_RFQ,
        DEFAULT_MINT_DECIMALS,
        DEFAULT_SAFETY_PRICE_SHIFT_FACTOR,
        DEFAULT_OVERALL_SAFETY_FACTOR,
        DEFAULT_ACCEPTED_ORACLE_STALENESS,
        DEFAULT_ACCEPTED_ORACLE_CONFIDENCE_INTERVAL_PORTION
      )
      .accounts({
        signer: this.context.dao.publicKey,
        config: this.configAddress,
        systemProgram: SystemProgram.programId,
      })
      .signers([this.context.dao])
      .rpc();

    await executeInParallel(
      async () => {
        await this.setRiskCategoriesInfo([
          { riskCategory: RiskCategory.VeryLow, newValue: DEFAULT_RISK_CATEGORIES_INFO[0] },
          { riskCategory: RiskCategory.Low, newValue: DEFAULT_RISK_CATEGORIES_INFO[1] },
          { riskCategory: RiskCategory.Medium, newValue: DEFAULT_RISK_CATEGORIES_INFO[2] },
        ]);
      },
      async () => {
        await this.setRiskCategoriesInfo([
          { riskCategory: RiskCategory.High, newValue: DEFAULT_RISK_CATEGORIES_INFO[3] },
          { riskCategory: RiskCategory.VeryHigh, newValue: DEFAULT_RISK_CATEGORIES_INFO[4] },
        ]);
      }
    );
  }

  async updateConfig({
    collateralForVariableSizeRfq = null,
    collateralForFixedQuoteAmountRfq = null,
    collateralMintDecimals = null,
    safetyPriceShiftFactor = null,
    overallSafetyFactor = null,
    defaultAcceptedOracleStaleness = null,
    defaultAcceptedOracleConfidenceIntervalPortion = null,
  }: {
    collateralForVariableSizeRfq?: number | null;
    collateralForFixedQuoteAmountRfq?: number | null;
    collateralMintDecimals?: number | null;
    safetyPriceShiftFactor?: number | null;
    overallSafetyFactor?: number | null;
    defaultAcceptedOracleStaleness?: number | null;
    defaultAcceptedOracleConfidenceIntervalPortion?: number | null;
  } = {}) {
    await this.program.methods
      .updateConfig(
        collateralForVariableSizeRfq,
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

  async setInstrumentType(program: PublicKey, instrumentType: InstrumentType | null) {
    let idlInstrumentType = null;
    if (instrumentType !== null) {
      idlInstrumentType = instrumentTypeToObject(instrumentType);
    }

    await this.program.methods
      .setInstrumentType(program, idlInstrumentType)
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
        riskCategoryIndex: x.riskCategory.valueOf(),
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
    return this.program.account.config.fetch(this.configAddress);
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

  public static async create(context: Context) {
    const token = await context.createMint();
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

  public assertRegisteredAsBaseAsset(): asserts this is { baseAssetIndex: number; mintInfoAddress: PublicKey } {
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
  public static async create(context: Context) {
    const mint = await Mint.create(context);
    return new CollateralMint(context, mint.publicKey);
  }

  public async getTotalCollateral(address: PublicKey) {
    const account = await getAccount(
      this.context.provider.connection,
      await getCollateralTokenPda(address, this.context.program.programId)
    );
    return account.amount;
  }

  public async getUnlockedCollateral(address: PublicKey) {
    const tokenAccount = await getAccount(
      this.context.provider.connection,
      await getCollateralTokenPda(address, this.context.program.programId)
    );
    const collateralInfo = await this.context.program.account.collateralInfo.fetch(
      await getCollateralInfoPda(address, this.context.program.programId)
    );
    return new BN(tokenAccount.amount).sub(collateralInfo.lockedTokensAmount);
  }
}

export class Rfq {
  public constructor(
    public context: Context,
    public account: PublicKey,
    public quote: InstrumentController,
    public legs: InstrumentController[]
  ) {}

  async respond({ bid = null, ask = null }: { bid?: Quote | null; ask?: Quote | null } = {}) {
    if (bid === null && ask === null) {
      bid = Quote.getStandard(DEFAULT_PRICE, DEFAULT_LEG_MULTIPLIER);
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
      .respondToRfq(bid as any, ask as any, 0)
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
    this.legs = this.legs.concat(legs);

    const legData = legs.map((x) => x.toLegData());

    const baseAssetAccounts = await Promise.all(
      legs.map((leg) => leg.getBaseAssetAccount(this.context.program.programId))
    );
    const legAccounts = await (await Promise.all(legs.map(async (x) => await x.getValidationAccounts()))).flat();

    let txConstructor = this.context.program.methods
      .addLegsToRfq(legData)
      .accounts({
        taker: this.context.taker.publicKey,
        protocol: this.context.protocolPda,
        rfq: this.account,
      })
      .remainingAccounts([...baseAssetAccounts, ...legAccounts])
      .signers([this.context.taker]);

    if (finalize) {
      txConstructor = txConstructor.postInstructions([await this.getFinalizeConstructionInstruction()]);
    }

    await txConstructor.rpc();
  }

  async finalizeConstruction() {
    let instruction = await this.getFinalizeConstructionInstruction();
    let transaction = new Transaction().add(instruction);
    await this.context.provider.sendAndConfirm(transaction, [this.context.taker]);
  }

  async getFinalizeConstructionInstruction() {
    return this.context.program.methods
      .finalizeRfqConstruction()
      .accounts({
        taker: this.context.taker.publicKey,
        protocol: this.context.protocolPda,
        rfq: this.account,
        collateralInfo: await getCollateralInfoPda(this.context.taker.publicKey, this.context.program.programId),
        collateralToken: await getCollateralTokenPda(this.context.taker.publicKey, this.context.program.programId),
        riskEngine: this.context.riskEngine.programId,
      })
      .remainingAccounts(await this.getRiskEngineAccounts())
      .instruction();
  }

  async getData() {
    return await this.context.program.account.rfq.fetch(this.account);
  }

  async getRiskEngineAccounts(): Promise<AccountMeta[]> {
    const config = { pubkey: this.context.riskEngine.configAddress, isSigner: false, isWritable: false };

    let uniqueIndecies = Array.from(new Set(this.legs.map((leg) => leg.getBaseAssetIndex())));
    const addresses = await Promise.all(
      uniqueIndecies.map((index) => getBaseAssetPda(index, this.context.program.programId))
    );

    const baseAssets = addresses.map((address) => {
      return { pubkey: address, isSigner: false, isWritable: false };
    });
    const oracles = uniqueIndecies
      .map((index) => this.context.baseAssets[index].oracleAddress)
      .map((address) => {
        return { pubkey: address, isSigner: false, isWritable: false };
      });

    return [config, ...baseAssets, ...oracles];
  }
}

export class Response {
  //storing single here assumes all legs are prepared by the same single side
  public firstToPrepare: PublicKey;

  constructor(public context: Context, public rfq: Rfq, public maker: Keypair, public account: PublicKey) {
    this.firstToPrepare = PublicKey.default;
  }

  async confirm({
    side = Side.Bid,
    legMultiplierBps = null,
  }: {
    side?: Side;
    legMultiplierBps?: BN | null;
  } = {}) {
    await this.context.program.methods
      .confirmResponse(side ?? Side.Bid, legMultiplierBps)
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

  async prepareSettlement(side: AuthoritySide, legAmount = this.rfq.legs.length) {
    const caller = side == AuthoritySide.Taker ? this.context.taker : this.context.maker;

    if (this.firstToPrepare.equals(PublicKey.default)) {
      this.firstToPrepare = caller.publicKey;
    }
    const quoteAccounts = await this.rfq.quote.getPrepareSettlementAccounts(side, "quote", this.rfq, this);
    const legAccounts = await (
      await Promise.all(
        this.rfq.legs
          .slice(0, legAmount)
          .map(async (x, index) => await x.getPrepareSettlementAccounts(side, { legIndex: index }, this.rfq, this))
      )
    ).flat();

    await this.context.program.methods
      .prepareSettlement(side, legAmount)
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

  async prepareMoreLegsSettlement(side: AuthoritySide, from: number, legAmount: number) {
    const caller = side == AuthoritySide.Taker ? this.context.taker : this.context.maker;
    const remainingAccounts = await (
      await Promise.all(
        this.rfq.legs
          .slice(from, from + legAmount)
          .map(
            async (x, index) => await x.getPrepareSettlementAccounts(side, { legIndex: from + index }, this.rfq, this)
          )
      )
    ).flat();

    await this.context.program.methods
      .prepareMoreLegsSettlement(side, legAmount)
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

  async settle(quoteReceiver: PublicKey, assetReceivers: PublicKey[], alreadySettledLegs = 0) {
    const quoteAccounts = await this.rfq.quote.getSettleAccounts(quoteReceiver, "quote", this.rfq, this);
    const legAccounts = await (
      await Promise.all(
        this.rfq.legs
          .slice(alreadySettledLegs)
          .map(
            async (x, index) =>
              await x.getSettleAccounts(assetReceivers[index], { legIndex: alreadySettledLegs + index }, this.rfq, this)
          )
      )
    ).flat();

    await this.context.program.methods
      .settle()
      .accounts({
        protocol: this.context.protocolPda,
        rfq: this.rfq.account,
        response: this.account,
      })
      .remainingAccounts([...legAccounts, ...quoteAccounts])
      .preInstructions([expandComputeUnits])
      .rpc();
  }

  async partiallySettleLegs(assetReceivers: PublicKey[], legsToSettle: number, alreadySettledLegs = 0) {
    const remainingAccounts = await (
      await Promise.all(
        this.rfq.legs
          .slice(alreadySettledLegs, alreadySettledLegs + legsToSettle)
          .map(
            async (x, index) =>
              await x.getSettleAccounts(assetReceivers[index], { legIndex: alreadySettledLegs + index }, this.rfq, this)
          )
      )
    ).flat();

    await this.context.program.methods
      .partiallySettleLegs(legsToSettle)
      .accounts({
        protocol: this.context.protocolPda,
        rfq: this.rfq.account,
        response: this.account,
      })
      .remainingAccounts(remainingAccounts)
      .preInstructions([expandComputeUnits])
      .rpc();
  }

  async revertSettlementPreparation(side: { taker: {} } | { maker: {} }, preparedLegs = this.rfq.legs.length) {
    const quoteAccounts = await this.rfq.quote.getRevertSettlementPreparationAccounts(side, "quote", this.rfq, this);
    const legAccounts = await (
      await Promise.all(
        this.rfq.legs
          .slice(0, preparedLegs)
          .map(
            async (x, index) =>
              await x.getRevertSettlementPreparationAccounts(side, { legIndex: index }, this.rfq, this)
          )
      )
    ).flat();
    const remainingAccounts = [...legAccounts, ...quoteAccounts];

    await this.context.program.methods
      .revertSettlementPreparation(side)
      .accounts({
        protocol: this.context.protocolPda,
        rfq: this.rfq.account,
        response: this.account,
      })
      .remainingAccounts(remainingAccounts)
      .preInstructions([expandComputeUnits])
      .rpc();
  }

  async partlyRevertSettlementPreparation(
    side: { taker: {} } | { maker: {} },
    legAmount: number,
    preparedLegs = this.rfq.legs.length
  ) {
    const remainingAccounts = await (
      await Promise.all(
        this.rfq.legs
          .slice(preparedLegs - legAmount, preparedLegs)
          .map(
            async (x, index) =>
              await x.getRevertSettlementPreparationAccounts(
                side,
                { legIndex: preparedLegs - legAmount + index },
                this.rfq,
                this
              )
          )
      )
    ).flat();

    await this.context.program.methods
      .partlyRevertSettlementPreparation(side, legAmount)
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

  async cleanUp(preparedLegs = this.rfq.legs.length) {
    let remainingAccounts: AccountMeta[] = [];
    if (this.firstToPrepare) {
      const quoteAccounts = await this.rfq.quote.getCleanUpAccounts("quote", this.rfq, this);
      const legAccounts = await (
        await Promise.all(
          this.rfq.legs
            .slice(0, preparedLegs)
            .map(async (x, index) => await x.getCleanUpAccounts({ legIndex: index }, this.rfq, this))
        )
      ).flat();

      remainingAccounts = [...legAccounts, ...quoteAccounts];
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

  async cleanUpLegs(legAmount: number, preparedLegs = this.rfq.legs.length) {
    let remainingAccounts: AccountMeta[] = [];
    if (this.firstToPrepare) {
      remainingAccounts = await (
        await Promise.all(
          this.rfq.legs
            .slice(preparedLegs - legAmount, preparedLegs)
            .map(
              async (x, index) =>
                await x.getCleanUpAccounts({ legIndex: preparedLegs - legAmount + index }, this.rfq, this)
            )
        )
      ).flat();
    }

    await this.context.program.methods
      .cleanUpResponseLegs(legAmount)
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
  await context.initialize();
  await context.initializeProtocol();

  await executeInParallel(
    async () => {
      await context.riskEngine.initializeDefaultConfig();
    },
    async () => {
      await SpotInstrument.addInstrument(context);
    },
    async () => {
      await PsyoptionsEuropeanInstrument.addInstrument(context);
    },
    async () => {
      await PsyoptionsAmericanInstrumentClass.addInstrument(context);
    },
    async () => {
      await context.initializeCollateral(context.taker);
      await context.fundCollateral(context.taker, DEFAULT_COLLATERAL_FUNDED);
    },
    async () => {
      await context.initializeCollateral(context.maker);
      await context.fundCollateral(context.maker, DEFAULT_COLLATERAL_FUNDED);
    },
    async () => {
      await context.initializeCollateral(context.dao);
    },
    async () => {
      await context.addBaseAsset(BITCOIN_BASE_ASSET_INDEX, "BTC", RiskCategory.VeryLow, SWITCHBOARD_BTC_ORACLE);
      await context.assetToken.register(BITCOIN_BASE_ASSET_INDEX);
    },
    async () => {
      await context.addBaseAsset(SOLANA_BASE_ASSET_INDEX, "SOL", RiskCategory.Medium, SWITCHBOARD_SOL_ORACLE);
      await context.additionalAssetToken.register(SOLANA_BASE_ASSET_INDEX);
    },
    async () => {
      await context.quoteToken.register(null);
    }
  );

  return context;
}
