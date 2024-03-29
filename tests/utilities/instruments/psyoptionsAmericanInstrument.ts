import { Program, BN, workspace, Wallet } from "@coral-xyz/anchor";
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from "@solana/spl-token";
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, Signer, Keypair } from "@solana/web3.js";
import { instructions, createProgram, getOptionByKey, OptionMarketWithKey } from "@mithraic-labs/psy-american";
import { DEFAULT_LEG_AMOUNT, DEFAULT_LEG_SIDE } from "../constants";
import { Instrument, InstrumentController } from "../instrument";
import { getInstrumentEscrowPda } from "../pdas";
import { AuthoritySide, AssetIdentifier, LegSide } from "../types";
import { Context, Mint, Response, Rfq } from "../wrappers";
import { executeInParallel, withTokenDecimals } from "../helpers";
import * as anchor from "@coral-xyz/anchor";

import { PsyoptionsAmericanInstrument } from "../../../target/types/psyoptions_american_instrument";

enum OptionType {
  CALL = 0,
  PUT = 1,
}

const psyOptionsAmericanLocalNetProgramId = new anchor.web3.PublicKey("R2y9ip6mxmWUj4pt54jP2hz2dgvMozy9VTSwMWE7evs");
let psyoptionsAmericanInstrumentProgram: Program<PsyoptionsAmericanInstrument> | null = null;
export function getAmericanOptionsInstrumentProgram() {
  if (psyoptionsAmericanInstrumentProgram === null) {
    psyoptionsAmericanInstrumentProgram =
      workspace.PsyoptionsAmericanInstrument as Program<PsyoptionsAmericanInstrument>;
  }
  return psyoptionsAmericanInstrumentProgram;
}

export class PsyoptionsAmericanInstrumentClass implements Instrument {
  static instrumentIndex = 2;

  constructor(private context: Context, private OptionMarket: AmericanPsyoptions, private OptionType: OptionType) {}

  static create(
    context: Context,
    optionMarket: AmericanPsyoptions,
    optionType: OptionType,
    {
      amount = DEFAULT_LEG_AMOUNT,
      side = DEFAULT_LEG_SIDE,
    }: {
      amount?: BN;
      side?: LegSide;
    } = {}
  ): InstrumentController<PsyoptionsAmericanInstrumentClass> {
    const optionInfoClone: OptionMarketWithKey = Object.assign({}, optionMarket.OptionInfo);
    if (optionType === OptionType.PUT) {
      optionInfoClone.underlyingAmountPerContract = optionMarket.OptionInfo.quoteAmountPerContract;
      optionInfoClone.quoteAmountPerContract = optionMarket.OptionInfo.underlyingAmountPerContract;
      optionInfoClone.underlyingAssetMint = optionMarket.OptionInfo.quoteAssetMint;
      optionInfoClone.quoteAssetMint = optionMarket.OptionInfo.underlyingAssetMint;
    }
    const optionMarketClone: AmericanPsyoptions = Object.assign({}, optionMarket);
    optionMarketClone.OptionInfo = optionInfoClone;
    const instrument = new PsyoptionsAmericanInstrumentClass(context, optionMarketClone, optionType);
    optionMarketClone.underlyingMint.assertRegisteredAsBaseAsset();
    return new InstrumentController(
      instrument,
      {
        amount,
        side: side,
        baseAssetIndex: optionMarketClone.underlyingMint.baseAssetIndex,
      },
      0
    );
  }

  getInstrumentIndex(): number {
    return PsyoptionsAmericanInstrumentClass.instrumentIndex;
  }

  static async addInstrument(context: Context) {
    await context.addInstrument(getAmericanOptionsInstrumentProgram().programId, false, 3, 7, 3, 3, 4);
  }

  serializeInstrumentData(): Buffer {
    const op = this.OptionMarket.OptionInfo;
    const mint = this.OptionMarket.optionMint.publicKey.toBytes();
    const optionMarket = this.OptionMarket.optionMarketKey.toBytes();

    const underlyingamountPerContract = op.underlyingAmountPerContract.toBuffer("le", 8);
    const underlyingAmountPerContractDecimals = this.OptionMarket.underlyingMint.decimals;
    const strikePrice = op.quoteAmountPerContract.toBuffer("le", 8);
    const strikePriceDecimals = this.OptionMarket.quoteMint.decimals;
    const expirationTime = op.expirationUnixTimestamp.toBuffer("le", 8);
    return Buffer.from(
      new Uint8Array([
        this.OptionType == OptionType.CALL ? 0 : 1,
        ...underlyingamountPerContract,
        underlyingAmountPerContractDecimals,
        ...strikePrice,
        strikePriceDecimals,
        ...expirationTime,
        ...mint,
        ...optionMarket,
      ])
    );
  }

