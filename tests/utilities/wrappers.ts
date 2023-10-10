import { BN, Program, Provider, workspace, AnchorProvider, setProvider } from "@coral-xyz/anchor";
import {
  PublicKey,
  Keypair,
  SystemProgram,
  Transaction,
  Signer,
  ConfirmOptions,
  TransactionSignature,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccount,
  mintTo,
  getAccount,
  createMint,
  getAssociatedTokenAddressSync,
  getMint,
} from "@solana/spl-token";
import { Rfq as RfqIdl } from "../../target/types/rfq";
import { getLegEscrowPda, getProtocolPda, getQuoteEscrowPda, getResponsePda, getRfqPda } from "./pdas";
import { DEFAULT_ACTIVE_WINDOW, DEFAULT_ORDER_TYPE, DEFAULT_TOKEN_AMOUNT, DEFAULT_PRICE } from "./constants";
import { Quote, QuoteSide, FixedSize, OrderType } from "./types";
import { executeInParallel, expandComputeUnits, serializeOptionQuote } from "./helpers";
import { loadPubkeyNaming, readKeypair } from "./fixtures";

export class Context {
  public program: Program<RfqIdl>;
  public provider: Provider & {
    sendAndConfirm: (tx: Transaction, signers?: Signer[], opts?: ConfirmOptions) => Promise<TransactionSignature>;
  };

  public protocolPda!: PublicKey;

  public dao!: Keypair;
  public taker!: Keypair;
  public maker!: Keypair;

  public btcToken!: Mint; // price is 20k$ in oracle
  public solToken!: Mint; // price is 30$ in oracle
  public ethToken!: Mint; // price is 2k$ in oracle
  public quoteToken!: Mint;

  public pubkeyToName: { [pubkey: string]: string };
  public nameToPubkey: { [name: string]: PublicKey };

