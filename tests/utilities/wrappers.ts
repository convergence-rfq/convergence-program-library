import * as anchor from "@project-serum/anchor";
import { BN } from "@project-serum/anchor";
import { PublicKey, Keypair, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, Token } from "@solana/spl-token";
import { Rfq as RfqIdl } from "../../target/types/rfq";
import { DummyRiskEngine } from "../../target/types/dummy_risk_engine";
import { SpotInstrument } from "../../target/types/spot_instrument";
import {
  getCollateralInfoPda,
  getCollateralTokenPda,
  getProtocolPda,
  getQuoteEscrowPda,
  getSpotEscrowPda,
} from "./pdas";
import {
  DEFAULT_ACTIVE_WINDOW,
  DEFAULT_COLLATERAL_FUNDED,
  DEFAULT_FEES,
  DEFAULT_ORDER_TYPE,
  DEFAULT_SETTLING_WINDOW,
  DEFAULT_SOL_FOR_SIGNERS,
  DEFAULT_INSTRUMENT_AMOUNT,
  DEFAULT_TOKEN_AMOUNT,
  DEFAULT_INSTRUMENT_SIDE,
} from "./constants";
import { AuthoritySide, getStandartQuote, OrderType, Side } from "./types";

export class Context {
  public program: anchor.Program<RfqIdl>;
  public riskEngine: anchor.Program<DummyRiskEngine>;
  public spotInstrument: anchor.Program<SpotInstrument>;
  public provider: anchor.Provider;
  public dao: Keypair;
  public taker: Keypair;
  public maker: Keypair;
  public assetToken: Token;
  public quoteToken: Token;
  public collateralToken: Token;
  public protocolPda: PublicKey;

  constructor() {
    this.provider = anchor.AnchorProvider.env();
    anchor.setProvider(this.provider);
    this.program = anchor.workspace.Rfq as anchor.Program<RfqIdl>;
    this.riskEngine = anchor.workspace.DummyRiskEngine as anchor.Program<DummyRiskEngine>;
    this.spotInstrument = anchor.workspace.SpotInstrument as anchor.Program<SpotInstrument>;
  }

  async initialize() {
    this.dao = await this.createPayer();
    this.protocolPda = await getProtocolPda(this.program.programId);

    this.assetToken = await this.createMint();
    this.quoteToken = await this.createMint();
    this.collateralToken = await this.createMint();

    this.taker = await this.createPayer();
    await this.createTokenAccountsFor(this.taker.publicKey);
    this.maker = await this.createPayer();
    await this.createTokenAccountsFor(this.maker.publicKey);
  }

  async createPayer() {
    const payer = Keypair.generate();

    await this.provider.connection.confirmTransaction(
      await this.provider.connection.requestAirdrop(payer.publicKey, DEFAULT_SOL_FOR_SIGNERS),
      "confirmed"
    );

    return payer;
  }

