import { BN, Program, workspace, AnchorProvider, setProvider } from "@coral-xyz/anchor";
import { PublicKey, Keypair, SystemProgram, SYSVAR_RENT_PUBKEY, AccountMeta, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Rfq as RfqIdl } from "../../../target/types/rfq";
import { VaultOperator as VaultOperatorIdl } from "../../../target/types/vault_operator";
import { RiskEngine as RiskEngineIdl } from "../../../target/types/risk_engine";
import {
  getBaseAssetPda,
  getCollateralInfoPda,
  getCollateralTokenPda,
  getMintInfoPda,
  getProtocolPda,
  getRfqPda,
  getVaultOperatorPda,
} from "../pdas";
import {
  DEFAULT_ACTIVE_WINDOW,
  DEFAULT_ORDER_TYPE,
  DEFAULT_SETTLING_WINDOW,
  DEFAULT_SETTLE_FEES,
  DEFAULT_DEFAULT_FEES,
  BITCOIN_BASE_ASSET_INDEX,
  SOLANA_BASE_ASSET_INDEX,
  ETH_BASE_ASSET_INDEX,
  DEFAULT_ADD_ASSET_FEES,
} from "../constants";
import { FixedSize, RiskCategory, OrderType, FeeParams, OracleSource, LegData, QuoteData } from "../types";
import { SpotInstrument } from "../instruments/spotInstrument";
import { InstrumentController } from "../instrument";
import {
  executeInParallel,
  expandComputeUnits,
  inversePubkeyToName,
  serializeLegData,
  toAbsolutePrice,
  toApiFeeParams,
  toBaseAssetAccount,
  toLegMultiplier,
  withTokenDecimals,
} from "../helpers";
import { loadPubkeyNaming, readKeypair } from "../fixtures";
import { HxroPrintTradeProvider } from "../printTradeProviders/hxroPrintTradeProvider";
import { CollateralMint, Mint } from "./mints";
import { RfqContent, Whitelist, Rfq } from "./rfq";
import { VaultOperator } from "./vaultOperator";

export class Context {
  public program: Program<RfqIdl>;
  public vaultOperatorProgram: Program<VaultOperatorIdl>;
  public riskEngineProgram: Program<RiskEngineIdl>;
  public provider: AnchorProvider;

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
    this.vaultOperatorProgram = workspace.VaultOperator as Program<VaultOperatorIdl>;
    this.riskEngineProgram = workspace.RiskEngine as Program<RiskEngineIdl>;

