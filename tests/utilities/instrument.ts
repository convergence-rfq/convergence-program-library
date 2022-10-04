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
  toLegData(): Promise<InstrumentData>;
  getInstrumendDataSize(): number;
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
