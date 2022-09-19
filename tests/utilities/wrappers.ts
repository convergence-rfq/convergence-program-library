import * as anchor from "@project-serum/anchor";
import { BN } from "@project-serum/anchor";
import { PublicKey, Keypair, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, Token } from "@solana/spl-token";
import { Rfq as RfqIdl } from "../../target/types/rfq";
import { RiskEngine } from "../../target/types/risk_engine";
import { SpotInstrument as SpotInstrumentIdl } from "../../target/types/spot_instrument";
import { FailingInstrument as FailingInstrumentIdl } from "../../target/types/failing_instrument";
import { getCollateralInfoPda, getCollateralTokenPda, getProtocolPda, getQuoteEscrowPda } from "./pdas";
import {
  DEFAULT_ACTIVE_WINDOW,
  DEFAULT_COLLATERAL_FUNDED,
  DEFAULT_FEES,
  DEFAULT_ORDER_TYPE,
  DEFAULT_SETTLING_WINDOW,
  DEFAULT_SOL_FOR_SIGNERS,
  DEFAULT_TOKEN_AMOUNT,
  DEFAULT_PRICE,
  DEFAULT_LEG_MULTIPLIER,
} from "./constants";
import { AuthoritySide, Quote, Side, FixedSize } from "./types";
import { SpotInstrument } from "./spotInstrument";
import { Instrument } from "./instrument";
import { executeInParallel } from "./helpers";
import { FailingInstrument } from "./failingInstrument";

export class Context {
  public program: anchor.Program<RfqIdl>;
  public riskEngine: anchor.Program<RiskEngine>;
  public spotInstrument: anchor.Program<SpotInstrumentIdl>;
  public failingInstrument: anchor.Program<FailingInstrumentIdl>;
  public provider: anchor.Provider;
  public dao: Keypair;
  public taker: Keypair;
  public maker: Keypair;
  public assetToken: Mint;
  public quoteToken: Mint;
  public collateralToken: CollateralMint;
  public protocolPda: PublicKey;

  constructor() {
    this.provider = anchor.AnchorProvider.env();
    anchor.setProvider(this.provider);
    this.program = anchor.workspace.Rfq as anchor.Program<RfqIdl>;
    this.riskEngine = anchor.workspace.RiskEngine as anchor.Program<RiskEngine>;
    this.spotInstrument = anchor.workspace.SpotInstrument as anchor.Program<SpotInstrumentIdl>;
    this.failingInstrument = anchor.workspace.FailingInstrument as anchor.Program<FailingInstrumentIdl>;
  }

