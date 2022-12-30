import { Program, web3, BN, workspace, AnchorError } from "@project-serum/anchor";
import { ASSOCIATED_TOKEN_PROGRAM_ID, Token, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, Signer, Keypair } from "@solana/web3.js";
import { DEFAULT_INSTRUMENT_AMOUNT, DEFAULT_INSTRUMENT_SIDE } from "../constants";
import { Instrument, InstrumentController } from "../instrument";
import { getInstrumentEscrowPda } from "../pdas";
import { AuthoritySide, AssetIdentifier, InstrumentType } from "../types";
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
import NodeWallet from "@project-serum/anchor/dist/cjs/nodewallet";

import { PsyoptionsAmericanInstrument } from "../../../target/types/psyoptions_american_instrument";

enum OptionType {
  CALL = 0,
  PUT = 1,
}

let rpc = new anchor.web3.Connection("http://localhost:8899");
let payer = anchor.AnchorProvider.env().wallet as anchor.Wallet;
let AnchorProvider = new anchor.AnchorProvider(rpc, payer, anchor.AnchorProvider.defaultOptions());
let psyOptionsAmericanLocalNetProgramId = new anchor.web3.PublicKey("R2y9ip6mxmWUj4pt54jP2hz2dgvMozy9VTSwMWE7evs");
let psyoptionsAmericanInstrumentProgram = null;
export function getAmericanOptionsInstrumentProgram() {
  if (psyoptionsAmericanInstrumentProgram === null) {
    psyoptionsAmericanInstrumentProgram =
      workspace.PsyoptionsAmericanInstrument as Program<PsyoptionsAmericanInstrument>;
  }
  return psyoptionsAmericanInstrumentProgram;
}

