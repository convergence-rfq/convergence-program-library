import * as anchor from "@project-serum/anchor";
import { PublicKey} from "@solana/web3.js";
import { DEFAULT_INSTRUMENT_AMOUNT, DEFAULT_INSTRUMENT_SIDE } from "../constants";
import { Instrument, InstrumentController } from "../instrument";
import { Context, Mint, Response, Rfq } from "../wrappers";
import { HxroInstrument as HxroInstrumentIdl } from "../../../target/types/hxro_instrument";
import {BN} from "@project-serum/anchor";
import {OptionType} from "../../dependencies/tokenized-euros/src";

let hxroInstrumentProgram = null;
export function getHxroInstrumentProgram(): anchor.Program<HxroInstrumentIdl> {
    if (hxroInstrumentProgram === null) {
        hxroInstrumentProgram = anchor.workspace.HxroInstrument as anchor.Program<HxroInstrumentIdl>;
    }

    return hxroInstrumentProgram;
}

export class HxroInstrument implements Instrument {
    private amount: BN;
    private side: { bid: {} } | { ask: {} };
    private dex: PublicKey;
    private marketProductGroup: PublicKey;
    private feeModelProgram: PublicKey;
    private riskEngineProgram: PublicKey;
    private feeModelConfigurationAcct: PublicKey;
    private riskModelConfigurationAcct: PublicKey;
    private feeOutputRegister: PublicKey;
    private riskOutputRegister: PublicKey;
    private riskAndFeeSigner: PublicKey;

    constructor(private context: Context, private mint: Mint) {}

    static create(
        context: Context,
        {
            mint = context.assetToken,
            amount = DEFAULT_INSTRUMENT_AMOUNT,
            side = null,
            dex = new PublicKey("FUfpR31LmcP1VSbz5zDaM7nxnH55iBHkpwusgrnhaFjL"),
            marketProductGroup = new PublicKey("HyWxreWnng9ZBDPYpuYugAfpCMkRkJ1oz93oyoybDFLB"),
            feeModelProgram = new PublicKey("5AZioCPiC7uZ4zRmkKSg5nsb2A98RhmW89a1pMwiDoeT"),
            riskEngineProgram = new PublicKey("92wdgEqyiDKrcbFHoBTg8HxMj932xweRCKaciGSW3uMr"),
            feeModelConfigurationAcct = new PublicKey("4Zwghg3tNaHZuzpQHDWA4mbSyoVrNEfvS765z7s4tNYd"),
            riskModelConfigurationAcct = new PublicKey("9kg11bsVU4MueSBhMbnhW5j7HjfMPin7NNWZZkdoFnRJ"),
            feeOutputRegister = new PublicKey("rPnaqXrvo3aBMChVLywnVz6nykSfXwvBYu1Yz1p6crv"),
            riskOutputRegister = new PublicKey("DevB1VB5Tt3YAeYZ8XTB1fXiFtXBqcP7PbfWGB71YyCE"),
            riskAndFeeSigner = new PublicKey("AQJYsJ9k47ahEEXhvnNBFca4yH3zcFUfVaKrLPLgftYg"),
        } = {}
    ): InstrumentController {
        const instrument = new HxroInstrument(context, mint);
        instrument.amount = amount;
        instrument.side = side ?? DEFAULT_INSTRUMENT_SIDE;
        instrument.dex = dex;
        instrument.marketProductGroup = marketProductGroup;
        instrument.feeModelProgram = feeModelProgram;
        instrument.riskEngineProgram = riskEngineProgram;
        instrument.feeModelConfigurationAcct = feeModelConfigurationAcct;
        instrument.riskModelConfigurationAcct = riskModelConfigurationAcct;
        instrument.feeOutputRegister = feeOutputRegister;
        instrument.riskOutputRegister = riskOutputRegister;
        instrument.riskAndFeeSigner = riskAndFeeSigner;
        return new InstrumentController(instrument, amount, side ?? DEFAULT_INSTRUMENT_SIDE);
    }

    static async addInstrument(context: Context) {
        await context.addInstrument(getHxroInstrumentProgram().programId, 8, 7, 3, 3, 4);
    }

    serializeLegData(): Buffer {
        let dex = this.dex.toBytes();
        let feeModelProgram = this.feeModelProgram.toBytes();
        let riskEngineProgram = this.riskEngineProgram.toBytes();
        let feeModelConfigurationAcct = this.feeModelConfigurationAcct.toBytes();
        let riskModelConfigurationAcct = this.riskModelConfigurationAcct.toBytes();
        let feeOutputRegister = this.feeOutputRegister.toBytes();
        let riskOutputRegister = this.riskOutputRegister.toBytes();
        let riskAndFeeSigner = this.riskAndFeeSigner.toBytes();
        return Buffer.from(new Uint8Array([
            ...dex,
            ...feeModelProgram,
            ...riskEngineProgram,
            ...feeModelConfigurationAcct,
            ...riskModelConfigurationAcct,
            ...feeOutputRegister,
            ...riskOutputRegister,
            ...riskAndFeeSigner,
        ]));
    }

    getProgramId(): PublicKey {
        return getHxroInstrumentProgram().programId;
    }

    async getValidationAccounts() {
        return [
            { pubkey: this.dex, isSigner: false, isWritable: false },
            { pubkey: this.feeModelProgram, isSigner: false, isWritable: false },
            { pubkey: this.riskEngineProgram, isSigner: false, isWritable: false },
            { pubkey: this.feeModelConfigurationAcct, isSigner: false, isWritable: false },
            { pubkey: this.riskModelConfigurationAcct, isSigner: false, isWritable: false },
            { pubkey: this.feeOutputRegister, isSigner: false, isWritable: false },
            { pubkey: this.riskOutputRegister, isSigner: false, isWritable: false },
            { pubkey: this.riskAndFeeSigner, isSigner: false, isWritable: false },
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
