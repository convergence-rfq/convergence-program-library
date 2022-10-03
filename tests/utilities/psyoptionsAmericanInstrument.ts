import { BN } from "@project-serum/anchor";
import { ASSOCIATED_TOKEN_PROGRAM_ID, Token, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { AccountMeta, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { DEFAULT_INSTRUMENT_AMOUNT, DEFAULT_INSTRUMENT_SIDE } from "./constants";
import { Instrument } from "./instrument";
import { getPsyoptionsAmericanEscrowPda } from "./pdas";
import { AuthoritySide } from "./types";
import { Context, Mint, Response, Rfq } from "./wrappers";

export class PsyoptionsAmericanInstrument implements Instrument {
  private underlyingAssetMint: Mint;
  private expirationUnixTimestamp: BN;
  private underlyingAmountPerContract: BN;
  private quoteAmountPerContract: BN;
  private amount: BN;
  private side: { bid: {} } | { ask: {} };

  constructor(
    private context: Context,
    {
      underlyingAssetMint = context.assetToken,
      underlyingAmountPerContract = new BN(1),
      quoteAmountPerContract = new BN(1),
      expirationUnixTimestamp = new BN(0),
      amount = new BN(0),
      side = null,
    } = {}
  ) {
    this.underlyingAssetMint = underlyingAssetMint;
    this.underlyingAmountPerContract = underlyingAmountPerContract;
    this.quoteAmountPerContract = quoteAmountPerContract;
    this.expirationUnixTimestamp = expirationUnixTimestamp;
    this.amount = amount;
    this.side = side ?? DEFAULT_INSTRUMENT_SIDE;
  }

  async toLegData() {
    const instrumentData = this.underlyingAssetMint.publicKey.toBytes();
    return {
      instrument: this.context.psyoptionsAmericanInstrument.programId,
      instrumentData,
      instrumentAmount: new BN(this.amount),
      side: this.side,
    };
  }

  async getValidationAccounts() {
    return [{ pubkey: this.context.psyoptionsAmericanInstrument.programId, isSigner: false, isWritable: false }];
  }

  async getPrepareSettlementAccounts(
    side: { taker: {} } | { maker: {} },
    legIndex: number,
    rfq: Rfq,
    response: Response
  ) {
    const caller = side == AuthoritySide.Taker ? this.context.taker : this.context.maker;

    return [
      { pubkey: this.context.psyoptionsAmericanInstrument.programId, isSigner: false, isWritable: false },
      { pubkey: caller.publicKey, isSigner: true, isWritable: true },
      {
        pubkey: await Token.getAssociatedTokenAddress(
          ASSOCIATED_TOKEN_PROGRAM_ID,
          TOKEN_PROGRAM_ID,
          this.underlyingAssetMint.publicKey,
          caller.publicKey
        ),
        isSigner: false,
        isWritable: true,
      },
      { pubkey: this.underlyingAssetMint.publicKey, isSigner: false, isWritable: false },
      {
        pubkey: await getPsyoptionsAmericanEscrowPda(
          response.account,
          legIndex,
          this.context.psyoptionsAmericanInstrument.programId
        ),
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
      { pubkey: this.context.psyoptionsAmericanInstrument.programId, isSigner: false, isWritable: false },
      {
        pubkey: await getPsyoptionsAmericanEscrowPda(
          response.account,
          legIndex,
          this.context.psyoptionsAmericanInstrument.programId
        ),
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: await this.underlyingAssetMint.getAssociatedAddress(assetReceiver),
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
      { pubkey: this.context.psyoptionsAmericanInstrument.programId, isSigner: false, isWritable: false },
      {
        pubkey: await getPsyoptionsAmericanEscrowPda(
          response.account,
          legIndex,
          this.context.psyoptionsAmericanInstrument.programId
        ),
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: await this.underlyingAssetMint.getAssociatedAddress(caller.publicKey),
        isSigner: false,
        isWritable: true,
      },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ];
  }

  async getCleanUpAccounts(legIndex: number, rfq: Rfq, response: Response) {
    return [
      { pubkey: this.context.psyoptionsAmericanInstrument.programId, isSigner: false, isWritable: false },
      {
        pubkey: response.firstToPrepare,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: await getPsyoptionsAmericanEscrowPda(
          response.account,
          legIndex,
          this.context.psyoptionsAmericanInstrument.programId
        ),
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: await this.underlyingAssetMint.getAssociatedAddress(this.context.dao.publicKey),
        isSigner: false,
        isWritable: true,
      },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ];
  }
}