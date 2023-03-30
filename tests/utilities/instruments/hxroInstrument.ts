import * as anchor from "@project-serum/anchor";
import {AccountMeta, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY} from "@solana/web3.js";
import { DEFAULT_INSTRUMENT_AMOUNT, DEFAULT_INSTRUMENT_SIDE } from "../constants";
import { Instrument, InstrumentController } from "../instrument";
import { Context, Mint, Response, Rfq } from "../wrappers";
import { HxroInstrument as HxroInstrumentIdl } from "../../../target/types/hxro_instrument";
import {BN} from "@project-serum/anchor";
import {AssetIdentifier, AuthoritySide, InstrumentType} from "../types";
import {use} from "chai";

let hxroInstrumentProgram = null;
export function getHxroInstrumentProgram(): anchor.Program<HxroInstrumentIdl> {
    if (hxroInstrumentProgram === null) {
        hxroInstrumentProgram = anchor.workspace.HxroInstrument as anchor.Program<HxroInstrumentIdl>;
    }

    return hxroInstrumentProgram;
}

export class HxroInstrument implements Instrument {
    taker: anchor.web3.Keypair;
    maker: anchor.web3.Keypair;
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
    private creatorOwner: PublicKey;
    private counterpartyOwner: PublicKey;
    private operatorOwner: PublicKey;
    private creator: PublicKey;
    private counterparty: PublicKey;
    private operator: PublicKey;
    private printTrade: PublicKey;
    private creatorTraderFeeStateAcct: PublicKey;
    private creatorTraderRiskStateAcct: PublicKey;

    private productIndex: number;

    constructor(private context: Context, private mint: Mint) {}
    static createForLeg(
        context: Context,
        {   mint = context.assetToken,
            amount = DEFAULT_INSTRUMENT_AMOUNT,
            side = null,
            dex = new PublicKey("FUfpR31LmcP1VSbz5zDaM7nxnH55iBHkpwusgrnhaFjL"),
            marketProductGroup = new PublicKey("DDxNzq3A4qKJxnK2PFYeXE1SgGXCR5baaDBhpfLn3LRS"),
            feeModelProgram = new PublicKey("5AZioCPiC7uZ4zRmkKSg5nsb2A98RhmW89a1pMwiDoeT"),
            riskEngineProgram = new PublicKey("92wdgEqyiDKrcbFHoBTg8HxMj932xweRCKaciGSW3uMr"),
            feeModelConfigurationAcct = new PublicKey("Aomi2MHGCQkJ5soH9gtT1yWz3n4KpK9MCFpRrxaS7MWN"),
            riskModelConfigurationAcct = new PublicKey("9kg11bsVU4MueSBhMbnhW5j7HjfMPin7NNWZZkdoFnRJ"),
            feeOutputRegister = new PublicKey("rPnaqXrvo3aBMChVLywnVz6nykSfXwvBYu1Yz1p6crv"),
            riskOutputRegister = new PublicKey("DevB1VB5Tt3YAeYZ8XTB1fXiFtXBqcP7PbfWGB71YyCE"),
            riskAndFeeSigner = new PublicKey("AQJYsJ9k47ahEEXhvnNBFca4yH3zcFUfVaKrLPLgftYg"),
            creatorOwner = null,
            counterpartyOwner = null,
            operatorOwner = null,
            creator = null,
            counterparty = null,
            operator = null,
            printTrade = null,
            creatorTraderFeeStateAcct = null,
            creatorTraderRiskStateAcct = null,
            productIndex = 0,
        }= {}
    ): InstrumentController {
        const instrument = new HxroInstrument(context, mint);
        mint.assertRegistered();
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
        instrument.creatorOwner = creatorOwner;
        instrument.counterpartyOwner = counterpartyOwner;
        instrument.operatorOwner = operatorOwner;
        instrument.creator = creator;
        instrument.counterparty = counterparty;
        instrument.operator = operator;
        instrument.printTrade = printTrade;
        instrument.productIndex = productIndex;
        instrument.creatorTraderFeeStateAcct = creatorTraderFeeStateAcct;
        instrument.creatorTraderRiskStateAcct = creatorTraderRiskStateAcct;

        return new InstrumentController(
            instrument,
            { amount, side: side ?? DEFAULT_INSTRUMENT_SIDE, baseAssetIndex: mint.baseAssetIndex },
            mint.decimals
        );
    }

