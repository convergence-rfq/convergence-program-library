import { Program, BN, workspace } from "@project-serum/anchor";
import { ASSOCIATED_TOKEN_PROGRAM_ID, Token, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, Signer, Keypair } from "@solana/web3.js";
import { instructions, createProgram, getOptionByKey, OptionMarketWithKey } from "@mithraic-labs/psy-american";
import { DEFAULT_INSTRUMENT_AMOUNT, DEFAULT_INSTRUMENT_SIDE } from "../constants";
import { Instrument, InstrumentController } from "../instrument";
import { getInstrumentEscrowPda } from "../pdas";
import { AuthoritySide, AssetIdentifier, InstrumentType } from "../types";
import { Context, Mint, Response, Rfq } from "../wrappers";
import { executeInParallel, withTokenDecimals } from "../helpers";
import * as anchor from "@project-serum/anchor";
import NodeWallet from "@project-serum/anchor/dist/cjs/nodewallet";

import { PsyoptionsAmericanInstrument } from "../../../target/types/psyoptions_american_instrument";

enum OptionType {
  CALL = 0,
  PUT = 1,
}

const psyOptionsAmericanLocalNetProgramId = new anchor.web3.PublicKey("R2y9ip6mxmWUj4pt54jP2hz2dgvMozy9VTSwMWE7evs");
let psyoptionsAmericanInstrumentProgram = null;
export function getAmericanOptionsInstrumentProgram() {
  if (psyoptionsAmericanInstrumentProgram === null) {
    psyoptionsAmericanInstrumentProgram =
      workspace.PsyoptionsAmericanInstrument as Program<PsyoptionsAmericanInstrument>;
  }
  return psyoptionsAmericanInstrumentProgram;
}

export class PsyoptionsAmericanInstrumentClass implements Instrument {
  constructor(private context: Context, private OptionMarket: AmericanPsyoptions, private OptionType: OptionType) {}

  static create(
    context: Context,
    OptionMarket: AmericanPsyoptions,
    Optiontype: OptionType,
    { amount = DEFAULT_INSTRUMENT_AMOUNT, side = null } = {}
  ): InstrumentController {
    const instrument = new PsyoptionsAmericanInstrumentClass(context, OptionMarket, Optiontype);
    context.assetToken.assertRegistered();
    return new InstrumentController(
      instrument,
      { amount, side: side ?? DEFAULT_INSTRUMENT_SIDE, baseAssetIndex: OptionMarket.underlyingMint.baseAssetIndex },
      0
    );
  }

  static async addInstrument(context: Context) {
    await context.addInstrument(getAmericanOptionsInstrumentProgram().programId, false, 2, 7, 3, 3, 4);
    await context.riskEngine.setInstrumentType(getAmericanOptionsInstrumentProgram().programId, InstrumentType.Option);
  }

  serializeInstrumentData(): Buffer {
    const op = this.OptionMarket.OptionInfo;
    const mint = this.OptionMarket.callMint.publicKey.toBytes();
    const optionMarket = this.OptionMarket.optionMarketKey.toBytes();

    const underlyingamountPerContract = op.underlyingAmountPerContract.toBuffer("le", 8);
    const expirationtime = op.expirationUnixTimestamp.toBuffer("le", 8);
    const strikeprice = op.quoteAmountPerContract.toBuffer("le", 8);
    return Buffer.from(
      new Uint8Array([
        this.OptionType == OptionType.CALL ? 0 : 1,
        ...underlyingamountPerContract,
        ...strikeprice,
        ...expirationtime,
        ...mint,
        ...optionMarket,
      ])
    );
  }
  getProgramId(): PublicKey {
    return getAmericanOptionsInstrumentProgram().programId;
  }

  async getValidationAccounts() {
    return [
      { pubkey: this.OptionMarket.optionMarketKey, isSigner: false, isWritable: false },
      { pubkey: this.OptionMarket.underlyingMint.mintInfoAddress, isSigner: false, isWritable: false },
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
          this.OptionMarket.callMint.publicKey,
          caller.publicKey
        ),
        isSigner: false,
        isWritable: true,
      },
      { pubkey: this.OptionMarket.callMint.publicKey, isSigner: false, isWritable: false },
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
        pubkey: await this.OptionMarket.callMint.getAssociatedAddress(assetReceiver),
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
        pubkey: await this.OptionMarket.callMint.getAssociatedAddress(caller.publicKey),
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
        pubkey: await this.OptionMarket.callMint.getAssociatedAddress(this.context.dao.publicKey),
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
    public callWriterMint: Mint,
    public OptionInfo: OptionMarketWithKey
  ) {}

  public static createProgramWithProvider(user: anchor.web3.Keypair, context: Context) {
    const provider = new anchor.AnchorProvider(
      context.provider.connection,
      new NodeWallet(user),
      anchor.AnchorProvider.defaultOptions()
    );
    let program = createProgram(psyOptionsAmericanLocalNetProgramId, provider);
    return program;
  }

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
      quoteAmountPerContract = withTokenDecimals(100),
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
      callWriterMint,
      await getOptionByKey(program, psyOptMarket.optionMarketKey)
    );
  }

  public async mintPsyOPtions(mintBy: Signer, amount: anchor.BN, optiontype: OptionType, context: Context) {
    let optionMarketWithKey = await getOptionByKey(this.program, this.optionMarketKey);
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

    let signature = await this.context.provider.sendAndConfirm(tx, ix.signers);
    return signature;
  }
}