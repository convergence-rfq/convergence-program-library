import { BN } from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";
import { Instrument } from "./instrument";
import { AuthoritySide, Side } from "./types";
import { Context, Response, Rfq } from "./wrappers";

export class FailingInstrument implements Instrument {
  constructor(private context: Context, private failingSide: { taker: {} } | { maker: {} }) {}

  static async add(context: Context) {
    await context.program.methods
      .addInstrument(true, 0, 0, 0, 0, 0)
      .accounts({
        authority: context.dao.publicKey,
        protocol: context.protocolPda,
        instrumentProgram: context.failingInstrument.programId,
      })
      .signers([context.dao])
      .rpc();
  }

  async toLegData() {
    let doesTakerFail = this.failingSide == AuthoritySide.Taker;

    return {
      instrument: this.context.failingInstrument.programId,
      instrumentData: Buffer.of(+doesTakerFail),
      instrumentAmount: new BN(0),
      side: Side.Bid,
    };
  }

  async getValidationAccounts() {
    return [{ pubkey: this.context.failingInstrument.programId, isSigner: false, isWritable: false }];
  }

  async getPrepareSettlementAccounts(
    side: { taker: {} } | { maker: {} },
    legIndex: number,
    rfq: Rfq,
    response: Response
  ) {
    return [{ pubkey: this.context.failingInstrument.programId, isSigner: false, isWritable: false }];
  }

  async getSettleAccounts(assetReceiver: PublicKey, legIndex: number, rfq: Rfq, response: Response) {
    return [{ pubkey: this.context.failingInstrument.programId, isSigner: false, isWritable: false }];
  }

  async getRevertSettlementPreparationAccounts(
    side: { taker: {} } | { maker: {} },
    legIndex: number,
    rfq: Rfq,
    response: Response
  ) {
    return [{ pubkey: this.context.failingInstrument.programId, isSigner: false, isWritable: false }];
  }

  async getCleanUpAccounts(legIndex: number, rfq: Rfq, response: Response) {
    return [{ pubkey: this.context.failingInstrument.programId, isSigner: false, isWritable: false }];
  }
}
