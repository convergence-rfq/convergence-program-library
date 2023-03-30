import * as anchor from "@project-serum/anchor";
import {HxroInstrument as HxroInstrumentType} from '../../target/types/hxro_instrument';
import {Context, getUpdatedContext, Rfq} from "../utilities/wrappers";
import {Dex, DexIdl} from "../../hxro-instrument/dex-cpi/types";
import {Program} from "@project-serum/anchor";
import {HxroInstrument} from "../utilities/instruments/hxroInstrument";
import {AuthoritySide, Quote, Side} from "../utilities/types";
import {toAbsolutePrice, toLegMultiplier, withTokenDecimals} from "../utilities/helpers";
import spl_token from "@solana/spl-token";
import {DEFAULT_SOL_FOR_SIGNERS} from "../utilities/constants";
import {Commitment, ConfirmOptions} from "@solana/web3.js";

function getTrgSeeds(name: string, marketProductGroup: anchor.web3.PublicKey): string {
    return "trdr_grp1:test" + name
}


describe("RFQ HXRO print trade provider integration tests", () => {
    anchor.setProvider(anchor.AnchorProvider.env())

    let operator;

    const program = anchor.workspace.HxroInstrument as anchor.Program<HxroInstrumentType>;

    const dex = new anchor.web3.PublicKey("FUfpR31LmcP1VSbz5zDaM7nxnH55iBHkpwusgrnhaFjL");
    const marketProductGroup = new anchor.web3.PublicKey("HyWxreWnng9ZBDPYpuYugAfpCMkRkJ1oz93oyoybDFLB");
    const feeModelProgram = new anchor.web3.PublicKey("5u8mLVnUSQNSbKdZPNGTfWHGwV5uJh9by5Fa6jb6BP6h");
    const riskEngineProgram = new anchor.web3.PublicKey("92wdgEqyiDKrcbFHoBTg8HxMj932xweRCKaciGSW3uMr");
    const feeModelConfigurationAcct = new anchor.web3.PublicKey("4Zwghg3tNaHZuzpQHDWA4mbSyoVrNEfvS765z7s4tNYd");
    const riskModelConfigurationAcct = new anchor.web3.PublicKey("9kg11bsVU4MueSBhMbnhW5j7HjfMPin7NNWZZkdoFnRJ");
    const feeOutputRegister = new anchor.web3.PublicKey("rPnaqXrvo3aBMChVLywnVz6nykSfXwvBYu1Yz1p6crv");
    const riskOutputRegister = new anchor.web3.PublicKey("DevB1VB5Tt3YAeYZ8XTB1fXiFtXBqcP7PbfWGB71YyCE");
    const riskAndFeeSigner = new anchor.web3.PublicKey("AQJYsJ9k47ahEEXhvnNBFca4yH3zcFUfVaKrLPLgftYg");

    const dexProgram = new anchor.Program(DexIdl as anchor.Idl, dex, anchor.getProvider()) as Program<Dex>;

    // parties
    let creatorTrg, creatorTraderFeeStateAcct, creatorTraderRiskStateAcct,
        counterPartyTrg, counterPartyTraderFeeStateAcct,
        counterPartyTraderRiskStateAcct, operatorPartyTrg,
        operatorPartyTraderFeeStateAcct, operatorPartyTraderRiskStateAcct;

    let printTrade;

    let context: Context;

    beforeEach(async () => {
        operator = anchor.web3.Keypair.generate();
        await program.provider.connection.confirmTransaction(
            await program.provider.connection.requestAirdrop(operator.publicKey, DEFAULT_SOL_FOR_SIGNERS),
            "confirmed"
        );

        context = await getUpdatedContext();

        const [_creatorTrg, _creatorTraderFeeStateAcct, _creatorTraderRiskStateAcct] = await createTRG(context.taker);
        const [_counterPartyTrg, _counterPartyTraderFeeStateAcct, _counterPartyTraderRiskStateAcct] = await createTRG(context.maker);
        const [_operatorPartyTrg, _operatorPartyTraderFeeStateAcct, _operatorPartyTraderRiskStateAcct] = await createTRG(operator);
        creatorTrg = _creatorTrg
        creatorTraderFeeStateAcct = _creatorTraderFeeStateAcct
        creatorTraderRiskStateAcct = _creatorTraderRiskStateAcct
        counterPartyTrg = _counterPartyTrg
        counterPartyTraderFeeStateAcct = _counterPartyTraderFeeStateAcct
        counterPartyTraderRiskStateAcct = _counterPartyTraderRiskStateAcct
        operatorPartyTrg = _operatorPartyTrg
        operatorPartyTraderFeeStateAcct = _operatorPartyTraderFeeStateAcct
        operatorPartyTraderRiskStateAcct = _operatorPartyTraderRiskStateAcct

        const [_printTrade, ] = await anchor.web3.PublicKey.findProgramAddress(
            [
                Buffer.from(anchor.utils.bytes.utf8.encode("print_trade")),
                creatorTrg.toBuffer(),
                counterPartyTrg.toBuffer(),
            ],
            dexProgram.programId,
        )
        printTrade = _printTrade;
    });

    it("The taker prepares, but the maker defaults", async() => {
        const rfq: Rfq = await context.createRfqStepByStep({
            printTradeProvider: program.programId,
            activeWindow: 2,
            settlingWindow: 1,
            legs: [
                HxroInstrument.createForLeg(
                    context,
                    {
                        amount: 0.5 * (10 ** 6),
                        side: Side.Bid,
                        dex: dex,
                        marketProductGroup: marketProductGroup,
                        feeModelProgram: feeModelProgram,
                        riskEngineProgram: riskEngineProgram,
                        feeModelConfigurationAcct: feeModelConfigurationAcct,
                        riskModelConfigurationAcct: riskModelConfigurationAcct,
                        feeOutputRegister: feeOutputRegister,
                        riskOutputRegister: riskOutputRegister,
                        riskAndFeeSigner: riskAndFeeSigner,
                        creatorOwner: context.maker.publicKey,
                        counterpartyOwner: context.taker.publicKey,
                        operatorOwner: operator.publicKey,
                        creator: creatorTrg,
                        counterparty: counterPartyTrg,
                        operator: operatorPartyTrg,
                        printTrade: printTrade,
                    })],
            quote: HxroInstrument.createForQuote(context,
                {
                    creatorOwner: context.maker.publicKey,
                    counterpartyOwner: context.taker.publicKey,
                    operatorOwner: operator.publicKey,
                    creator: creatorTrg,
                    counterparty: counterPartyTrg,
                    operator: operatorPartyTrg,
                    printTrade: printTrade,
                })
        });

        const response = await rfq.respond({
            bid: Quote.getStandart(toAbsolutePrice(withTokenDecimals(1)), toLegMultiplier(5)),
            ask: Quote.getStandart(toAbsolutePrice(withTokenDecimals(1)), toLegMultiplier(2)),
        });

        await response.confirm({ side: Side.Ask, legMultiplierBps: toLegMultiplier(1) });
    })
    it("The maker prepares, but the taker defaults", async() => {
        const rfq: Rfq = await context.createRfqStepByStep({
            printTradeProvider: program.programId,
            activeWindow: 2,
            settlingWindow: 1,
            legs: [
                HxroInstrument.createForLeg(
                    context,
                    {
                        amount: 0.5 * (10 ** 6),
                        side: Side.Bid,
                        dex: dex,
                        marketProductGroup: marketProductGroup,
                        feeModelProgram: feeModelProgram,
                        riskEngineProgram: riskEngineProgram,
                        feeModelConfigurationAcct: feeModelConfigurationAcct,
                        riskModelConfigurationAcct: riskModelConfigurationAcct,
                        feeOutputRegister: feeOutputRegister,
                        riskOutputRegister: riskOutputRegister,
                        riskAndFeeSigner: riskAndFeeSigner,
                        creatorOwner: context.maker.publicKey,
                        counterpartyOwner: context.taker.publicKey,
                        operatorOwner: operator.publicKey,
                        creator: creatorTrg,
                        counterparty: counterPartyTrg,
                        operator: operatorPartyTrg,
                        printTrade: printTrade,
                    })],
            quote: HxroInstrument.createForQuote(context,
                {
                    creatorOwner: context.maker.publicKey,
                    counterpartyOwner: context.taker.publicKey,
                    operatorOwner: operator.publicKey,
                    creator: creatorTrg,
                    counterparty: counterPartyTrg,
                    operator: operatorPartyTrg,
                    printTrade: printTrade,
                })
        });

        const response = await rfq.respond({
            bid: Quote.getStandart(toAbsolutePrice(withTokenDecimals(1)), toLegMultiplier(5)),
            ask: Quote.getStandart(toAbsolutePrice(withTokenDecimals(1)), toLegMultiplier(2)),
        });

        await response.confirm({ side: Side.Ask, legMultiplierBps: toLegMultiplier(1) });
    })
    it("The taker prepares, the maker executes, and the maker defaults", async() => {
        const rfq: Rfq = await context.createRfqStepByStep({
            printTradeProvider: program.programId,
            activeWindow: 2,
            settlingWindow: 1,
            legs: [
                HxroInstrument.createForLeg(
                    context,
                    {
                        amount: 0.5 * (10 ** 6),
                        side: Side.Bid,
                        dex: dex,
                        marketProductGroup: marketProductGroup,
                        feeModelProgram: feeModelProgram,
                        riskEngineProgram: riskEngineProgram,
                        feeModelConfigurationAcct: feeModelConfigurationAcct,
                        riskModelConfigurationAcct: riskModelConfigurationAcct,
                        feeOutputRegister: feeOutputRegister,
                        riskOutputRegister: riskOutputRegister,
                        riskAndFeeSigner: riskAndFeeSigner,
                        creatorOwner: context.maker.publicKey,
                        counterpartyOwner: context.taker.publicKey,
                        operatorOwner: operator.publicKey,
                        creator: creatorTrg,
                        counterparty: counterPartyTrg,
                        operator: operatorPartyTrg,
                        printTrade: printTrade,
                    })],
            quote: HxroInstrument.createForQuote(context,
                {
                    creatorOwner: context.maker.publicKey,
                    counterpartyOwner: context.taker.publicKey,
                    operatorOwner: operator.publicKey,
                    creator: creatorTrg,
                    counterparty: counterPartyTrg,
                    operator: operatorPartyTrg,
                    printTrade: printTrade,
                })
        });

        const response = await rfq.respond({
            bid: Quote.getStandart(toAbsolutePrice(withTokenDecimals(1)), toLegMultiplier(5)),
            ask: Quote.getStandart(toAbsolutePrice(withTokenDecimals(1)), toLegMultiplier(2)),
        });

        await response.confirm({ side: Side.Ask, legMultiplierBps: toLegMultiplier(1) });
    })
    it("The taker prepares, the maker executes, and the taker defaults", async() => {
        const rfq: Rfq = await context.createRfqStepByStep({
            printTradeProvider: program.programId,
            activeWindow: 2,
            settlingWindow: 1,
            legs: [
                HxroInstrument.createForLeg(
                    context,
                    {
                        amount: 0.5 * (10 ** 6),
                        side: Side.Bid,
                        dex: dex,
                        marketProductGroup: marketProductGroup,
                        feeModelProgram: feeModelProgram,
                        riskEngineProgram: riskEngineProgram,
                        feeModelConfigurationAcct: feeModelConfigurationAcct,
                        riskModelConfigurationAcct: riskModelConfigurationAcct,
                        feeOutputRegister: feeOutputRegister,
                        riskOutputRegister: riskOutputRegister,
                        riskAndFeeSigner: riskAndFeeSigner,
                        creatorOwner: context.maker.publicKey,
                        counterpartyOwner: context.taker.publicKey,
                        operatorOwner: operator.publicKey,
                        creator: creatorTrg,
                        counterparty: counterPartyTrg,
                        operator: operatorPartyTrg,
                        printTrade: printTrade,
                    })],
            quote: HxroInstrument.createForQuote(context,
                {
                    creatorOwner: context.maker.publicKey,
                    counterpartyOwner: context.taker.publicKey,
                    operatorOwner: operator.publicKey,
                    creator: creatorTrg,
                    counterparty: counterPartyTrg,
                    operator: operatorPartyTrg,
                    printTrade: printTrade,
                })
        });

        const response = await rfq.respond({
            bid: Quote.getStandart(toAbsolutePrice(withTokenDecimals(1)), toLegMultiplier(5)),
            ask: Quote.getStandart(toAbsolutePrice(withTokenDecimals(1)), toLegMultiplier(2)),
        });

        await response.confirm({ side: Side.Ask, legMultiplierBps: toLegMultiplier(1) });
    })
    it("The taker prepares, the maker executes, and both default", async() => {
        const rfq: Rfq = await context.createRfqStepByStep({
            printTradeProvider: program.programId,
            activeWindow: 2,
            settlingWindow: 1,
            legs: [
                HxroInstrument.createForLeg(
                    context,
                    {
                        amount: 0.5 * (10 ** 6),
                        side: Side.Bid,
                        dex: dex,
                        marketProductGroup: marketProductGroup,
                        feeModelProgram: feeModelProgram,
                        riskEngineProgram: riskEngineProgram,
                        feeModelConfigurationAcct: feeModelConfigurationAcct,
                        riskModelConfigurationAcct: riskModelConfigurationAcct,
                        feeOutputRegister: feeOutputRegister,
                        riskOutputRegister: riskOutputRegister,
                        riskAndFeeSigner: riskAndFeeSigner,
                        creatorOwner: context.maker.publicKey,
                        counterpartyOwner: context.taker.publicKey,
                        operatorOwner: operator.publicKey,
                        creator: creatorTrg,
                        counterparty: counterPartyTrg,
                        operator: operatorPartyTrg,
                        printTrade: printTrade,
                    })],
            quote: HxroInstrument.createForQuote(context,
                {
                    creatorOwner: context.maker.publicKey,
                    counterpartyOwner: context.taker.publicKey,
                    operatorOwner: operator.publicKey,
                    creator: creatorTrg,
                    counterparty: counterPartyTrg,
                    operator: operatorPartyTrg,
                    printTrade: printTrade,
                })
        });

        const response = await rfq.respond({
            bid: Quote.getStandart(toAbsolutePrice(withTokenDecimals(1)), toLegMultiplier(5)),
            ask: Quote.getStandart(toAbsolutePrice(withTokenDecimals(1)), toLegMultiplier(2)),
        });

        await response.confirm({ side: Side.Ask, legMultiplierBps: toLegMultiplier(1) });
    })
    it("The taker prepares, and the maker successfully executes", async() => {
        const rfq: Rfq = await context.createRfqStepByStep({
            printTradeProvider: program.programId,
            activeWindow: 2,
            settlingWindow: 1,
            legs: [
                HxroInstrument.createForLeg(
                    context,
                    {
                        amount: 0.5 * (10 ** 6),
                        side: Side.Bid,
                        dex: dex,
                        marketProductGroup: marketProductGroup,
                        feeModelProgram: feeModelProgram,
                        riskEngineProgram: riskEngineProgram,
                        feeModelConfigurationAcct: feeModelConfigurationAcct,
                        riskModelConfigurationAcct: riskModelConfigurationAcct,
                        feeOutputRegister: feeOutputRegister,
                        riskOutputRegister: riskOutputRegister,
                        riskAndFeeSigner: riskAndFeeSigner,
                        creatorOwner: context.maker.publicKey,
                        counterpartyOwner: context.taker.publicKey,
                        operatorOwner: operator.publicKey,
                        creator: creatorTrg,
                        counterparty: counterPartyTrg,
                        operator: operatorPartyTrg,
                        printTrade: printTrade,
                    })],
            quote: HxroInstrument.createForQuote(context,
                {
                    creatorOwner: context.maker.publicKey,
                    counterpartyOwner: context.taker.publicKey,
                    operatorOwner: operator.publicKey,
                    creator: creatorTrg,
                    counterparty: counterPartyTrg,
                    operator: operatorPartyTrg,
                    printTrade: printTrade,
                })
        });

        const response = await rfq.respond({
            bid: Quote.getStandart(toAbsolutePrice(withTokenDecimals(1)), toLegMultiplier(5)),
            ask: Quote.getStandart(toAbsolutePrice(withTokenDecimals(1)), toLegMultiplier(2)),
        });

        await response.confirm({ side: Side.Ask, legMultiplierBps: toLegMultiplier(1) });
    })
    it("The maker prepares, the taker executes, and the maker defaults", async() => {
        const rfq: Rfq = await context.createRfqStepByStep({
            printTradeProvider: program.programId,
            activeWindow: 2,
            settlingWindow: 1,
            legs: [
                HxroInstrument.createForLeg(
                    context,
                    {
                        amount: 0.5 * (10 ** 6),
                        side: Side.Bid,
                        dex: dex,
                        marketProductGroup: marketProductGroup,
                        feeModelProgram: feeModelProgram,
                        riskEngineProgram: riskEngineProgram,
                        feeModelConfigurationAcct: feeModelConfigurationAcct,
                        riskModelConfigurationAcct: riskModelConfigurationAcct,
                        feeOutputRegister: feeOutputRegister,
                        riskOutputRegister: riskOutputRegister,
                        riskAndFeeSigner: riskAndFeeSigner,
                        creatorOwner: context.maker.publicKey,
                        counterpartyOwner: context.taker.publicKey,
                        operatorOwner: operator.publicKey,
                        creator: creatorTrg,
                        counterparty: counterPartyTrg,
                        operator: operatorPartyTrg,
                        printTrade: printTrade,
                    })],
            quote: HxroInstrument.createForQuote(context,
                {
                    creatorOwner: context.maker.publicKey,
                    counterpartyOwner: context.taker.publicKey,
                    operatorOwner: operator.publicKey,
                    creator: creatorTrg,
                    counterparty: counterPartyTrg,
                    operator: operatorPartyTrg,
                    printTrade: printTrade,
                })
        });

        const response = await rfq.respond({
            bid: Quote.getStandart(toAbsolutePrice(withTokenDecimals(1)), toLegMultiplier(5)),
            ask: Quote.getStandart(toAbsolutePrice(withTokenDecimals(1)), toLegMultiplier(2)),
        });

        await response.confirm({ side: Side.Ask, legMultiplierBps: toLegMultiplier(1) });
    })
    it("The maker prepares, the taker executes, and the taker defaults", async() => {
        const rfq: Rfq = await context.createRfqStepByStep({
            printTradeProvider: program.programId,
            activeWindow: 2,
            settlingWindow: 1,
            legs: [
                HxroInstrument.createForLeg(
                    context,
                    {
                        amount: 0.5 * (10 ** 6),
                        side: Side.Bid,
                        dex: dex,
                        marketProductGroup: marketProductGroup,
                        feeModelProgram: feeModelProgram,
                        riskEngineProgram: riskEngineProgram,
                        feeModelConfigurationAcct: feeModelConfigurationAcct,
                        riskModelConfigurationAcct: riskModelConfigurationAcct,
                        feeOutputRegister: feeOutputRegister,
                        riskOutputRegister: riskOutputRegister,
                        riskAndFeeSigner: riskAndFeeSigner,
                        creatorOwner: context.maker.publicKey,
                        counterpartyOwner: context.taker.publicKey,
                        operatorOwner: operator.publicKey,
                        creator: creatorTrg,
                        counterparty: counterPartyTrg,
                        operator: operatorPartyTrg,
                        printTrade: printTrade,
                    })],
            quote: HxroInstrument.createForQuote(context,
                {
                    creatorOwner: context.maker.publicKey,
                    counterpartyOwner: context.taker.publicKey,
                    operatorOwner: operator.publicKey,
                    creator: creatorTrg,
                    counterparty: counterPartyTrg,
                    operator: operatorPartyTrg,
                    printTrade: printTrade,
                })
        });

        const response = await rfq.respond({
            bid: Quote.getStandart(toAbsolutePrice(withTokenDecimals(1)), toLegMultiplier(5)),
            ask: Quote.getStandart(toAbsolutePrice(withTokenDecimals(1)), toLegMultiplier(2)),
        });

        await response.confirm({ side: Side.Ask, legMultiplierBps: toLegMultiplier(1) });
    })
    it("The maker prepares, the taker executes, and both default", async() => {
        const rfq: Rfq = await context.createRfqStepByStep({
            printTradeProvider: program.programId,
            activeWindow: 2,
            settlingWindow: 1,
            legs: [
                HxroInstrument.createForLeg(
                    context,
                    {
                        amount: 0.5 * (10 ** 6),
                        side: Side.Bid,
                        dex: dex,
                        marketProductGroup: marketProductGroup,
                        feeModelProgram: feeModelProgram,
                        riskEngineProgram: riskEngineProgram,
                        feeModelConfigurationAcct: feeModelConfigurationAcct,
                        riskModelConfigurationAcct: riskModelConfigurationAcct,
                        feeOutputRegister: feeOutputRegister,
                        riskOutputRegister: riskOutputRegister,
                        riskAndFeeSigner: riskAndFeeSigner,
                        creatorOwner: context.maker.publicKey,
                        counterpartyOwner: context.taker.publicKey,
                        operatorOwner: operator.publicKey,
                        creator: creatorTrg,
                        counterparty: counterPartyTrg,
                        operator: operatorPartyTrg,
                        printTrade: printTrade,
                    })],
            quote: HxroInstrument.createForQuote(context,
                {
                    creatorOwner: context.maker.publicKey,
                    counterpartyOwner: context.taker.publicKey,
                    operatorOwner: operator.publicKey,
                    creator: creatorTrg,
                    counterparty: counterPartyTrg,
                    operator: operatorPartyTrg,
                    printTrade: printTrade,
                })
        });

        const response = await rfq.respond({
            bid: Quote.getStandart(toAbsolutePrice(withTokenDecimals(1)), toLegMultiplier(5)),
            ask: Quote.getStandart(toAbsolutePrice(withTokenDecimals(1)), toLegMultiplier(2)),
        });

        await response.confirm({ side: Side.Ask, legMultiplierBps: toLegMultiplier(1) });
    })
    it("The maker prepares, and the taker successfully executes", async() => {
        const rfq: Rfq = await context.createRfqStepByStep({
            printTradeProvider: program.programId,
            activeWindow: 2,
            settlingWindow: 1,
            legs: [
                HxroInstrument.createForLeg(
                    context,
                    {
                        amount: 0.5 * (10 ** 6),
                        side: Side.Bid,
                        dex: dex,
                        marketProductGroup: marketProductGroup,
                        feeModelProgram: feeModelProgram,
                        riskEngineProgram: riskEngineProgram,
                        feeModelConfigurationAcct: feeModelConfigurationAcct,
                        riskModelConfigurationAcct: riskModelConfigurationAcct,
                        feeOutputRegister: feeOutputRegister,
                        riskOutputRegister: riskOutputRegister,
                        riskAndFeeSigner: riskAndFeeSigner,
                        creatorOwner: context.maker.publicKey,
                        counterpartyOwner: context.taker.publicKey,
                        operatorOwner: operator.publicKey,
                        creator: creatorTrg,
                        counterparty: counterPartyTrg,
                        operator: operatorPartyTrg,
                        printTrade: printTrade,
                    })],
            quote: HxroInstrument.createForQuote(context,
                {
                    creatorOwner: context.maker.publicKey,
                    counterpartyOwner: context.taker.publicKey,
                    operatorOwner: operator.publicKey,
                    creator: creatorTrg,
                    counterparty: counterPartyTrg,
                    operator: operatorPartyTrg,
                    printTrade: printTrade,
                })
        });

        const response = await rfq.respond({
            bid: Quote.getStandart(toAbsolutePrice(withTokenDecimals(1)), toLegMultiplier(5)),
            ask: Quote.getStandart(toAbsolutePrice(withTokenDecimals(1)), toLegMultiplier(2)),
        });

        await response.confirm({ side: Side.Ask, legMultiplierBps: toLegMultiplier(1) });
    })

    let createTRG = async (keypair: anchor.web3.Keypair) => {
        const dexProgram = new anchor.Program(DexIdl as anchor.Idl, dex, anchor.getProvider()) as Program<Dex>;

        const trg = await anchor.web3.PublicKey.createWithSeed(
            keypair.publicKey,
            getTrgSeeds("1", marketProductGroup),
            dex
        )
        const [traderFeeStateAcct, ] = await anchor.web3.PublicKey.findProgramAddress(
            [
                Buffer.from("trader_fee_acct"),
                trg.toBuffer(),
                marketProductGroup.toBuffer(),
            ],
            feeModelProgram,
        )
        const traderRiskStateKeypair = anchor.web3.Keypair.generate();
        const traderRiskStateAcct = traderRiskStateKeypair.publicKey

        const space = 63632;
        let lamports = await program.provider.connection.getMinimumBalanceForRentExemption(space)

        let createTX = new anchor.web3.Transaction().add(
            anchor.web3.SystemProgram.createAccountWithSeed(
                {
                    fromPubkey: keypair.publicKey,
                    newAccountPubkey: trg,
                    basePubkey: keypair.publicKey,
                    seed: getTrgSeeds("1", marketProductGroup),
                    lamports: lamports,
                    space: space,
                    programId: dex,
                },
            )
        ).add(
            new anchor.web3.TransactionInstruction (
                <anchor.web3.TransactionInstructionCtorFields>{
                    keys: [
                        <anchor.web3.AccountMeta>{pubkey: keypair.publicKey, isSigner: true, isWritable: false},
                        <anchor.web3.AccountMeta>{pubkey: feeModelConfigurationAcct, isSigner: false, isWritable: false},
                        <anchor.web3.AccountMeta>{pubkey: traderFeeStateAcct, isSigner: false, isWritable: true},
                        <anchor.web3.AccountMeta>{pubkey: marketProductGroup, isSigner: false, isWritable: false},
                        <anchor.web3.AccountMeta>{pubkey: trg, isSigner: false, isWritable: false},
                        <anchor.web3.AccountMeta>{pubkey: anchor.web3.SystemProgram.programId, isSigner: false, isWritable: false},
                    ],
                    data: Buffer.from([1]),
                    programId: feeModelProgram,
                },
            )
        ).add(
            await dexProgram.methods.initializeTraderRiskGroup().accounts(
                {
                    owner: keypair.publicKey,
                    traderRiskGroup: trg,
                    marketProductGroup: marketProductGroup,
                    riskSigner: riskAndFeeSigner,
                    traderRiskStateAcct: traderRiskStateAcct,
                    traderFeeStateAcct: traderFeeStateAcct,
                    riskEngineProgram: riskEngineProgram,
                    systemProgram: anchor.web3.SystemProgram.programId,
                }
            ).instruction()
        );

        createTX.feePayer = keypair.publicKey

        await program.provider.connection.confirmTransaction(
            await program.provider.connection.requestAirdrop(operator.publicKey, DEFAULT_SOL_FOR_SIGNERS),

        );

        await anchor.web3.sendAndConfirmTransaction(
            program.provider.connection,
            createTX,
            [keypair, traderRiskStateKeypair],
            {commitment: "confirmed"}
        )

        return [trg, traderFeeStateAcct, traderRiskStateAcct]
    }
})
