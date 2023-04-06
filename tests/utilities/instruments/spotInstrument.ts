import { BN, Program, workspace } from "@project-serum/anchor";
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from "@solana/spl-token";
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { DEFAULT_INSTRUMENT_AMOUNT, DEFAULT_INSTRUMENT_SIDE } from "../constants";
import { Instrument, InstrumentController } from "../instrument";
import { getInstrumentEscrowPda } from "../pdas";
import { AssetIdentifier, AuthoritySide, InstrumentType, Side } from "../types";
import { Context, Mint, Response, Rfq } from "../wrappers";
import { SpotInstrument as SpotInstrumentIdl } from "../../../target/types/spot_instrument";

let spotInstrumentProgram: Program<SpotInstrumentIdl> | null = null;
export function getSpotInstrumentProgram(): Program<SpotInstrumentIdl> {
  if (spotInstrumentProgram === null) {
    spotInstrumentProgram = workspace.SpotInstrument as Program<SpotInstrumentIdl>;
  }

  return spotInstrumentProgram;
}

export class SpotInstrument implements Instrument {
  constructor(private context: Context, private mint: Mint) {}

  static createForLeg(
    context: Context,
    {
      mint = context.assetToken,
      amount = DEFAULT_INSTRUMENT_AMOUNT,
      side = DEFAULT_INSTRUMENT_SIDE,
    }: {
      mint?: Mint;
      amount?: BN;
      side?: Side;
    } = {}
  ): InstrumentController {
    const annotatedMint: Mint = mint;
    annotatedMint.assertRegisteredAsBaseAsset();
    const instrument = new SpotInstrument(context, annotatedMint);
    return new InstrumentController(
      instrument as Instrument,
      { amount, side, baseAssetIndex: annotatedMint.baseAssetIndex },
      mint.decimals
    );
  }

  static createForQuote(context: Context, mint: Mint = context.assetToken): InstrumentController {
    const instrument = new SpotInstrument(context, mint);
    return new InstrumentController(instrument as Instrument, null, mint.decimals);
  }

  static async addInstrument(context: Context) {
    await context.addInstrument(getSpotInstrumentProgram().programId, true, 1, 7, 3, 3, 4);
  }

  static async setRiskEngineInstrumentType(context: Context) {
    await context.riskEngine.setInstrumentType(getSpotInstrumentProgram().programId, InstrumentType.Spot);
  }

  serializeInstrumentData(): Buffer {
    return Buffer.from(this.mint.publicKey.toBytes());
  }

  serializeInstrumentDataForQuote(): Buffer {
    return Buffer.from(this.mint.publicKey.toBytes());
  }

  getProgramId(): PublicKey {
    return getSpotInstrumentProgram().programId;
  }

  async getValidationAccounts() {
    this.mint.assertRegistered();
    return [{ pubkey: this.mint.mintInfoAddress, isSigner: false, isWritable: false }];
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
        pubkey: await getAssociatedTokenAddress(this.mint.publicKey, caller.publicKey),
        isSigner: false,
        isWritable: true,
      },
      { pubkey: this.mint.publicKey, isSigner: false, isWritable: false },
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
