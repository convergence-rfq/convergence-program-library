import * as anchor from "@project-serum/anchor";
import { BN } from "@project-serum/anchor";
import { PublicKey, Keypair, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, Token } from "@solana/spl-token";
import { Rfq as RfqIdl } from "../../target/types/rfq";
import { DummyRiskEngine } from "../../target/types/dummy_risk_engine";
import { SpotInstrument } from "../../target/types/spot_instrument";
import { getCollateralInfoPda, getCollateralTokenPda, getProtocolPda } from "./pdas";
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
import { OrderType } from "./types";

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
  }
}

// export class Rfq {
//   public assetEscrow: PublicKey;
//   public quoteEscrow: PublicKey;
//   public confirmedOrder?: [Order, any /* Quote type instance */];

//   private constructor(public context: Context, public account: PublicKey) {}

//   static async create(context: Context, account: PublicKey) {
//     const result = new Rfq(context, account);
//     result.assetEscrow = await getAssetEscrowPda(context.program.programId, account);
//     result.quoteEscrow = await getQuoteEscrowPda(context.program.programId, account);
//     return result;
//   }

//   async respond({ maker = null, bidAmount = DEFAULT_BID_AMOUNT, askAmount = DEFAULT_ASK_AMOUNT } = {}) {
//     maker = maker ?? (await this.context.createPayerWithTokens());
//     const assetWallet = await this.context.getAssetTokenAddress(maker.publicKey);
//     const quoteWallet = await this.context.getQuoteTokenAddress(maker.publicKey);
//     const orderPda = await getOrderPda(
//       this.context.program.programId,
//       maker.publicKey,
//       this.account,
//       bidAmount,
//       askAmount
//     );

//     await this.context.program.methods
//       .respond(bidAmount ? new BN(bidAmount) : null, askAmount ? new BN(askAmount) : null)
//       .accounts({
//         assetMint: this.context.assetToken.publicKey,
//         assetWallet,
//         signer: maker.publicKey,
//         assetEscrow: this.assetEscrow,
//         quoteEscrow: this.quoteEscrow,
//         order: orderPda,
//         quoteMint: this.context.quoteToken.publicKey,
//         quoteWallet,
//         rent: SYSVAR_RENT_PUBKEY,
//         rfq: this.account,
//         systemProgram: SystemProgram.programId,
//         tokenProgram: TOKEN_PROGRAM_ID,
//       })
//       .signers([maker])
//       .rpc();

//     return new Order(this.context, this, maker, orderPda);
//   }

//   async cancel() {
//     const protocolPda = await getProtocolPda(this.context.program.programId);
//     await this.context.program.methods
//       .cancel()
//       .accounts({
//         signer: this.context.taker.publicKey,
//         protocol: protocolPda,
//         rfq: this.account,
//       })
//       .signers([this.context.taker])
//       .rpc();
//   }

//   async settle(sender: Keypair) {
//     if (!this.confirmedOrder) {
//       throw new Error("Unconfirmed RFQ!");
//     }
//     const [order, quoteType] = this.confirmedOrder;
//     const treasuryMint = quoteType.hasOwnProperty("ask") ? this.context.assetToken : this.context.quoteToken;
//     const treasuryWallet = await treasuryMint.createAccount(this.context.dao.publicKey);

//     const assetWallet = await this.context.getAssetTokenAddress(sender.publicKey);
//     const quoteWallet = await this.context.getQuoteTokenAddress(sender.publicKey);
//     await this.context.program.methods
//       .settle()
//       .accounts({
//         assetEscrow: this.assetEscrow,
//         assetMint: this.context.assetToken.publicKey,
//         assetWallet,
//         signer: sender.publicKey,
//         order: order.account,
//         quoteEscrow: this.quoteEscrow,
//         quoteMint: this.context.quoteToken.publicKey,
//         quoteWallet,
//         rfq: this.account,
//         systemProgram: SystemProgram.programId,
//         tokenProgram: TOKEN_PROGRAM_ID,
//         protocol: this.context.protocolPda,
//         treasuryWallet,
//         rent: SYSVAR_RENT_PUBKEY,
//       })
//       .signers([sender])
//       .rpc();
//   }

//   async getState() {
//     return this.context.program.account.rfqState.fetch(this.account);
//   }
// }

// export class Order {
//   constructor(public context: Context, public rfq: Rfq, public maker: Keypair, public account: PublicKey) {}

//   async confirm(quoteType = QuoteType.Bid) {
//     const takerAddress = this.context.taker.publicKey;
//     const assetWallet = await this.context.getAssetTokenAddress(takerAddress);
//     const quoteWallet = await this.context.getQuoteTokenAddress(takerAddress);

//     await this.context.program.methods
//       .confirm(quoteType)
//       .accounts({
//         assetMint: this.context.assetToken.publicKey,
//         assetWallet,
//         signer: this.context.taker.publicKey,
//         assetEscrow: this.rfq.assetEscrow,
//         order: this.account,
//         quoteWallet,
//         quoteEscrow: this.rfq.quoteEscrow,
//         quoteMint: this.context.quoteToken.publicKey,
//         rent: SYSVAR_RENT_PUBKEY,
//         rfq: this.rfq.account,
//         systemProgram: SystemProgram.programId,
//         tokenProgram: TOKEN_PROGRAM_ID,
//       })
//       .signers([this.context.taker])
//       .rpc();

//     this.rfq.confirmedOrder = [this, quoteType];
//   }

//   async returnCollateral() {
//     const assetWallet = await this.context.getAssetTokenAddress(this.maker.publicKey);
//     const quoteWallet = await this.context.getQuoteTokenAddress(this.maker.publicKey);

//     await this.context.program.methods
//       .returnCollateral()
//       .accounts({
//         assetEscrow: this.rfq.assetEscrow,
//         assetMint: this.context.assetToken.publicKey,
//         assetWallet,
//         signer: this.maker.publicKey,
//         order: this.account,
//         quoteEscrow: this.rfq.quoteEscrow,
//         quoteWallet,
//         quoteMint: this.context.quoteToken.publicKey,
//         rent: SYSVAR_RENT_PUBKEY,
//         rfq: this.rfq.account,
//         tokenProgram: TOKEN_PROGRAM_ID,
//       })
//       .signers([this.maker])
//       .rpc();
//   }

//   async lastLook() {
//     await this.context.program.methods
//       .lastLook()
//       .accounts({
//         signer: this.maker.publicKey,
//         order: this.account,
//         rfq: this.rfq.account,
//       })
//       .signers([this.maker])
//       .rpc();
//   }

//   async getState() {
//     return this.context.program.account.orderState.fetch(this.account);
//   }
// }

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
