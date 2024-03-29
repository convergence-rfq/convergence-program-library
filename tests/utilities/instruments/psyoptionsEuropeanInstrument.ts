import { Program, web3, BN, workspace } from "@coral-xyz/anchor";
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, Signer } from "@solana/web3.js";
import { DEFAULT_LEG_AMOUNT, DEFAULT_LEG_SIDE } from "../constants";
import { Instrument, InstrumentController } from "../instrument";
import { getInstrumentEscrowPda } from "../pdas";
import { AssetIdentifier, AuthoritySide, LegSide } from "../types";
import { Context, Mint, Response, Rfq } from "../wrappers";
import { PsyoptionsEuropeanInstrument as PsyoptionsEuropeanInstrumentIdl } from "../../../target/types/psyoptions_european_instrument";
import { executeInParallel, withTokenDecimals } from "../helpers";
import {
  CONTRACT_DECIMALS_BN,
  EuroMeta,
  OptionType,
  programId as euroOptionsProgramId,
  instructions,
  createProgramFromProvider,
} from "@mithraic-labs/tokenized-euros";
import { IDL as PseudoPythIdl, Pyth } from "../../dependencies/pseudo_pyth_idl";
const { createEuroMetaInstruction, initializeAllAccountsInstructions, mintOptions } = instructions;

let psyoptionsEuropeanInstrumentProgram: Program<PsyoptionsEuropeanInstrumentIdl> | null = null;
export function getEuroOptionsInstrumentProgram(): Program<PsyoptionsEuropeanInstrumentIdl> {
  if (psyoptionsEuropeanInstrumentProgram === null) {
    psyoptionsEuropeanInstrumentProgram =
      workspace.PsyoptionsEuropeanInstrument as Program<PsyoptionsEuropeanInstrumentIdl>;
  }
  return psyoptionsEuropeanInstrumentProgram;
}

export class PsyoptionsEuropeanInstrument implements Instrument {
  static instrumentIndex = 1;

  constructor(private context: Context, private optionFacade: EuroOptionsFacade, private optionType: OptionType) {}

  static create(
    context: Context,
    optionFacade: EuroOptionsFacade,
    optionType: OptionType,
    {
      amount = DEFAULT_LEG_AMOUNT,
      side = DEFAULT_LEG_SIDE,
    }: {
      amount?: BN;
      side?: LegSide;
    } = {}
  ): InstrumentController<PsyoptionsEuropeanInstrument> {
    const instrument = new PsyoptionsEuropeanInstrument(context, optionFacade, optionType);
    optionFacade.underlyingMint.assertRegisteredAsBaseAsset();
    return new InstrumentController(
      instrument,
      { amount, side, baseAssetIndex: optionFacade.underlyingMint.baseAssetIndex },
      4
    );
  }

  getInstrumentIndex(): number {
    return PsyoptionsEuropeanInstrument.instrumentIndex;
  }

  static async addInstrument(context: Context) {
    await context.addInstrument(getEuroOptionsInstrumentProgram().programId, false, 2, 7, 3, 3, 4);
  }

  serializeInstrumentData(): Buffer {
    const mint = this.getOptionMint().publicKey.toBytes();
    const meta = this.optionFacade.metaKey.toBytes();
    const underlyingAmountPerContract = this.optionFacade.meta.underlyingAmountPerContract.toBuffer("le", 8);
    const underlyingAmountPerContractDecimals = this.optionFacade.meta.underlyingDecimals;
    const strikePrice = this.optionFacade.meta.strikePrice.toBuffer("le", 8);
    const strikePriceDecimals = this.optionFacade.meta.priceDecimals;
    const expirationTimestamp = this.optionFacade.meta.expiration.toBuffer("le", 8);

    return Buffer.from(
      new Uint8Array([
        this.optionType == OptionType.CALL ? 0 : 1,
        ...underlyingAmountPerContract,
        underlyingAmountPerContractDecimals,
        ...strikePrice,
        strikePriceDecimals,
        ...expirationTimestamp,
        ...mint,
        ...meta,
      ])
    );
  }

  serializeInstrumentDataForQuote(): Buffer {
    throw Error("Does not support being in quote!");
  }

  getProgramId(): PublicKey {
    return getEuroOptionsInstrumentProgram().programId;
  }

  async getValidationAccounts() {
    this.optionFacade.underlyingMint.assertRegistered();
    return [
      { pubkey: this.optionFacade.metaKey, isSigner: false, isWritable: false },
      { pubkey: this.optionFacade.underlyingMint.mintInfoAddress, isSigner: false, isWritable: false },
    ];
  }

  async getPrepareSettlementAccounts(
    side: { taker: {} } | { maker: {} },
    assetIdentifier: AssetIdentifier,
    rfq: Rfq,
    response: Response
  ) {
    const caller = side == AuthoritySide.Taker ? this.context.taker : this.context.maker;

    return [
      { pubkey: caller.publicKey, isSigner: true, isWritable: true },
      {
        pubkey: await getAssociatedTokenAddress(this.getOptionMint().publicKey, caller.publicKey),
        isSigner: false,
        isWritable: true,
      },
      { pubkey: this.getOptionMint().publicKey, isSigner: false, isWritable: false },
      {
        pubkey: await getInstrumentEscrowPda(response.account, assetIdentifier, this.getProgramId()),
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
        pubkey: await this.getOptionMint().getAssociatedAddress(assetReceiver),
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
        pubkey: await this.getOptionMint().getAssociatedAddress(caller.publicKey),
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
        pubkey: await this.getOptionMint().getAssociatedAddress(this.context.dao.publicKey),
        isSigner: false,
        isWritable: true,
      },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ];
  }

