import { BN } from "@project-serum/anchor";
import { ASSOCIATED_TOKEN_PROGRAM_ID, Token, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { DEFAULT_INSTRUMENT_AMOUNT, DEFAULT_INSTRUMENT_SIDE } from "./constants";
import { Instrument } from "./instrument";
import { getSpotEscrowPda } from "./pdas";
import { AuthoritySide } from "./types";
import { Context, Mint, Response, Rfq } from "./wrappers";

export class HxroInstrument implements Instrument {
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
            instrument: this.context.hxroInstrument.programId,
            instrumentData: this.mint.publicKey.toBytes(),
            instrumentAmount: new BN(this.amount),
            side: this.side,
        };
    }

    async getValidationAccounts() {
        return [
            { pubkey: this.context.hxroInstrument.programId, isSigner: false, isWritable: false },
            { pubkey: this.mint.publicKey, isSigner: false, isWritable: false },
        ];
    }

    async getPrepareSettlementAccounts(
        side: { taker: {} } | { maker: {} },
        legIndex: number,
        rfq: Rfq,
        response: Response
    ) {
        return [];
    }

    async getSettleAccounts(assetReceiver: PublicKey, legIndex: number, rfq: Rfq, response: Response) {
        return [];
    }

    async getRevertSettlementPreparationAccounts(
        side: { taker: {} } | { maker: {} },
        legIndex: number,
        rfq: Rfq,
        response: Response
    ) {
        return [];
    }

    async getCleanUpAccounts(legIndex: number, rfq: Rfq, response: Response) {
        return [];
    }
}