  constructor() {
    this.provider = AnchorProvider.env();
    this.assertProvider();
    setProvider(this.provider);
    this.program = workspace.Rfq as Program<RfqIdl>;

    this.pubkeyToName = {};
    this.nameToPubkey = {};
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

  async basicInitialize() {
    this.protocolPda = await getProtocolPda(this.program.programId);
  }

  async initializeFromFixtures() {
    await this.basicInitialize();

    await executeInParallel(
      async () => {
        this.pubkeyToName = await loadPubkeyNaming();
        for (const key in this.pubkeyToName) {
          const name = this.pubkeyToName[key];
          this.nameToPubkey[name] = new PublicKey(key);
        }
      },
      async () => (this.dao = await readKeypair("dao")),
      async () => (this.taker = await readKeypair("taker")),
      async () => (this.maker = await readKeypair("maker"))
    );

    await executeInParallel(
      async () => (this.btcToken = await Mint.loadExisting(this, this.nameToPubkey["mint-btc"])),
      async () => (this.solToken = await Mint.loadExisting(this, this.nameToPubkey["mint-sol"])),
      async () => (this.ethToken = await Mint.loadExisting(this, this.nameToPubkey["mint-eth"])),
      async () => (this.quoteToken = await Mint.loadExisting(this, this.nameToPubkey["mint-usd-quote"]))
    );
  }

  async initializeProtocol() {
    await this.program.methods
      .initializeProtocol()
      .accounts({
        signer: this.dao.publicKey,
        protocol: this.protocolPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([this.dao])
      .rpc();
  }

  async createRfq({
    leg = this.btcToken,
    quote = this.quoteToken,
    orderType = DEFAULT_ORDER_TYPE,
    fixedSize = FixedSize.None,
    activeWindow = DEFAULT_ACTIVE_WINDOW,
  }: {
    leg?: Mint;
    quote?: Mint;
    orderType?: OrderType;
    fixedSize?: FixedSize;
    activeWindow?: number;
  } = {}) {
    const currentTimestamp = new BN(Math.floor(Date.now() / 1000));
    const rfq = await getRfqPda(
      this.taker.publicKey,
      orderType,
      fixedSize,
      leg,
      quote,
      activeWindow,
      currentTimestamp,
      this.program
    );
    const rfqObject = new Rfq(this, rfq, leg, quote);

    await this.program.methods
      .createRfq(orderType, fixedSize as any, activeWindow, new BN(currentTimestamp))
      .accounts({
        taker: this.taker.publicKey,
        rfq,
        legMint: leg.publicKey,
        quoteMint: quote.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .preInstructions([expandComputeUnits])
      .signers([this.taker])
      .rpc();

    return rfqObject;
  }

  async getProtocolState() {
    return await this.program.account.protocolState.fetch(this.protocolPda);
  }
}

export class Mint {
  public publicKey: PublicKey;

  protected constructor(protected context: Context, public decimals: number, address: PublicKey) {
    this.publicKey = address;
  }

  public static async wrap(context: Context, address: PublicKey) {
    const mintData = await getMint(context.provider.connection, address);
    const mint = new Mint(context, mintData.decimals, address);

    await executeInParallel(
      async () => await mint.createAssociatedTokenAccount(context.taker.publicKey),
      async () => await mint.createAssociatedTokenAccount(context.maker.publicKey),
      async () => await mint.createAssociatedTokenAccount(context.dao.publicKey)
    );

    return mint;
  }

  public static async loadExisting(context: Context, mintAddress: PublicKey) {
    const mintData = await getMint(context.provider.connection, mintAddress);
    const mint = new Mint(context, mintData.decimals, mintAddress);
    return mint;
  }

  public static async create(context: Context, decimals: number, keypair?: Keypair) {
    const token = await createMint(
      context.provider.connection,
      context.dao,
      context.dao.publicKey,
      null,
      decimals,
      keypair
    );
    const mint = new Mint(context, decimals, token);
    await executeInParallel(
      async () => await mint.createAssociatedAccountWithTokens(context.taker.publicKey),
      async () => await mint.createAssociatedAccountWithTokens(context.maker.publicKey),
      async () => await mint.createAssociatedAccountWithTokens(context.dao.publicKey)
    );

    return mint;
  }

  public async createAssociatedAccountWithTokens(address: PublicKey, amount = DEFAULT_TOKEN_AMOUNT) {
    const account = await this.createAssociatedTokenAccount(address);
    await mintTo(
      this.context.provider.connection,
      this.context.dao,
      this.publicKey,
      account,
      this.context.dao,
      amount.mul(new BN(10).pow(new BN(this.decimals))).toString()
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

  public getAssociatedAddress(address: PublicKey) {
    return getAssociatedTokenAddressSync(this.publicKey, address);
  }

  public async getAssociatedBalance(address: PublicKey) {
    const account = await getAccount(this.context.provider.connection, await this.getAssociatedAddress(address));
    return new BN(account.amount);
  }

  public toTokenAmount(amount: number) {
    return new BN(amount * 10 ** this.decimals);
  }
}

export class Rfq {
  public constructor(public context: Context, public account: PublicKey, public leg: Mint, public quote: Mint) {}

  async respond({ bid = null, ask = null }: { bid?: Quote | null; ask?: Quote | null } = {}) {
    if (bid === null && ask === null) {
      bid = Quote.getStandard(DEFAULT_PRICE, this.leg.toTokenAmount(1));
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
        rfq: this.account,
        response,
        systemProgram: SystemProgram.programId,
      })
      .signers([this.context.maker])
      .preInstructions([expandComputeUnits])
      .rpc();

    return new Response(this.context, this, this.context.maker, response);
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
  constructor(public context: Context, public rfq: Rfq, public maker: Keypair, public account: PublicKey) {}

  async confirm({
    side = QuoteSide.Bid,
    legAmount = null,
  }: {
    side?: QuoteSide;
    legAmount?: BN | null;
  } = {}) {
    await this.context.program.methods
      .confirmResponse(side, legAmount)
      .accounts({
        taker: this.context.taker.publicKey,
        rfq: this.rfq.account,
        response: this.account,
        legTokens: this.rfq.leg.getAssociatedAddress(this.context.taker.publicKey),
        legEscrow: getLegEscrowPda(this.account, this.context.program.programId),
        legMint: this.rfq.leg.publicKey,
        quoteTokens: this.rfq.quote.getAssociatedAddress(this.context.taker.publicKey),
        quoteEscrow: getQuoteEscrowPda(this.account, this.context.program.programId),
        quoteMint: this.rfq.quote.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .preInstructions([expandComputeUnits])
      .signers([this.context.taker])
      .rpc();
  }

  async settle() {
    await this.context.program.methods
      .settle()
      .accounts({
        maker: this.context.maker.publicKey,
        taker: this.context.taker.publicKey,
        rfq: this.rfq.account,
        response: this.account,
        takerLegTokens: this.rfq.leg.getAssociatedAddress(this.context.taker.publicKey),
        makerLegTokens: this.rfq.leg.getAssociatedAddress(this.context.maker.publicKey),
        legEscrow: getLegEscrowPda(this.account, this.context.program.programId),
        takerQuoteTokens: this.rfq.quote.getAssociatedAddress(this.context.taker.publicKey),
        makerQuoteTokens: this.rfq.quote.getAssociatedAddress(this.context.maker.publicKey),
        quoteEscrow: getQuoteEscrowPda(this.account, this.context.program.programId),
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .preInstructions([expandComputeUnits])
      .signers([this.context.maker])
      .rpc();
  }

  async unlockResponseCollateral() {
    await this.context.program.methods
      .unlockResponseCollateral()
      .accounts({
        taker: this.context.taker.publicKey,
        rfq: this.rfq.account,
        response: this.account,
        takerLegTokens: this.rfq.leg.getAssociatedAddress(this.context.taker.publicKey),
        legEscrow: getLegEscrowPda(this.account, this.context.program.programId),
        takerQuoteTokens: this.rfq.quote.getAssociatedAddress(this.context.taker.publicKey),
        quoteEscrow: getQuoteEscrowPda(this.account, this.context.program.programId),
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();
  }

  async cleanUp() {
    await this.context.program.methods
      .cleanUpResponse()
      .accounts({
        maker: this.context.maker.publicKey,
        rfq: this.rfq.account,
        response: this.account,
      })
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
