import { Program, web3, BN, workspace } from "@project-serum/anchor";
import { ASSOCIATED_TOKEN_PROGRAM_ID, Token, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, Signer } from "@solana/web3.js";
import { DEFAULT_INSTRUMENT_AMOUNT, DEFAULT_INSTRUMENT_SIDE } from "../constants";
import { Instrument, InstrumentController } from "../instrument";
import { getInstrumentEscrowPda } from "../pdas";
import { AuthoritySide } from "../types";
import { Context, Mint, Response, Rfq } from "../wrappers";
import {
  PsyAmericanIdl,
  PsyAmerican,
  OptionMarket,
  instructions,
  createProgram,
  getOptionByKey,
  OptionMarketWithKey,
} from "@mithraic-labs/psy-american";

import { executeInParallel, withTokenDecimals, sleep } from "../helpers";
import * as Spl from "@solana/spl-token";
import * as anchor from "@project-serum/anchor";
import * as psyoptionAmerican from "@mithraic-labs/psy-american";

enum OptionType {
  CALL = 0,
  PUT = 1,
}

let rpc = new anchor.web3.Connection("http://localhost:8899");
let payer = anchor.AnchorProvider.env().wallet as anchor.Wallet;
let AnchorProvider = new anchor.AnchorProvider(rpc, payer, anchor.AnchorProvider.defaultOptions());
let psyOptionsAmericanLocalNetProgramId = new anchor.web3.PublicKey("77i2wXGdwV5MkV9W6X2T3bXwZwK7tFSDqBdL7XMz5yBF");
let psyoptionsAmericanInstrumentProgram = null;

export function getAmericanOptionsInstrumentProgram() {
  if (psyoptionsAmericanInstrumentProgram === null) {
    psyoptionsAmericanInstrumentProgram = createProgram(psyOptionsAmericanLocalNetProgramId, AnchorProvider);
  }
  return psyoptionsAmericanInstrumentProgram as Program<PsyAmerican>;
}

export class PsyoptionsAmericanInstrument implements Instrument {
  constructor(
    private context: Context,
    private mint: Mint,
    private OptionMarket: PublicKey,
    private OptionType: OptionType
  ) {}

  static create(
    context: Context,
    mint: Mint,
    OptionMarket: PublicKey,
    Optiontype: OptionType,
    { amount = DEFAULT_INSTRUMENT_AMOUNT, side = null } = {}
  ): InstrumentController {
    const instrument = new PsyoptionsAmericanInstrument(context, mint, OptionMarket, Optiontype);
    return new InstrumentController(instrument, amount, side ?? DEFAULT_INSTRUMENT_SIDE);
  }

  static async addInstrument(context: Context) {
    await context.addInstrument(getAmericanOptionsInstrumentProgram().programId, 1, 7, 3, 3, 4);
  }

  serializeLegData(): Buffer {
    const mint = this.mint.publicKey.toBytes();
    const OptionMarket = this.OptionMarket.toBytes();
    return Buffer.from(new Uint8Array([...mint, ...OptionMarket, this.OptionType == OptionType.CALL ? 0 : 1]));
  }

  getProgramId(): PublicKey {
    return getAmericanOptionsInstrumentProgram().programId;
  }

  async getValidationAccounts() {
    return [{ pubkey: this.OptionMarket, isSigner: false, isWritable: false }];
  }

  async getPrepareSettlementAccounts(
    side: { taker: {} } | { maker: {} },
    legIndex: number,
    rfq: Rfq,
    response: Response
  ) {
    const caller = side == AuthoritySide.Taker ? this.context.taker : this.context.maker;

    return [
      { pubkey: caller.publicKey, isSigner: true, isWritable: true },
      {
        pubkey: await Token.getAssociatedTokenAddress(
          ASSOCIATED_TOKEN_PROGRAM_ID,
          TOKEN_PROGRAM_ID,
          this.mint.publicKey,
          caller.publicKey
        ),
        isSigner: false,
        isWritable: true,
      },
      { pubkey: this.mint.publicKey, isSigner: false, isWritable: false },
      {
        pubkey: await getInstrumentEscrowPda(response.account, legIndex, this.getProgramId()),
        isSigner: false,
        isWritable: true,
      },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    ];
  }

  async getSettleAccounts(assetReceiver: PublicKey, legIndex: number, rfq: Rfq, response: Response) {
    return [
      {
        pubkey: await getInstrumentEscrowPda(response.account, legIndex, this.getProgramId()),
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: await this.mint.getAssociatedAddress(assetReceiver),
        isSigner: false,
        isWritable: true,
      },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ];
  }

