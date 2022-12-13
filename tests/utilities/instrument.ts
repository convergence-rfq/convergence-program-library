import { BN } from "@project-serum/anchor";
import { AccountMeta, PublicKey } from "@solana/web3.js";
import { Response, Rfq } from "./wrappers";

export interface InstrumentData {
  instrument: PublicKey;
  instrumentData: Buffer | Uint8Array;
  instrumentAmount: BN;
  side: { bid: {} } | { ask: {} };
}

export interface Instrument {
  serializeLegData(): Buffer;
  getProgramId(): PublicKey;
  getValidationAccounts(): Promise<AccountMeta[]>;
  getPrepareSettlementAccounts(
    side: { taker: {} } | { maker: {} },
    legIndex: number,
    rfq: Rfq,
    response: Response
  ): Promise<AccountMeta[]>;
  getSettleAccounts(assetReceiver: PublicKey, legIndex: number, rfq: Rfq, response: Response): Promise<AccountMeta[]>;
  getRevertSettlementPreparationAccounts(
    side: { taker: {} } | { maker: {} },
    legIndex: number,
    rfq: Rfq,
    response: Response
  ): Promise<AccountMeta[]>;
  getCleanUpAccounts(legIndex: number, rfq: Rfq, response: Response): Promise<AccountMeta[]>;
}

export class InstrumentController {
  constructor(
    protected instrument: Instrument,
    protected amount: BN,
    protected side: { bid: {} } | { ask: {} },
    public baseAssetIndex: number,
    protected decimals: number
  ) {}

  async toLegData() {
    return {
      instrumentProgram: this.instrument.getProgramId(),
      baseAssetIndex: { value: this.baseAssetIndex },
      instrumentData: this.instrument.serializeLegData(),
      instrumentAmount: new BN(this.amount),
      instrumentDecimals: this.decimals,
      side: this.side,
    };
  }

  getInstrumendDataSize() {
    return this.instrument.serializeLegData().length;
  }

  private getProgramAccount() {
    return { pubkey: this.instrument.getProgramId(), isSigner: false, isWritable: false };
  }

  async getValidationAccounts() {
    return [this.getProgramAccount()].concat(await this.instrument.getValidationAccounts());
  }

  async getPrepareSettlementAccounts(
    side: { taker: {} } | { maker: {} },
    legIndex: number,
    rfq: Rfq,
    response: Response
  ) {
    return [this.getProgramAccount()].concat(
      await this.instrument.getPrepareSettlementAccounts(side, legIndex, rfq, response)
    );
  }

  async getSettleAccounts(assetReceiver: PublicKey, legIndex: number, rfq: Rfq, response: Response) {
    return [this.getProgramAccount()].concat(
      await this.instrument.getSettleAccounts(assetReceiver, legIndex, rfq, response)
    );
  }

  async getRevertSettlementPreparationAccounts(
    side: { taker: {} } | { maker: {} },
    legIndex: number,
    rfq: Rfq,
    response: Response
  ) {
    return [this.getProgramAccount()].concat(
      await this.instrument.getRevertSettlementPreparationAccounts(side, legIndex, rfq, response)
    );
  }

  async getCleanUpAccounts(legIndex: number, rfq: Rfq, response: Response) {
    return [this.getProgramAccount()].concat(await this.instrument.getCleanUpAccounts(legIndex, rfq, response));
  }
}