    static createForQuote(context: Context, {
        mint = context.quoteToken,
        dex = new PublicKey("FUfpR31LmcP1VSbz5zDaM7nxnH55iBHkpwusgrnhaFjL"),
        marketProductGroup = new PublicKey("HyWxreWnng9ZBDPYpuYugAfpCMkRkJ1oz93oyoybDFLB"),
        feeModelProgram = new PublicKey("5u8mLVnUSQNSbKdZPNGTfWHGwV5uJh9by5Fa6jb6BP6h"),
        riskEngineProgram = new PublicKey("92wdgEqyiDKrcbFHoBTg8HxMj932xweRCKaciGSW3uMr"),
        feeModelConfigurationAcct = new PublicKey("4Zwghg3tNaHZuzpQHDWA4mbSyoVrNEfvS765z7s4tNYd"),
        riskModelConfigurationAcct = new PublicKey("9kg11bsVU4MueSBhMbnhW5j7HjfMPin7NNWZZkdoFnRJ"),
        feeOutputRegister = new PublicKey("rPnaqXrvo3aBMChVLywnVz6nykSfXwvBYu1Yz1p6crv"),
        riskOutputRegister = new PublicKey("DevB1VB5Tt3YAeYZ8XTB1fXiFtXBqcP7PbfWGB71YyCE"),
        riskAndFeeSigner = new PublicKey("AQJYsJ9k47ahEEXhvnNBFca4yH3zcFUfVaKrLPLgftYg"),
        creatorOwner = null,
        counterpartyOwner = null,
        operatorOwner = null,
        creator = null,
        counterparty = null,
        operator = null,
        printTrade = null,
        creatorTraderFeeStateAcct = null,
        creatorTraderRiskStateAcct = null,
        productIndex = 0,
    }): InstrumentController {
        const instrument = new HxroInstrument(context, mint);
        instrument.dex = dex;
        instrument.marketProductGroup = marketProductGroup;
        instrument.feeModelProgram = feeModelProgram;
        instrument.riskEngineProgram = riskEngineProgram;
        instrument.feeModelConfigurationAcct = feeModelConfigurationAcct;
        instrument.riskModelConfigurationAcct = riskModelConfigurationAcct;
        instrument.feeOutputRegister = feeOutputRegister;
        instrument.riskOutputRegister = riskOutputRegister;
        instrument.riskAndFeeSigner = riskAndFeeSigner;
        instrument.creatorOwner = creatorOwner;
        instrument.counterpartyOwner = counterpartyOwner;
        instrument.operatorOwner = operatorOwner;
        instrument.creator = creator;
        instrument.counterparty = counterparty;
        instrument.operator = operator;
        instrument.printTrade = printTrade;
        instrument.productIndex = productIndex;
        instrument.creatorTraderFeeStateAcct = creatorTraderFeeStateAcct;
        instrument.creatorTraderRiskStateAcct = creatorTraderRiskStateAcct;

        mint.assertRegistered();
        return new InstrumentController(instrument, null, mint.decimals);
    }

    static async addPrintTradeProvider(context: Context) {
        await context.addPrintTradeProvider(getHxroInstrumentProgram().programId, 8);
        await context.addInstrument(getHxroInstrumentProgram().programId, true,
            8, 0, 0, 0, 0);
        await context.riskEngine.setInstrumentType(getHxroInstrumentProgram().programId, InstrumentType.Option);
        await context.riskEngine.setInstrumentType(getHxroInstrumentProgram().programId, InstrumentType.TermFuture);
        await context.riskEngine.setInstrumentType(getHxroInstrumentProgram().programId, InstrumentType.PerpFuture);
    }

    serializeInstrumentData(): Buffer {
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
            ...(new BN(this.productIndex).toArray()) //
        ]));
    }

    serializeInstrumentDataForQuote(): Buffer {
        return Buffer.from(new Uint8Array([]));
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
        assetIdentifier: AssetIdentifier,
        rfq: Rfq,
        response: Response
    ): Promise<AccountMeta[]> {
        let user = side == AuthoritySide.Taker ? this.counterpartyOwner : this.creatorOwner;
        return [
            { pubkey: this.dex, isSigner: false, isWritable: false },
            { pubkey: user, isSigner: true, isWritable: false },
            { pubkey: this.operatorOwner, isSigner: false, isWritable: false },
            { pubkey: this.creator, isSigner: false, isWritable: false },
            { pubkey: this.counterparty, isSigner: false, isWritable: false },
            { pubkey: this.operator, isSigner: false, isWritable: false },
            { pubkey: this.marketProductGroup, isSigner: false, isWritable: true },

            { pubkey: this.feeModelProgram, isSigner: false, isWritable: false },
            { pubkey: this.feeModelConfigurationAcct, isSigner: false, isWritable: false },
            { pubkey: this.feeOutputRegister, isSigner: false, isWritable: true },
            { pubkey: this.riskEngineProgram, isSigner: false, isWritable: false },
            { pubkey: this.riskModelConfigurationAcct, isSigner: false, isWritable: false },
            { pubkey: this.riskOutputRegister, isSigner: false, isWritable: true },
            { pubkey: this.riskAndFeeSigner, isSigner: false, isWritable: false },
            { pubkey: this.creatorTraderFeeStateAcct, isSigner: false, isWritable: true },
            { pubkey: this.creatorTraderRiskStateAcct, isSigner: false, isWritable: true },

            { pubkey: this.printTrade, isSigner: false, isWritable: true },
            { pubkey: anchor.web3.SystemProgram.programId, isSigner: false, isWritable: false },
        ];
    }

    async getSettleAccounts(
        assetReceiver: PublicKey,
        assetIdentifier: AssetIdentifier,
        rfq: Rfq,
        response: Response
    ): Promise<AccountMeta[]> {
        return [];
    }

    async getRevertSettlementPreparationAccounts(
        side: { taker: {} } | { maker: {} },
        assetIdentifier: AssetIdentifier,
        rfq: Rfq,
        response: Response
    ): Promise<AccountMeta[]> {
        return [];
    }

    async getCleanUpAccounts(assetIdentifier: AssetIdentifier, rfq: Rfq, response: Response): Promise<AccountMeta[]> {
        return [];
    }
}