  async getRevertSettlementPreparationAccounts(
    side: { taker: {} } | { maker: {} },
    legIndex: number,
    rfq: Rfq,
    response: Response
  ) {
    const caller = side == AuthoritySide.Taker ? this.context.taker : this.context.maker;

    return [
      {
        pubkey: await getInstrumentEscrowPda(response.account, legIndex, this.getProgramId()),
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: await this.mint.getAssociatedAddress(caller.publicKey),
        isSigner: false,
        isWritable: true,
      },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ];
  }

  async getCleanUpAccounts(legIndex: number, rfq: Rfq, response: Response) {
    return [
      {
        pubkey: response.firstToPrepare,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: await getInstrumentEscrowPda(response.account, legIndex, this.getProgramId()),
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: await this.mint.getAssociatedAddress(this.context.dao.publicKey),
        isSigner: false,
        isWritable: true,
      },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ];
  }
}

export class AmericanPsyoptions {
  private constructor(
    private program = createProgram(psyOptionsAmericanLocalNetProgramId, AnchorProvider),
    public optionMint: PublicKey,
    public writerMint: PublicKey,
    public optionMarketKey: PublicKey,
    public underlyingMint: Mint,
    public quoteMint: Mint,
    public callMint: Mint,
    public callWriterMint: Mint
  ) {}
  public static createProgram(programId = psyOptionsAmericanLocalNetProgramId, provider = AnchorProvider) {
    let program = createProgram(programId, provider);
    return program;
  }

  // public async mintOptions(mintBy: Signer, amount: BN, optionType: OptionType) {}

  public static async initializeMarket(
    expirationTimestamp: number,
    quoteMintPubkey: PublicKey,
    quoteAmountPerContract: number,
    underlyingAmountPerContract: number,
    underlyingMintPubkey: PublicKey
  ) {
    let program = this.createProgram();
    let ix0 = await instructions.initializeMarket(program, {
      expirationUnixTimestamp: expirationTimestamp,
      quoteMint: quoteMintPubkey,
      quoteAmountPerContract: quoteAmountPerContract,
      underlyingAmountPerContract: underlyingAmountPerContract,
      underlyingMint: underlyingMintPubkey,
    });

    return ix0;
  }

  public static async getOptionMarketByKey(optionMarketPubkey: PublicKey) {
    let program = this.createProgram();
    let optionMarkeyWithkey = await getOptionByKey(program, optionMarketPubkey);
    return optionMarkeyWithkey;
  }

  public static async initalizeNewPsyoptionsAmerican(
    context: Context,
    {
      underlyingMint = context.assetToken,
      quoteMint = context.quoteToken,
      underlyingAmountPerContract = withTokenDecimals(1),
      quoteAmountPerContract = withTokenDecimals(10),
    } = {}
  ) {
    const program = this.createProgram();
    const expiration = new BN(Date.now() / 1000 + 360000); // 1 hour in the future
    const psyOptMarket = await this.initializeMarket(
      expiration,
      quoteMint.publicKey,
      quoteAmountPerContract,
      underlyingAmountPerContract,
      underlyingMint.publicKey
    );
    console.log(psyOptMarket.tx);

    const [callMint, callWriterMint] = await executeInParallel(
      () => Mint.wrap(context, psyOptMarket.optionMintKey),
      () => Mint.wrap(context, psyOptMarket.writerMintKey)
    );

    return new AmericanPsyoptions(
      program,
      psyOptMarket.optionMintKey,
      psyOptMarket.writerMintKey,
      psyOptMarket.optionMarketKey,
      underlyingMint,
      quoteMint,
      callMint,
      callWriterMint
    );
  }

  public async mintPsyOPtions(mintBy: Signer, amount: anchor.BN, optiontype: OptionType) {
    let program = AmericanPsyoptions.createProgram();
    let optionMarketWithKey = await getOptionByKey(program, this.optionMarketKey);
    console.log("Option market key is :", this.optionMarketKey.toBase58());
    console.log("op with key ..", optionMarketWithKey);

    let ix = await instructions.mintOptionV2Instruction(
      program,
      await this.callMint.getAssociatedAddress(mintBy.publicKey),
      await this.callWriterMint.getAssociatedAddress(mintBy.publicKey),
      await this.underlyingMint.getAssociatedAddress(mintBy.publicKey),
      amount,
      optionMarketWithKey
    );

    let tx = new anchor.web3.Transaction();
    ix.signers.push(mintBy);
    tx.add(ix.ix);

    let signature = await anchor.web3.sendAndConfirmTransaction(rpc, tx, ix.signers);
    console.log(signature);

    console.log("done.... minting");

    return signature;
  }
}
