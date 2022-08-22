import * as anchor from "@project-serum/anchor";
import { BN } from "@project-serum/anchor";
import { PublicKey, Keypair, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, Token } from "@solana/spl-token";
import { Rfq as RfqIdl } from "../../target/types/rfq";
import { DummyRiskEngine } from "../../target/types/dummy_risk_engine";
import { SpotInstrument } from "../../target/types/spot_instrument";
import { getProtocolPda } from "./pdas";
import { DEFAULT_FEES, DEFAULT_SOL_FOR_SIGNERS, DEFAULT_TOKEN_AMOUNT } from "./constants";

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
    // this.riskEngine = anchor.workspace.DummyRiskEngine as anchor.Program<DummyRiskEngine>;
    // this.spotInstrument = anchor.workspace.SpotInstrument as anchor.Program<SpotInstrument>;
  }

  async initialize() {
    this.dao = await this.createPayer();

    this.assetToken = await this.createMint();
    this.quoteToken = await this.createMint();
    this.collateralToken = await this.createMint();

    this.taker = await this.createPayer();
    await this.createTokenAccountsFor(this.taker.publicKey);
    this.maker = await this.createPayer();
    await this.createTokenAccountsFor(this.maker.publicKey);

    this.protocolPda = await getProtocolPda(this.program.programId);
  }

  async createPayer() {
    const payer = Keypair.generate();

    await this.provider.connection.requestAirdrop(payer.publicKey, DEFAULT_SOL_FOR_SIGNERS);

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

  async getAssetTokenBalance(address: PublicKey) {
    const account = await this.assetToken.getAccountInfo(await this.getAssetTokenAddress(address));
    return account.amount.toNumber();
  }

  async getQuoteTokenBalance(address: PublicKey) {
    const account = await this.quoteToken.getAccountInfo(await this.getQuoteTokenAddress(address));
    return account.amount.toNumber();
  }

  async getQuoteTokenAddress(address: PublicKey) {
    return await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      this.quoteToken.publicKey,
      address
    );
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
  }

  async createAccountAndMintTokens(address: PublicKey, type: "asset" | "quote", amount?: number) {
    let mint: Token;
    if (type == "asset") {
      mint = this.assetToken;
    } else if (type == "quote") {
      mint = this.quoteToken;
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

  // async request({
  //   expiry = getTimestampInFuture(100),
  //   lastLook = false,
  //   legs = [],
  //   orderAmount = DEFAULT_ORDER_AMOUNT,
  //   orderType = OrderType.TwoWay,
  // } = {}) {
  //   const rfqPda = await getRfqPda(
  //     this.program.programId,
  //     this.taker.publicKey,
  //     this.assetToken.publicKey,
  //     this.quoteToken.publicKey,
  //     orderAmount,
  //     expiry
  //   );
  //   const assetEscrow = await getAssetEscrowPda(this.program.programId, rfqPda);
  //   const quoteEscrow = await getQuoteEscrowPda(this.program.programId, rfqPda);

  //   await this.program.methods
  //     .request(null, new BN(expiry), lastLook, legs, new BN(orderAmount), orderType)
  //     .accounts({
  //       assetEscrow,
  //       assetMint: this.assetToken.publicKey,
  //       signer: this.taker.publicKey,
  //       protocol: this.protocolPda,
  //       quoteEscrow,
  //       quoteMint: this.quoteToken.publicKey,
  //       rent: SYSVAR_RENT_PUBKEY,
  //       rfq: rfqPda,
  //       systemProgram: SystemProgram.programId,
  //       tokenProgram: TOKEN_PROGRAM_ID,
  //     })
  //     .signers([this.taker])
  //     .rpc();

  //   return await Rfq.create(this, rfqPda);
  // }
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
  return context;
}