  async initialize() {
    await executeInParallel(
      async () => (this.dao = await this.createPayer()),
      async () => (this.taker = await this.createPayer()),
      async () => (this.maker = await this.createPayer())
    );

    this.protocolPda = await getProtocolPda(this.program.programId);

    await executeInParallel(
      async () => (this.assetToken = await Mint.create(this)),
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
    return await Token.createMint(this.provider.connection, this.dao, this.dao.publicKey, null, 0, TOKEN_PROGRAM_ID);
  }

  async initializeProtocol({ settleFees = DEFAULT_FEES, defaultFees = DEFAULT_FEES } = {}) {
    await this.program.methods
      .initializeProtocol(settleFees, defaultFees)
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

  async fundCollateral(user: Keypair, amount: number) {
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

  async initializeRfq({
    legs = null,
    orderType = null,
    fixedSize = null,
    activeWindow = DEFAULT_ACTIVE_WINDOW,
    settlingWindow = DEFAULT_SETTLING_WINDOW,
  } = {}) {
    legs = legs ?? [new SpotInstrument(this)];
    orderType = orderType ?? DEFAULT_ORDER_TYPE;
    fixedSize = fixedSize ?? FixedSize.None;
    const legData = await Promise.all(legs.map(async (x) => await x.toLegData()));
    const remainingAccounts = await (await Promise.all(legs.map(async (x) => await x.getValidationAccounts()))).flat();

    const rfq = new Keypair();
    await this.program.methods
      .intitializeRfq(legData, orderType, fixedSize, activeWindow, settlingWindow)
      .accounts({
        taker: this.taker.publicKey,
        protocol: this.protocolPda,
        rfq: rfq.publicKey,
        collateralInfo: await getCollateralInfoPda(this.taker.publicKey, this.program.programId),
        collateralToken: await getCollateralTokenPda(this.taker.publicKey, this.program.programId),
        quoteMint: this.quoteToken.publicKey,
        riskEngine: this.riskEngine.programId,
        systemProgram: SystemProgram.programId,
      })
      .remainingAccounts(remainingAccounts)
      .signers([this.taker, rfq])
      .rpc();

    return new Rfq(this, rfq.publicKey, legs);
  }
}

export class Mint {
  public publicKey: PublicKey;

  protected constructor(protected context: Context, public token: Token) {
    this.publicKey = token.publicKey;
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

  public async createAssociatedAccountWithTokens(address: PublicKey, amount = DEFAULT_TOKEN_AMOUNT) {
    const account = await this.token.createAssociatedTokenAccount(address);
    await this.token.mintTo(account, this.context.dao, [], amount);
  }

  public async getAssociatedAddress(address: PublicKey) {
    return await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      this.publicKey,
      address
    );
  }

  public async getAssociatedBalance(address: PublicKey) {
    const account = await this.token.getAccountInfo(await this.getAssociatedAddress(address));
    return account.amount;
  }
}

export class CollateralMint extends Mint {
  public static async create(context: Context) {
    const mint = await Mint.create(context);
    return new CollateralMint(context, mint.token);
  }

  public async getTotalCollateral(address: PublicKey) {
    const account = await this.token.getAccountInfo(
      await getCollateralTokenPda(address, this.context.program.programId)
    );
    return account.amount;
  }

  public async getUnlockedCollateral(address: PublicKey) {
    const tokenAccount = await this.token.getAccountInfo(
      await getCollateralTokenPda(address, this.context.program.programId)
    );
    const collateralInfo = await this.context.program.account.collateralInfo.fetch(
      await getCollateralInfoPda(address, this.context.program.programId)
    );
    // @ts-ignore
    return tokenAccount.amount.sub(collateralInfo.lockedTokensAmount);
  }
}

export class Rfq {
  public constructor(public context: Context, public account: PublicKey, public legs: Instrument[]) {}

  async respond({ bid = null, ask = null } = {}) {
    if (bid === null && ask === null) {
      bid = Quote.getStandart(DEFAULT_PRICE, DEFAULT_LEG_MULTIPLIER);
    }
    const response = new Keypair();

    await this.context.program.methods
      .respondToRfq(bid, ask)
      .accounts({
        maker: this.context.maker.publicKey,
        protocol: this.context.protocolPda,
        rfq: this.account,
        response: response.publicKey,
        collateralInfo: await getCollateralInfoPda(this.context.maker.publicKey, this.context.program.programId),
        collateralToken: await getCollateralTokenPda(this.context.maker.publicKey, this.context.program.programId),
        riskEngine: this.context.riskEngine.programId,
        systemProgram: SystemProgram.programId,
      })
      .signers([this.context.maker, response])
      .rpc();

    return new Response(this.context, this, this.context.maker, response.publicKey);
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

  async getData() {
    return await this.context.program.account.rfq.fetch(this.account);
  }
}

export class Response {
  public firstToPrepare: PublicKey;

  constructor(public context: Context, public rfq: Rfq, public maker: Keypair, public account: PublicKey) {
    this.firstToPrepare = PublicKey.default;
  }

  async confirm({ side = null, legMultiplierBps = null } = {}) {
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
      .signers([this.context.taker])
      .rpc();
  }

  async prepareSettlement(side) {
    const caller = side == AuthoritySide.Taker ? this.context.taker : this.context.maker;
    if (this.firstToPrepare.equals(PublicKey.default)) {
      this.firstToPrepare = caller.publicKey;
    }
    const remainingAccounts = await (
      await Promise.all(
        this.rfq.legs.map(async (x, index) => await x.getPrepareSettlementAccounts(side, index, this.rfq, this))
      )
    ).flat();

    await this.context.program.methods
      .prepareSettlement(side)
      .accounts({
        caller: caller.publicKey,
        quoteTokens: await this.context.quoteToken.getAssociatedAddress(caller.publicKey),
        protocol: this.context.protocolPda,
        rfq: this.rfq.account,
        response: this.account,
        quoteMint: this.context.quoteToken.publicKey,
        quoteEscrow: await getQuoteEscrowPda(this.account, this.context.program.programId),
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([caller])
      .remainingAccounts(remainingAccounts)
      .rpc();
  }

  async settle(quoteReceiver: PublicKey, assetReceivers: PublicKey[]) {
    const remainingAccounts = await (
      await Promise.all(
        this.rfq.legs.map(async (x, index) => await x.getSettleAccounts(assetReceivers[index], index, this.rfq, this))
      )
    ).flat();

    await this.context.program.methods
      .settle()
      .accounts({
        protocol: this.context.protocolPda,
        rfq: this.rfq.account,
        response: this.account,
        quoteReceiverTokens: await this.context.quoteToken.getAssociatedAddress(quoteReceiver),
        quoteEscrow: await getQuoteEscrowPda(this.account, this.context.program.programId),
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .remainingAccounts(remainingAccounts)
      .rpc();
  }

  async revertSettlementPreparation(side: { taker: {} } | { maker: {} }) {
    const caller = side == AuthoritySide.Taker ? this.context.taker : this.context.maker;

    const remainingAccounts = await (
      await Promise.all(
        this.rfq.legs.map(
          async (x, index) => await x.getRevertSettlementPreparationAccounts(side, index, this.rfq, this)
        )
      )
    ).flat();

    await this.context.program.methods
      .revertSettlementPreparation(side)
      .accounts({
        protocol: this.context.protocolPda,
        rfq: this.rfq.account,
        response: this.account,
        quoteTokens: await this.context.quoteToken.getAssociatedAddress(caller.publicKey),
        quoteEscrow: await getQuoteEscrowPda(this.account, this.context.program.programId),
        tokenProgram: TOKEN_PROGRAM_ID,
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

  async cleanUp() {
    let remainingAccounts = [];
    if (this.firstToPrepare) {
      remainingAccounts = await (
        await Promise.all(this.rfq.legs.map(async (x, index) => await x.getCleanUpAccounts(index, this.rfq, this)))
      ).flat();
    }

    await this.context.program.methods
      .cleanUpResponse()
      .accounts({
        maker: this.context.maker.publicKey,
        firstToPrepare: this.firstToPrepare,
        protocol: this.context.protocolPda,
        rfq: this.rfq.account,
        response: this.account,
        quoteEscrow: await getQuoteEscrowPda(this.account, this.context.program.programId),
        quoteBackupTokens: await this.context.quoteToken.getAssociatedAddress(this.context.dao.publicKey),
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .remainingAccounts(remainingAccounts)
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

let context: Context | null = null;
export async function getContext() {
  if (context !== null) {
    return context;
  }

  context = new Context();
  await context.initialize();
  await context.initializeProtocol();

  await executeInParallel(
    async () => {
      await SpotInstrument.add(context);
    },
    async () => {
      await FailingInstrument.add(context);
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
    }
  );

  return context;
}
