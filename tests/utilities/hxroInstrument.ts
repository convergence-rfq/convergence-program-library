import { BN } from "@project-serum/anchor";
import { ASSOCIATED_TOKEN_PROGRAM_ID, Token, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { DEFAULT_INSTRUMENT_AMOUNT, DEFAULT_INSTRUMENT_SIDE } from "./constants";
import { Instrument } from "./instrument";
import { getSpotEscrowPda } from "./pdas";
import { AuthoritySide } from "./types";
import { Context, Mint, Response, Rfq } from "./wrappers";

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

    constructor(
        private context: Context,
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
    ) {
        this.amount = amount;
        this.side = side ?? DEFAULT_INSTRUMENT_SIDE;
        this.dex = dex;
        this.marketProductGroup = marketProductGroup;
        this.feeModelProgram = feeModelProgram;
        this.riskEngineProgram = riskEngineProgram;
        this.feeModelConfigurationAcct = feeModelConfigurationAcct;
        this.riskModelConfigurationAcct = riskModelConfigurationAcct;
        this.feeOutputRegister = feeOutputRegister;
        this.riskOutputRegister = riskOutputRegister;
        this.riskAndFeeSigner = riskAndFeeSigner;
    }


    getInstrumendDataSize(): number {
        return 32;
    }

    async toLegData() {
        const instrumentData = [
            this.dex.toBytes(),
            this.marketProductGroup.toBytes(),
            this.feeModelProgram.toBytes(),
            this.riskEngineProgram.toBytes(),
            this.feeModelConfigurationAcct.toBytes(),
            this.riskModelConfigurationAcct.toBytes(),
            this.feeOutputRegister.toBytes(),
            this.riskOutputRegister.toBytes(),
            this.riskAndFeeSigner.toBytes(),
        ]
        return {
            instrument: this.context.hxroInstrument.programId,
            instrumentData: this.dex.toBytes(),
            instrumentAmount: new BN(this.amount),
            side: this.side,
        };
    }

    async getValidationAccounts() {
        return [
            { pubkey: this.context.hxroInstrument.programId, isSigner: false, isWritable: false },
            { pubkey: this.dex, isSigner: false, isWritable: false },
            { pubkey: this.marketProductGroup, isSigner: false, isWritable: false },
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