    this.pubkeyToName = {};
    this.nameToPubkey = {};
  }

  async basicInitialize() {
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
  }

  async initializeProtocol({
    settleFees = DEFAULT_SETTLE_FEES,
    defaultFees = DEFAULT_DEFAULT_FEES,
    addAssetFee = DEFAULT_ADD_ASSET_FEES,
  } = {}) {
    await this.program.methods
      .initializeProtocol(
        toApiFeeParams(settleFees),
        toApiFeeParams(defaultFees),
        new BN(addAssetFee * LAMPORTS_PER_SOL)
      )
      .accounts({
        signer: this.dao.publicKey,
        protocol: this.protocolPda,
        riskEngine: this.riskEngineProgram.programId,
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

  async addPrintTradeProvider(
    programId: PublicKey,
    validateResponseAccountAmount: number,
    settlementCanExpire: boolean
  ) {
    await this.program.methods
      .addPrintTradeProvider(validateResponseAccountAmount, settlementCanExpire)
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

    return { baseAssetPda };
  }

  async changeProtocolFees({
    settleFees = null,
    defaultFees = null,
    addAssetFee = null,
  }: { settleFees?: FeeParams | null; defaultFees?: FeeParams | null; addAssetFee?: number | null } = {}) {
    let serializedSettleFees = settleFees ? toApiFeeParams(settleFees) : null;
    let serializedDettleFees = defaultFees ? toApiFeeParams(defaultFees) : null;
    let serializedAddAssetFee = addAssetFee !== null ? new BN(addAssetFee * LAMPORTS_PER_SOL) : null;
    await this.program.methods
      .changeProtocolFees(serializedSettleFees, serializedDettleFees, serializedAddAssetFee)
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

  async addUserAsset(baseAssetIndex: number, ticker: string, mint: Mint) {
    await this.program.methods
      .addUserAsset({ value: baseAssetIndex }, ticker)
      .accountsStrict({
        creator: this.taker.publicKey,
        authority: this.dao.publicKey,
        protocol: this.protocolPda,
        baseAsset: getBaseAssetPda(baseAssetIndex, this.program.programId),
        mintInfo: getMintInfoPda(mint.publicKey, this.program.programId),
        mint: mint.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([this.taker])
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
      strict = null,
      signers,
      accountOverrides = {},
    }: {
      enabled?: boolean | null;
      riskCategory?: RiskCategory | null;
      oracleSource?: OracleSource | null;
      switchboardOracle?: PublicKey | null;
      pythOracle?: PublicKey | null;
      inPlacePrice?: number | null;
      strict?: boolean | null;
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
        wrapInCustomOption(inPlacePrice),
        strict
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
    whitelistPubkeyList = [],
  }: {
    legs?: InstrumentController[];
    quote?: InstrumentController;
    orderType?: OrderType;
    fixedSize?: FixedSize;
    activeWindow?: number;
    settlingWindow?: number;
    allLegs?: InstrumentController[];
    finalize?: boolean;
    whitelistPubkeyList?: PublicKey[];
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
      finalize,
      whitelistPubkeyList
    );
  }

  async createVaultOperatorRfq({
    acceptableLimitPrice = 100,
    leg = SpotInstrument.createForLeg(this),
    quote = SpotInstrument.createForQuote(this, this.quoteToken),
    orderType = OrderType.Sell,
    size = toLegMultiplier(2),
    activeWindow = DEFAULT_ACTIVE_WINDOW,
    settlingWindow = DEFAULT_SETTLING_WINDOW,
    whitelistPubkeyList = [],
  }: {
    acceptableLimitPrice?: number;
    leg?: InstrumentController<SpotInstrument>;
    quote?: InstrumentController<SpotInstrument>;
    orderType?: OrderType;
    size?: BN;
    activeWindow?: number;
    settlingWindow?: number;
    finalize?: boolean;
    whitelistPubkeyList?: PublicKey[];
  } = {}) {
    const quoteData = quote.toQuoteData();
    const quoteAccounts = await quote.getValidationAccounts();
    const baseAssetAccount = {
      pubkey: getBaseAssetPda(leg.getBaseAssetIndex(), this.program.programId),
      isSigner: false,
      isWritable: false,
    };
    const legAccounts = await leg.getValidationAccounts();
    const legData = leg.toLegData();

    const serializedLegData = serializeLegData([legData], this.program);

    const vaultParams = Keypair.generate();
    const vaultOperator = getVaultOperatorPda(vaultParams.publicKey, this.vaultOperatorProgram.programId);

    const currentTimestamp = new BN(Math.floor(Date.now() / 1000));
    const fixedSize = orderType === OrderType.Sell ? FixedSize.getBaseAsset(size) : FixedSize.getQuoteAsset(size);
    const rfqAddress = await getRfqPda(
      vaultOperator,
      serializedLegData.hash,
      null,
      orderType,
      quoteData,
      fixedSize,
      activeWindow,
      settlingWindow,
      currentTimestamp,
      this.program
    );

    let whitelistAccount = null;
    if (whitelistPubkeyList.length > 0) {
      const whitelist = await this.createWhitelist(whitelistPubkeyList);
      whitelistAccount = whitelist.account;
    }
    const remainingAccounts = [...quoteAccounts, baseAssetAccount, ...legAccounts];

    const serializer = this.program.coder.types;

    const lamportsForOperator = 14288880;
    const legMint = leg.instrument.mint;
    const quoteMint = quote.instrument.mint;

    const rfq = new Rfq(this, rfqAddress, { type: "instrument", legs: [leg], quote }, whitelistAccount);

    const [sendMint, receiveMint] = orderType === OrderType.Sell ? [legMint, quoteMint] : [quoteMint, legMint];
    await executeInParallel(
      async () => await sendMint.createAssociatedTokenAccount(vaultOperator),
      async () => await receiveMint.createAssociatedTokenAccount(vaultOperator)
    );

    await this.vaultOperatorProgram.methods
      .createRfq(
        toAbsolutePrice(withTokenDecimals(acceptableLimitPrice)),
        leg.getBaseAssetIndex(),
        serializer.encode("OrderType", orderType)[0],
        size,
        activeWindow,
        settlingWindow,
        currentTimestamp
      )
      .accounts({
        creator: this.taker.publicKey,
        vaultParams: vaultParams.publicKey,
        operator: vaultOperator,
        sendMint: sendMint.publicKey,
        receiveMint: receiveMint.publicKey,
        vault: await sendMint.getAssociatedAddress(vaultOperator),
        vaultTokensSource: await sendMint.getAssociatedAddress(this.taker.publicKey),
        protocol: this.protocolPda,
        rfq: rfqAddress,
        whitelist: whitelistAccount,
        collateralInfo: getCollateralInfoPda(vaultOperator, this.program.programId),
        collateralToken: getCollateralTokenPda(vaultOperator, this.program.programId),
        collateralMint: this.collateralToken.publicKey,
        riskEngine: this.riskEngineProgram.programId,
        rfqProgram: this.program.programId,
        systemProgram: SystemProgram.programId,
      })
      .remainingAccounts([...remainingAccounts, ...rfq.getRiskEngineAccounts()])
      .preInstructions([
        expandComputeUnits,
        SystemProgram.transfer({
          fromPubkey: this.taker.publicKey,
          toPubkey: vaultOperator,
          lamports: lamportsForOperator,
        }),
      ])
      .signers([this.taker, vaultParams])
      .rpc();

    rfq.getRiskEngineAccounts();
    return new VaultOperator(this, vaultParams.publicKey, rfq);
  }

  async createWhitelist(whitelist: PublicKey[]) {
    const whitelistAccount = Keypair.generate();
    const creator = this.taker;
    const whitelistObject = new Whitelist(this, whitelistAccount.publicKey, creator.publicKey, whitelist);

    await this.program.methods
      .createWhitelist(whitelist)
      .accounts({
        creator: creator.publicKey,
        systemProgram: SystemProgram.programId,
        whitelistAccount: whitelistAccount.publicKey,
      })
      .signers([whitelistAccount, creator])
      .rpc();

    return whitelistObject;
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
    finalize: boolean,
    whitelistPubkeyList: PublicKey[] = []
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

    let whitelistAccount = null;
    if (whitelistPubkeyList.length > 0) {
      const whitelist = await this.createWhitelist(whitelistPubkeyList);
      whitelistAccount = whitelist.account;
    }
    const rfqObject = new Rfq(this, rfq, rfqContent, whitelistAccount);

    let txConstructor = await this.program.methods
      .createRfq(
        serializedLegData.data.length,
        Array.from(serializedLegData.hash),
        legData,
        printTradeProvider,
        orderType,
        quoteData,
        fixedSize,
        activeWindow,
        settlingWindow,
        new BN(currentTimestamp)
      )
      .accounts({
        taker: this.taker.publicKey,
        protocol: this.protocolPda,
        rfq,
        whitelist: whitelistAccount,
        systemProgram: SystemProgram.programId,
      })
      .remainingAccounts(accounts)
      .preInstructions([expandComputeUnits])
      .signers([this.taker]);

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

  async getRegisteredMint(mint: Mint) {
    const address = await getMintInfoPda(mint.publicKey, this.program.programId);
    return this.program.account.mintInfo.fetch(address);
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
