import { Program, web3, BN, workspace } from "@project-serum/anchor";
import { ASSOCIATED_TOKEN_PROGRAM_ID, Token, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, Signer } from "@solana/web3.js";
import { DEFAULT_INSTRUMENT_AMOUNT, DEFAULT_INSTRUMENT_SIDE } from "../constants";
import { Instrument, InstrumentController } from "../instrument";
import { getInstrumentEscrowPda } from "../pdas";
import { AuthoritySide } from "../types";
import { Context, Mint, Response, Rfq } from "../wrappers";
import { PsyoptionsAmericanInstrument as PsyoptionsAmericanInstrumentIdl } from "../../../target/types/psyoptions_american_instrument";
import { executeInParallel, withTokenDecimals } from "../helpers";
import {
  CONTRACT_DECIMALS_BN,
  EuroMeta,
  EuroPrimitive,
  IDL as EuroOptionsIdl,
  OptionType,
  programId as euroOptionsProgramId,
} from "../../dependencies/tokenized-euros/src";
import { IDL as PseudoPythIdl } from "../../dependencies/pseudo_pyth_idl";
import {
  createEuroMetaInstruction,
  initializeAllAccountsInstructions,
  mintOptions,
} from "../../dependencies/tokenized-euros/src/instructions";

let psyoptionsAmericanInstrumentProgram = null;
export function getEuroOptionsInstrumentProgram(): Program<PsyoptionsAmericanInstrumentIdl> {
  if (psyoptionsAmericanInstrumentProgram === null) {
    psyoptionsAmericanInstrumentProgram =
      workspace.PsyoptionsAmericanInstrument as Program<PsyoptionsAmericanInstrumentIdl>;
  }
  return psyoptionsAmericanInstrumentProgram;
}

export class PsyoptionsAmericanInstrument implements Instrument {
  constructor(
    private context: Context,
    private mint: Mint,
    private euroMeta: PublicKey,
    private optionType: OptionType
  ) {}

  static create(
    context: Context,
    mint: Mint,
    euroMeta: PublicKey,
    optionType: OptionType,
    { amount = DEFAULT_INSTRUMENT_AMOUNT, side = null } = {}
  ): InstrumentController {
    const instrument = new PsyoptionsAmericanInstrument(context, mint, euroMeta, optionType);
    return new InstrumentController(instrument, amount, side ?? DEFAULT_INSTRUMENT_SIDE);
  }

  static async addInstrument(context: Context) {
    await context.addInstrument(getEuroOptionsInstrumentProgram().programId, 1, 7, 3, 3, 4);
  }

  serializeLegData(): Buffer {
    const mint = this.mint.publicKey.toBytes();
    const meta = this.euroMeta.toBytes();
    return Buffer.from(new Uint8Array([...mint, ...meta, this.optionType == OptionType.CALL ? 0 : 1]));
  }

  getProgramId(): PublicKey {
    return getEuroOptionsInstrumentProgram().programId;
  }

  async getValidationAccounts() {
    return [{ pubkey: this.euroMeta, isSigner: false, isWritable: false }];
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

export class EuroOptionsFacade {
  private constructor(
    private program: Program<EuroPrimitive>,
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
      this.program,
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
    await this.program.provider.sendAndConfirm(transaction, [mintBy]);
  }

  public static async initalizeNewOptionMeta(
    context: Context,
    {
      underlyingMint = context.assetToken,
      stableMint = context.quoteToken,
      underlyingPerContract = withTokenDecimals(1),
      strikePrice = withTokenDecimals(20000),
    } = {}
  ) {
    const program = new Program(EuroOptionsIdl, euroOptionsProgramId, context.provider);
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

    const expiration = new BN(Date.now() / 1000 + 3600); // 1 hour in the future
    const { instructions: preparationIxs } = await initializeAllAccountsInstructions(
      program,
      underlyingMint.publicKey,
      stableMint.publicKey,
      oracle,
      expiration,
      8
    );
    const {
      instruction: ix,
      euroMeta,
      euroMetaKey,
    } = await createEuroMetaInstruction(
      program,
      underlyingMint.publicKey,
      8,
      stableMint.publicKey,
      8,
      expiration,
      underlyingPerContract,
      strikePrice,
      8,
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
      program,
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

  private static createPriceFeed = async ({ oracleProgram, initPrice, confidence, expo = -4 }) => {
    const conf = confidence || new BN((initPrice / 10) * 10 ** -expo);
    const collateralTokenFeed = new web3.Account();
    await oracleProgram.rpc.initialize(new BN(initPrice * 10 ** -expo), expo, conf, {
      accounts: { price: collateralTokenFeed.publicKey },
      signers: [collateralTokenFeed],
      instructions: [
        web3.SystemProgram.createAccount({
          fromPubkey: oracleProgram.provider.publicKey,
          newAccountPubkey: collateralTokenFeed.publicKey,
          space: 3312,
          lamports: await oracleProgram.provider.connection.getMinimumBalanceForRentExemption(3312),
          programId: oracleProgram.programId,
        }),
      ],
    });
    return collateralTokenFeed.publicKey;
  };
}