  async getAssetTokenAddress(address: PublicKey) {
    return await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      this.assetToken.publicKey,
      address
    );
  }

  async getQuoteTokenAddress(address: PublicKey) {
    return await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      this.quoteToken.publicKey,
      address
    );
  }

  async getCollateralTokenAddress(address: PublicKey) {
    return await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      this.collateralToken.publicKey,
      address
    );
  }

  async getAssetTokenBalance(address: PublicKey) {
    const account = await this.assetToken.getAccountInfo(await this.getAssetTokenAddress(address));
    return account.amount.toNumber();
  }

  async getQuoteTokenBalance(address: PublicKey) {
    const account = await this.quoteToken.getAccountInfo(await this.getQuoteTokenAddress(address));
    return account.amount.toNumber();
  }

  async createMint() {
    return await Token.createMint(this.provider.connection, this.dao, this.dao.publicKey, null, 0, TOKEN_PROGRAM_ID);
  }

  async createPayerWithTokens() {
    const payer = await this.createPayer();
    await this.createTokenAccountsFor(payer.publicKey);

    return payer;
  }

  async createTokenAccountsFor(address: PublicKey) {
    await this.createAccountAndMintTokens(address, "asset");
    await this.createAccountAndMintTokens(address, "quote");
    await this.createAccountAndMintTokens(address, "collateral");
  }

  async createAccountAndMintTokens(address: PublicKey, type: "asset" | "quote" | "collateral", amount?: number) {
    let mint: Token;
    if (type == "asset") {
      mint = this.assetToken;
    } else if (type == "quote") {
      mint = this.quoteToken;
    } else if (type == "collateral") {
      mint = this.collateralToken;
    } else {
      throw new Error("Unsuported type");
    }

    amount = amount ?? DEFAULT_TOKEN_AMOUNT;
    const account = await mint.createAssociatedTokenAccount(address);
    await mint.mintTo(account, this.dao, [], amount);
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

  async addSpotInstrument() {
    await this.program.methods
      .addInstrument(1, 9, 5)
      .accounts({
        authority: this.dao.publicKey,
        protocol: this.protocolPda,
        instrumentProgram: this.spotInstrument.programId,
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
        userTokens: await this.getCollateralTokenAddress(user.publicKey),
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
    orderType = DEFAULT_ORDER_TYPE,
    activeWindow = DEFAULT_ACTIVE_WINDOW,
    settlingWindow = DEFAULT_SETTLING_WINDOW,
  } = {}) {
    legs = legs ?? [
      {
        instrument: this.spotInstrument.programId,
        instrumentData: this.assetToken.publicKey.toBytes(),
        instrument_amount: new BN(DEFAULT_INSTRUMENT_AMOUNT),
        side: DEFAULT_INSTRUMENT_SIDE,
      },
    ];

    const rfq = new Keypair();
    await this.program.methods
      .intitializeRfq(legs, orderType, activeWindow, settlingWindow)
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
      .remainingAccounts([
        { pubkey: this.spotInstrument.programId, isSigner: false, isWritable: false },
        { pubkey: this.assetToken.publicKey, isSigner: false, isWritable: false },
      ])
      .signers([this.taker, rfq])
      .rpc();

    return new Rfq(this, rfq.publicKey);
  }
}

export class Rfq {
  public constructor(public context: Context, public account: PublicKey) {}

  async respond({ bid = getStandartQuote(new BN(1), new BN(1)), ask = null } = {}) {
    const response = new Keypair();

    await this.context.program.methods // @ts-ignore
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

    return new Order(this.context, this, this.context.maker, response.publicKey);
  }

  // async cancel() {
  //   const protocolPda = await getProtocolPda(this.context.program.programId);
  //   await this.context.program.methods
  //     .cancel()
  //     .accounts({
  //       signer: this.context.taker.publicKey,
  //       protocol: protocolPda,
  //       rfq: this.account,
  //     })
  //     .signers([this.context.taker])
  //     .rpc();
  // }

  // async settle(sender: Keypair) {
  //   if (!this.confirmedOrder) {
  //     throw new Error("Unconfirmed RFQ!");
  //   }
  //   const [order, quoteType] = this.confirmedOrder;
  //   const treasuryMint = quoteType.hasOwnProperty("ask") ? this.context.assetToken : this.context.quoteToken;
  //   const treasuryWallet = await treasuryMint.createAccount(this.context.dao.publicKey);

  //   const assetWallet = await this.context.getAssetTokenAddress(sender.publicKey);
  //   const quoteWallet = await this.context.getQuoteTokenAddress(sender.publicKey);
  //   await this.context.program.methods
  //     .settle()
  //     .accounts({
  //       assetEscrow: this.assetEscrow,
  //       assetMint: this.context.assetToken.publicKey,
  //       assetWallet,
  //       signer: sender.publicKey,
  //       order: order.account,
  //       quoteEscrow: this.quoteEscrow,
  //       quoteMint: this.context.quoteToken.publicKey,
  //       quoteWallet,
  //       rfq: this.account,
  //       systemProgram: SystemProgram.programId,
  //       tokenProgram: TOKEN_PROGRAM_ID,
  //       protocol: this.context.protocolPda,
  //       treasuryWallet,
  //       rent: SYSVAR_RENT_PUBKEY,
  //     })
  //     .signers([sender])
  //     .rpc();
  // }

  // async getState() {
  //   return this.context.program.account.rfqState.fetch(this.account);
  // }
}

export class Order {
  constructor(public context: Context, public rfq: Rfq, public maker: Keypair, public account: PublicKey) {}

  async confirm(side = Side.Bid) {
    await this.context.program.methods
      .confirmResponse(side)
      .accounts({
        taker: this.context.taker.publicKey,
        protocol: this.context.protocolPda,
        rfq: this.rfq.account,
        response: this.account,
        collateralInfo: await getCollateralInfoPda(this.context.taker.publicKey, this.context.program.programId),
        collateralToken: await getCollateralTokenPda(this.context.taker.publicKey, this.context.program.programId),
        riskEngine: this.context.riskEngine.programId,
      })
      .signers([this.context.taker])
      .rpc();
  }

  async prepareToSettle(side) {
    const caller = side == AuthoritySide.Taker ? this.context.taker : this.context.maker;

    await this.context.program.methods
      .prepareToSettle(side)
      .accounts({
        caller: caller.publicKey,
        quoteTokens: await this.context.getQuoteTokenAddress(caller.publicKey),
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
      .remainingAccounts([
        { pubkey: this.context.spotInstrument.programId, isSigner: false, isWritable: false },
        { pubkey: caller.publicKey, isSigner: true, isWritable: true },
        { pubkey: await this.context.getAssetTokenAddress(caller.publicKey), isSigner: false, isWritable: true },
        { pubkey: this.rfq.account, isSigner: false, isWritable: false },
        { pubkey: this.account, isSigner: false, isWritable: false },
        { pubkey: this.context.assetToken.publicKey, isSigner: false, isWritable: false },
        {
          pubkey: await getSpotEscrowPda(this.account, 0, this.context.spotInstrument.programId),
          isSigner: false,
          isWritable: true,
        },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
      ])
      .rpc();
  }

  async settle(quoteReceiver: PublicKey, assetReceiver: PublicKey) {
    await this.context.program.methods
      .settle()
      .accounts({
        protocol: this.context.protocolPda,
        rfq: this.rfq.account,
        response: this.account,
        quoteReceiverTokens: await this.context.getQuoteTokenAddress(quoteReceiver),
        quoteEscrow: await getQuoteEscrowPda(this.account, this.context.program.programId),
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .remainingAccounts([
        { pubkey: this.context.spotInstrument.programId, isSigner: false, isWritable: false },
        { pubkey: this.rfq.account, isSigner: false, isWritable: false },
        { pubkey: this.account, isSigner: false, isWritable: false },
        {
          pubkey: await getSpotEscrowPda(this.account, 0, this.context.spotInstrument.programId),
          isSigner: false,
          isWritable: true,
        },
        {
          pubkey: await this.context.getAssetTokenAddress(assetReceiver),
          isSigner: false,
          isWritable: true,
        },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      ])
      .rpc();
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
  await context.addSpotInstrument();

  await context.initializeCollateral(context.taker);
  await context.fundCollateral(context.taker, DEFAULT_COLLATERAL_FUNDED);
  await context.initializeCollateral(context.maker);
  await context.fundCollateral(context.maker, DEFAULT_COLLATERAL_FUNDED);
  return context;
}
