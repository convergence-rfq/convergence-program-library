import { BN } from "@project-serum/anchor";
import { ASSOCIATED_TOKEN_PROGRAM_ID, Token, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { AccountMeta, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { DEFAULT_INSTRUMENT_AMOUNT, DEFAULT_INSTRUMENT_SIDE } from "./constants";
import { Instrument } from "./instrument";
import { getSpotEscrowPda } from "./pdas";
import { AuthoritySide } from "./types";
import { Context, Mint, Response, Rfq } from "./wrappers";

export class SpotInstrument implements Instrument {
  private mint: Mint;
  private amount: BN;
  private side: { bid: {} } | { ask: {} };

  constructor(
    private context: Context,
    { mint = context.assetToken, amount = DEFAULT_INSTRUMENT_AMOUNT, side = null } = {}
  ) {
    this.mint = mint;
    this.amount = amount;
    this.side = side ?? DEFAULT_INSTRUMENT_SIDE;
  }

  getInstrumendDataSize(): number {
    return 32;
  }

  async toLegData() {
    return {
      instrument: this.context.spotInstrument.programId,
      instrumentData: this.mint.publicKey.toBytes(),
      instrumentAmount: new BN(this.amount),
      side: this.side,
    };
  }

  async getValidationAccounts() {
    return [
      { pubkey: this.context.spotInstrument.programId, isSigner: false, isWritable: false },
      { pubkey: this.mint.publicKey, isSigner: false, isWritable: false },
    ];
  }

  async getPrepareSettlementAccounts(
    side: { taker: {} } | { maker: {} },
    legIndex: number,
    rfq: Rfq,
    response: Response
  ) {
    const caller = side == AuthoritySide.Taker ? this.context.taker : this.context.maker;

    return [
      { pubkey: this.context.spotInstrument.programId, isSigner: false, isWritable: false },
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
        pubkey: await getSpotEscrowPda(response.account, legIndex, this.context.spotInstrument.programId),
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
      { pubkey: this.context.spotInstrument.programId, isSigner: false, isWritable: false },
      {
        pubkey: await getSpotEscrowPda(response.account, legIndex, this.context.spotInstrument.programId),
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
      { pubkey: this.context.spotInstrument.programId, isSigner: false, isWritable: false },
      {
        pubkey: await getSpotEscrowPda(response.account, legIndex, this.context.spotInstrument.programId),
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
      { pubkey: this.context.spotInstrument.programId, isSigner: false, isWritable: false },
      {
        pubkey: response.firstToPrepare,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: await getSpotEscrowPda(response.account, legIndex, this.context.spotInstrument.programId),
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