  getOptionMint() {
    if (this.optionType == OptionType.CALL) {
      return this.optionFacade.callMint;
    } else {
      return this.optionFacade.putMint;
    }
  }
}

export class EuroOptionsFacade {
  private constructor(
    private context: Context,
    public meta: EuroMeta,
    public metaKey: PublicKey,
    public underlyingMint: Mint,
    public stableMint: Mint,
    public callMint: Mint,
    public callWriterMint: Mint,
    public putMint: Mint,
    public putWriterMint: Mint
  ) {}

  async mintOptions(mintBy: Signer, amount: BN, optionType: OptionType) {
    const { instruction } = await mintOptions(
      EuroOptionsFacade.getEuroOptionsProgram(this.context),
      this.metaKey,
      this.meta,
      optionType == OptionType.CALL
        ? await this.underlyingMint.getAssociatedAddress(mintBy.publicKey)
        : await this.stableMint.getAssociatedAddress(mintBy.publicKey),
      optionType == OptionType.CALL
        ? await this.callMint.getAssociatedAddress(mintBy.publicKey)
        : await this.putMint.getAssociatedAddress(mintBy.publicKey),
      optionType == OptionType.CALL
        ? await this.callWriterMint.getAssociatedAddress(mintBy.publicKey)
        : await this.putWriterMint.getAssociatedAddress(mintBy.publicKey),
      amount.mul(CONTRACT_DECIMALS_BN),
      optionType
    );
    // change signer
    instruction.keys[0] = { pubkey: mintBy.publicKey, isSigner: true, isWritable: false };
    const transaction = new web3.Transaction().add(instruction);
    await this.context.provider.sendAndConfirm(transaction, [mintBy]);
  }

  public static async initalizeNewOptionMeta(
    context: Context,
    {
      underlyingMint = context.btcToken,
      stableMint = context.quoteToken,
      underlyingPerContract = withTokenDecimals(1),
      strikePrice = withTokenDecimals(20000),
      expireIn = 3600,
    } = {}
  ) {
    const program = this.getEuroOptionsProgram(context);
    const pseudoPythProgram = new Program(
      PseudoPythIdl,
      new PublicKey("FsJ3A3u2vn5cTVofAjvy6y5kwABJAqYWpe4975bi2epH"),
      context.provider
    );

    const oracle = await EuroOptionsFacade.createPriceFeed({
      oracleProgram: pseudoPythProgram,
      initPrice: 50_000,
      confidence: null,
    });

    const expiration = new BN(Date.now() / 1000 + expireIn); // 1 hour in the future
    const { instructions: preparationIxs } = await initializeAllAccountsInstructions(
      program,
      underlyingMint.publicKey,
      stableMint.publicKey,
      oracle,
      expiration,
      9
    );
    const {
      instruction: ix,
      euroMeta,
      euroMetaKey,
    } = await createEuroMetaInstruction(
      program,
      underlyingMint.publicKey,
      underlyingMint.decimals,
      stableMint.publicKey,
      stableMint.decimals,
      expiration,
      underlyingPerContract,
      strikePrice,
      9,
      oracle
    );
    const transaction = new web3.Transaction().add(...preparationIxs, ix);
    await context.provider.sendAndConfirm(transaction);

    const [callMint, callWriterMint, putMint, putWriterMint] = await executeInParallel(
      () => Mint.wrap(context, euroMeta.callOptionMint),
      () => Mint.wrap(context, euroMeta.callWriterMint),
      () => Mint.wrap(context, euroMeta.putOptionMint),
      () => Mint.wrap(context, euroMeta.putWriterMint)
    );

    return new EuroOptionsFacade(
      context,
      euroMeta,
      euroMetaKey,
      underlyingMint,
      stableMint,
      callMint,
      callWriterMint,
      putMint,
      putWriterMint
    );
  }

  private static createPriceFeed = async ({
    oracleProgram,
    initPrice,
    confidence,
    expo = -4,
  }: {
    oracleProgram: Program<Pyth>;
    initPrice: number;
    confidence?: BN;
    expo?: BN;
  }) => {
    const conf = confidence || new BN((initPrice / 10) * 10 ** -expo);
    const collateralTokenFeed = new web3.Account();
    await oracleProgram.rpc.initialize(new BN(initPrice * 10 ** -expo), expo, conf, {
      accounts: { price: collateralTokenFeed.publicKey },
      signers: [collateralTokenFeed],
      instructions: [
        web3.SystemProgram.createAccount({
          fromPubkey: oracleProgram.provider.publicKey as PublicKey,
          newAccountPubkey: collateralTokenFeed.publicKey,
          space: 3312,
          lamports: await oracleProgram.provider.connection.getMinimumBalanceForRentExemption(3312),
          programId: oracleProgram.programId,
        }),
      ],
    });
    return collateralTokenFeed.publicKey;
  };

  private static getEuroOptionsProgram(context: Context) {
    return createProgramFromProvider(context.provider, new PublicKey(euroOptionsProgramId));
  }
}