export class PsyoptionsAmericanInstrumentClass implements Instrument {
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
    const instrument = new PsyoptionsAmericanInstrumentClass(context, mint, OptionMarket, Optiontype);
    context.assetToken.assertRegistered();
    return new InstrumentController(
      instrument,
      { amount, side: side ?? DEFAULT_INSTRUMENT_SIDE, baseAssetIndex: context.assetToken.baseAssetIndex },
      0
    );
  }

  static async addInstrument(context: Context) {
    await context.addInstrument(getAmericanOptionsInstrumentProgram().programId, false, 2, 7, 3, 3, 4);
    await context.riskEngine.setInstrumentType(getAmericanOptionsInstrumentProgram().programId, InstrumentType.Option);
  }

  serializeInstrumentData(): Buffer {
    let optionMarketKey = AmericanPsyoptions.getOptionMarketByKey(this.context, this.OptionMarket, this.context.maker);
    const mint = this.mint.publicKey.toBytes();
    const optionMarket = this.OptionMarket.toBytes();

    return Buffer.from(new Uint8Array([this.OptionType == OptionType.CALL ? 0 : 1, ...mint, ...optionMarket]));
  }
  getProgramId(): PublicKey {
    return getAmericanOptionsInstrumentProgram().programId;
  }

  async getValidationAccounts() {
    return [
      { pubkey: this.OptionMarket, isSigner: false, isWritable: false },
      { pubkey: this.context.assetToken.mintInfoAddress, isSigner: false, isWritable: false },
    ];
  }

  async getPrepareSettlementAccounts(
    side: { taker: {} } | { maker: {} },
    assetIndentifier: AssetIdentifier,
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
        pubkey: await getInstrumentEscrowPda(response.account, assetIndentifier, this.getProgramId()),
        isSigner: false,
        isWritable: true,
      },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    ];
  }

  async getSettleAccounts(assetReceiver: PublicKey, assetIdentifier: AssetIdentifier, rfq: Rfq, response: Response) {
    return [
      {
        pubkey: await getInstrumentEscrowPda(response.account, assetIdentifier, this.getProgramId()),
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
    assetIdentifier: AssetIdentifier,
    rfq: Rfq,
    response: Response
  ) {
    const caller = side == AuthoritySide.Taker ? this.context.taker : this.context.maker;

    return [
      {
        pubkey: await getInstrumentEscrowPda(response.account, assetIdentifier, this.getProgramId()),
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

  async getCleanUpAccounts(assetIdentifier: AssetIdentifier, rfq: Rfq, response: Response) {
    return [
      {
        pubkey: response.firstToPrepare,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: await getInstrumentEscrowPda(response.account, assetIdentifier, this.getProgramId()),
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
    public context: Context,
    private program = AmericanPsyoptions.createProgramWithProvider(context.maker, context),
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

  public static createProgramWithProvider(user: anchor.web3.Keypair, context: Context) {
    const provider = new anchor.AnchorProvider(
      context.provider.connection,
      new NodeWallet(user),
      anchor.AnchorProvider.defaultOptions()
    );
    let program = createProgram(psyOptionsAmericanLocalNetProgramId, provider);
    return program;
  }

  // public async mintOptions(mintBy: Signer, amount: BN, optionType: OptionType) {}

  public static async initializeMarket(
    program,
    expirationTimestamp: number,
    quoteMintPubkey: PublicKey,
    quoteAmountPerContract: number,
    underlyingAmountPerContract: number,
    underlyingMintPubkey: PublicKey
  ) {
    let ix0 = await instructions.initializeMarket(program, {
      expirationUnixTimestamp: expirationTimestamp,
      quoteMint: quoteMintPubkey,
      quoteAmountPerContract: quoteAmountPerContract,
      underlyingAmountPerContract: underlyingAmountPerContract,
      underlyingMint: underlyingMintPubkey,
    });

    return ix0;
  }

  public static async getOptionMarketByKey(context: Context, optionMarketPubkey: PublicKey, user: Keypair) {
    let program = this.createProgramWithProvider(user, context);
    let optionMarkeyWithkey = await getOptionByKey(program, optionMarketPubkey);
    return optionMarkeyWithkey;
  }

  public static async initalizeNewPsyoptionsAmerican(
    context: Context,
    user: Keypair,
    {
      underlyingMint = context.assetToken,
      quoteMint = context.quoteToken,
      underlyingAmountPerContract = withTokenDecimals(1),
      quoteAmountPerContract = withTokenDecimals(10),
    } = {}
  ) {
    const program = this.createProgramWithProvider(user, context);
    const expiration = new BN(Date.now() / 1000 + 360000); // 1 hour in the future
    const psyOptMarket = await this.initializeMarket(
      program,
      expiration,
      quoteMint.publicKey,
      quoteAmountPerContract,
      underlyingAmountPerContract,
      underlyingMint.publicKey
    );
    let x = await context.provider.connection.confirmTransaction(psyOptMarket.tx);
    let y = await context.provider.connection.getParsedTransaction(psyOptMarket.tx, { commitment: "confirmed" });
    let z = await context.provider.connection.getAccountInfo(psyOptMarket.underlyingAssetPoolKey);

    const [callMint, callWriterMint] = await executeInParallel(
      () => Mint.wrap(context, psyOptMarket.optionMintKey),
      () => Mint.wrap(context, psyOptMarket.writerMintKey)
    );

    return new AmericanPsyoptions(
      context,
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

  public async mintPsyOPtions(mintBy: Signer, amount: anchor.BN, optiontype: OptionType, context: Context) {
    let optionMarketWithKey = await getOptionByKey(this.program, this.optionMarketKey);
    console.log("Option market key is :", this.optionMarketKey.toBase58());

    let ix = await instructions.mintOptionV2Instruction(
      this.program,
      await this.callMint.getAssociatedAddress(mintBy.publicKey),
      await this.callWriterMint.getAssociatedAddress(mintBy.publicKey),
      await this.underlyingMint.getAssociatedAddress(mintBy.publicKey),
      amount,
      optionMarketWithKey
    );

    let tx = new anchor.web3.Transaction();
    ix.signers.push(mintBy);
    tx.add(ix.ix);

    try {
      //
      let signature = await this.context.provider.sendAndConfirm(tx, ix.signers);
      return signature;
    } catch (e) {
      console.error(e);
    }

    console.log("done.... minting");
  }
}
