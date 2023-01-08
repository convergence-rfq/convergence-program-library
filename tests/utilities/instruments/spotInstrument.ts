import * as anchor from "@project-serum/anchor";
import { ASSOCIATED_TOKEN_PROGRAM_ID, Token, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { DEFAULT_INSTRUMENT_AMOUNT, DEFAULT_INSTRUMENT_SIDE } from "../constants";
import { Instrument, InstrumentController } from "../instrument";
import { getInstrumentEscrowPda } from "../pdas";
import { AssetIdentifier, AuthoritySide, InstrumentType } from "../types";
import { Context, Mint, Response, Rfq } from "../wrappers";
import { SpotInstrument as SpotInstrumentIdl } from "../../../target/types/spot_instrument";

let spotInstrumentProgram = null;
export function getSpotInstrumentProgram(): anchor.Program<SpotInstrumentIdl> {
  if (spotInstrumentProgram === null) {
    spotInstrumentProgram = anchor.workspace.SpotInstrument as anchor.Program<SpotInstrumentIdl>;
  }

  return spotInstrumentProgram;
}

export class SpotInstrument implements Instrument {
  constructor(private context: Context, private mint: Mint) {}

  static createForLeg(
    context: Context,
    { mint = context.assetToken, amount = DEFAULT_INSTRUMENT_AMOUNT, side = null } = {}
  ): InstrumentController {
    const instrument = new SpotInstrument(context, mint);
    mint.assertRegistered();
    return new InstrumentController(
      instrument,
      { amount, side: side ?? DEFAULT_INSTRUMENT_SIDE, baseAssetIndex: mint.baseAssetIndex },
      mint.decimals
    );
  }

  static createForQuote(context: Context, mint = context.assetToken): InstrumentController {
    const instrument = new SpotInstrument(context, mint);
    mint.assertRegistered();
    return new InstrumentController(instrument, null, mint.decimals);
  }

  static async addInstrument(context: Context) {
    await context.addInstrument(getSpotInstrumentProgram().programId, true, 1, 7, 3, 3, 4);
    await context.riskEngine.setInstrumentType(getSpotInstrumentProgram().programId, InstrumentType.Spot);
  }

  serializeInstrumentData(): Buffer {
    return Buffer.from(this.mint.publicKey.toBytes());
  }

  getProgramId(): PublicKey {
    return getSpotInstrumentProgram().programId;
  }

  async getValidationAccounts() {
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