  serializeInstrumentDataForQuote(): Buffer {
    throw Error("Does not support being in quote!");
  }

  getProgramId(): PublicKey {
    return getAmericanOptionsInstrumentProgram().programId;
  }

  async getValidationAccounts() {
    this.OptionMarket.underlyingMint.assertRegistered();
    this.OptionMarket.quoteMint.assertRegistered();
    return [
      {
        pubkey: this.OptionMarket.optionMarketKey,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: this.OptionMarket.underlyingMint.mintInfoAddress,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: this.OptionMarket.quoteMint.mintInfoAddress,
        isSigner: false,
        isWritable: false,
      },
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
        pubkey: await getAssociatedTokenAddress(this.OptionMarket.optionMint.publicKey, caller.publicKey),
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: this.OptionMarket.optionMint.publicKey,
        isSigner: false,
        isWritable: false,
      },
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
        pubkey: await this.OptionMarket.optionMint.getAssociatedAddress(assetReceiver),
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
        pubkey: await this.OptionMarket.optionMint.getAssociatedAddress(caller.publicKey),
        isSigner: false,
        isWritable: true,
      },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ];
  }

  async getCleanUpAccounts(assetIdentifier: AssetIdentifier, rfq: Rfq, response: Response) {
    return [
      {
        pubkey: response.firstToPrepare!,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: await getInstrumentEscrowPda(response.account, assetIdentifier, this.getProgramId()),
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: await this.OptionMarket.optionMint.getAssociatedAddress(this.context.dao.publicKey),
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
    public optionMint: Mint,
    public writerMint: Mint,
    public optionMarketKey: PublicKey,
    public underlyingMint: Mint,
    public quoteMint: Mint,
    public OptionInfo: OptionMarketWithKey
  ) {}

  private static createProgramWithProvider(user: anchor.web3.Keypair, context: Context) {
    const provider = new anchor.AnchorProvider(
      context.provider.connection,
      new Wallet(user),
      anchor.AnchorProvider.defaultOptions()
    );
    return createProgram(psyOptionsAmericanLocalNetProgramId, provider);
  }

  private static async initializeMarket(
    // @ts-ignore
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
      underlyingMint = context.btcToken,
      quoteMint = context.quoteToken,
      underlyingAmountPerContract = withTokenDecimals(1),
      quoteAmountPerContract = withTokenDecimals(30),
      optionType = OptionType.CALL,
    } = {}
  ) {
    const program = this.createProgramWithProvider(user, context);
    const expiration = new BN(Date.now() / 1000 + 360000); // 1 hour in the future
    let psyOptMarket = await this.initializeMarket(
      program,
      expiration,
      quoteMint.publicKey,
      quoteAmountPerContract,
      underlyingAmountPerContract,
      underlyingMint.publicKey
    );
    if (optionType == OptionType.PUT) {
      psyOptMarket = await this.initializeMarket(
        program,
        expiration,
        underlyingMint.publicKey,
        underlyingAmountPerContract,
        quoteAmountPerContract,
        quoteMint.publicKey
      );
    }

    const [optionMint, writerMint] = await executeInParallel(
      () => Mint.wrap(context, psyOptMarket.optionMintKey),
      () => Mint.wrap(context, psyOptMarket.writerMintKey)
    );

    const market = await getOptionByKey(program, psyOptMarket.optionMarketKey);
    if (market === null) {
      throw Error(`Option market haven't been found!`);
    }

    return new AmericanPsyoptions(
      context,
      program,
      optionMint,
      writerMint,
      psyOptMarket.optionMarketKey,
      underlyingMint,
      quoteMint,
      market
    );
  }

  public async mintPsyOptions(mintBy: Signer, amount: anchor.BN, optionType: OptionType) {
    let ix = await instructions.mintOptionV2Instruction(
      this.program,
      await this.optionMint.getAssociatedAddress(mintBy.publicKey),
      await this.writerMint.getAssociatedAddress(mintBy.publicKey),
      await this.underlyingMint.getAssociatedAddress(mintBy.publicKey),
      amount,
      this.OptionInfo
    );

    if (optionType == OptionType.PUT) {
      ix = await instructions.mintOptionV2Instruction(
        this.program,
        await this.optionMint.getAssociatedAddress(mintBy.publicKey),
        await this.writerMint.getAssociatedAddress(mintBy.publicKey),
        await this.quoteMint.getAssociatedAddress(mintBy.publicKey),
        amount,
        this.OptionInfo
      );
    }
    let tx = new anchor.web3.Transaction();
    ix.signers.push(mintBy);
    tx.add(ix.ix);

    let signature = await this.context.provider.sendAndConfirm(tx, ix.signers);
    return signature;
  }
}
