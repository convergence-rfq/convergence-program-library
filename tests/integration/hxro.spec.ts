import * as anchor from "@project-serum/anchor";
import {Program} from "@project-serum/anchor";
import * as spl_token from "@solana/spl-token";
import {HxroInstrument as HxroInstrumentType} from '../../target/types/hxro_instrument';
import {Dex, DexIdl} from '../../hxro-instrument/dex-cpi/types';
import {AuthoritySide, Quote, Side} from "../utilities/types"
import {Context, getContext, Rfq} from "../utilities/wrappers";
import {HxroInstrument} from "../utilities/instruments/hxroInstrument";
import {toAbsolutePrice, toLegMultiplier, withTokenDecimals} from "../utilities/helpers";

function getTrgSeeds(name: string, marketProductGroup: anchor.web3.PublicKey): string {
    return "trdr_grp1:test" + name
}


describe("RFQ HXRO instrument integration tests", () => {
    anchor.setProvider(anchor.AnchorProvider.env())

    const tokenOwner = anchor.web3.Keypair.fromSecretKey(
        Buffer.from(
            [
                174,0,231,45,221,204,179,151,16,120,255,207,200,60,242,
                58,170,29,201,133,50,218,139,171,200,32,222,163,187,66,
                61,86,238,210,223,44,186,127,248,161,168,0,219,156,89,
                43,133,62,195,229,3,130,60,155,237,41,152,220,86,4,84,
                115,71,162
            ]
        )
    );

    const operator = anchor.web3.Keypair.generate();

    const program = anchor.workspace.HxroInstrument as Program<HxroInstrumentType>;

    const dex = new anchor.web3.PublicKey("FUfpR31LmcP1VSbz5zDaM7nxnH55iBHkpwusgrnhaFjL");
    const marketProductGroup = new anchor.web3.PublicKey("HyWxreWnng9ZBDPYpuYugAfpCMkRkJ1oz93oyoybDFLB");
    const feeModelProgram = new anchor.web3.PublicKey("5AZioCPiC7uZ4zRmkKSg5nsb2A98RhmW89a1pMwiDoeT");
    const riskEngineProgram = new anchor.web3.PublicKey("92wdgEqyiDKrcbFHoBTg8HxMj932xweRCKaciGSW3uMr");
    const feeModelConfigurationAcct = new anchor.web3.PublicKey("4Zwghg3tNaHZuzpQHDWA4mbSyoVrNEfvS765z7s4tNYd");
    const riskModelConfigurationAcct = new anchor.web3.PublicKey("9kg11bsVU4MueSBhMbnhW5j7HjfMPin7NNWZZkdoFnRJ");
    const feeOutputRegister = new anchor.web3.PublicKey("rPnaqXrvo3aBMChVLywnVz6nykSfXwvBYu1Yz1p6crv");
    const riskOutputRegister = new anchor.web3.PublicKey("DevB1VB5Tt3YAeYZ8XTB1fXiFtXBqcP7PbfWGB71YyCE");
    const riskAndFeeSigner = new anchor.web3.PublicKey("AQJYsJ9k47ahEEXhvnNBFca4yH3zcFUfVaKrLPLgftYg");
    const BTCUSDPythOracle = new anchor.web3.PublicKey("HovQMDrbAgAYPCmHVSrezcSmkMtXSSUsLDFANExrZh2J");
    const marketProductGroupVault = new anchor.web3.PublicKey("HLzQZ9DndaXkrwfwq8RbZFsDdSQ91Hufht6ekBSmfbQq")
    const whitelistMint = new spl_token.Token(
        program.provider.connection,
        new anchor.web3.PublicKey("6QFnukEmE8kgaYD6Cn2kTbuQp9vUHw6MDnaZbRFBy7BL"),
        spl_token.TOKEN_PROGRAM_ID,
        tokenOwner,
    )
    let vaultMint = new spl_token.Token(
        program.provider.connection,
        new anchor.web3.PublicKey("HYuv5qxNmUpAVcm8u2rPCjjL2Sz5KHnVWsm56vYzZtjh"),
        spl_token.TOKEN_PROGRAM_ID,
        tokenOwner,
    )

    let context: Context;

    before(async () => {
        let airdropTX = await program.provider.connection.requestAirdrop(
            operator.publicKey,
            anchor.web3.LAMPORTS_PER_SOL * 2
        )
        console.log("airdropTX", airdropTX)

        context = await getContext();
    });

    it("HXRO flow works", async () => {
        const dexProgram = new anchor.Program(DexIdl as anchor.Idl, dex, anchor.getProvider()) as Program<Dex>;

        let [creatorTrg, creatorTraderFeeStateAcct, creatorTraderRiskStateAcct] = await createTRG(context.taker);
        let [counterPartyTrg, counterPartyTraderFeeStateAcct, counterPartyTraderRiskStateAcct] = await createTRG(context.maker);
        let [operatorPartyTrg, operatorPartyTraderFeeStateAcct, operatorPartyTraderRiskStateAcct] = await createTRG(operator);

        const [printTrade, ] = await anchor.web3.PublicKey.findProgramAddress(
            [
                Buffer.from(anchor.utils.bytes.utf8.encode("print_trade")),
                creatorTrg.toBuffer(),
                counterPartyTrg.toBuffer(),
            ],
            dexProgram.programId,
        )

        const [markPrices, ] = await anchor.web3.PublicKey.findProgramAddress(
            [
                Buffer.from("mark_prices"),
                marketProductGroup.toBuffer(),
            ],
            riskEngineProgram,
        )

        const [s_account, ] =
            await anchor.web3.PublicKey.findProgramAddress(
                [
                    Buffer.from("s"),
                    marketProductGroup.toBytes()
                ],
                riskEngineProgram);
        const [r_account, ] =
            await anchor.web3.PublicKey.findProgramAddress(
                [
                    Buffer.from("r"),
                    marketProductGroup.toBytes()
                ],
                riskEngineProgram);

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
                        creatorTraderFeeStateAcct: creatorTraderFeeStateAcct,
                        creatorTraderRiskStateAcct: creatorTraderRiskStateAcct,
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
                    creatorTraderFeeStateAcct: creatorTraderFeeStateAcct,
                    creatorTraderRiskStateAcct: creatorTraderRiskStateAcct,
                })
        });

        const response = await rfq.respond({
            bid: Quote.getStandart(toAbsolutePrice(withTokenDecimals(1)), toLegMultiplier(5)),
            ask: Quote.getStandart(toAbsolutePrice(withTokenDecimals(1)), toLegMultiplier(2)),
        });

        await response.confirm({ side: Side.Ask, legMultiplierBps: toLegMultiplier(1) });

        await response.preparePrintTradeSettlement(AuthoritySide.Taker)

        let executeAccounts = [
            { pubkey: program.programId, isSigner: false, isWritable:false },
            { pubkey: dex, isSigner: false, isWritable:false },
            { pubkey: context.maker.publicKey, isSigner: true, isWritable: true },
            { pubkey: creatorTrg, isSigner: false, isWritable:true },
            { pubkey: counterPartyTrg, isSigner: false, isWritable:true },
            { pubkey: operatorPartyTrg, isSigner: false, isWritable:true },
            { pubkey: marketProductGroup, isSigner: false, isWritable:true },
            { pubkey: printTrade, isSigner: false, isWritable:true },
            { pubkey: anchor.web3.SystemProgram.programId, isSigner: false, isWritable:false },
            { pubkey: anchor.web3.SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable:false },
            { pubkey: feeModelProgram, isSigner: false, isWritable:false },
            { pubkey: feeModelConfigurationAcct, isSigner: false, isWritable:false },
            { pubkey: feeOutputRegister, isSigner: false, isWritable:true },
            { pubkey: riskEngineProgram, isSigner: false, isWritable:false },
            { pubkey: riskModelConfigurationAcct, isSigner: false, isWritable:false },
            { pubkey: riskOutputRegister, isSigner: false, isWritable:true },
            { pubkey: riskAndFeeSigner, isSigner: false, isWritable:false },
            { pubkey: creatorTraderFeeStateAcct, isSigner: false, isWritable:true },
            { pubkey: creatorTraderRiskStateAcct, isSigner: false, isWritable:true },
            { pubkey: counterPartyTraderFeeStateAcct, isSigner: false, isWritable:true },
            { pubkey: counterPartyTraderRiskStateAcct, isSigner: false, isWritable:true },
            { pubkey: s_account, isSigner: false, isWritable:true },
            { pubkey: r_account, isSigner: false, isWritable:true },
            { pubkey: markPrices, isSigner: false, isWritable:true },
            { pubkey: BTCUSDPythOracle, isSigner: false, isWritable:true },
        ];

        let depositTXHash = await hxroDeposit(counterPartyTrg, context.maker);
        console.log("depositTXHash: ", depositTXHash)

        await response.executePrintTrade(AuthoritySide.Maker, executeAccounts).catch((e) => console.log("ERROR:", e))
    });

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

        console.log("TRG: ", trg.toString())
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

        const createTXHash = await anchor.web3.sendAndConfirmTransaction(
            program.provider.connection,
            createTX,
            [keypair, traderRiskStateKeypair]
        ).catch(e => {
            console.log(e)
        });
        console.log("createTXHash: ", createTXHash)

        return [trg, traderFeeStateAcct, traderRiskStateAcct]
    }

    let airdropWhitelistATA = async (keypair: anchor.web3.Keypair) => {
        const ownerWhitelistAtaAcct = await spl_token.Token.getAssociatedTokenAddress(
            spl_token.ASSOCIATED_TOKEN_PROGRAM_ID,
            spl_token.TOKEN_PROGRAM_ID,
            whitelistMint.publicKey,
            tokenOwner.publicKey
        );

        const userWhitelistAtaAcct = (await whitelistMint.getOrCreateAssociatedAccountInfo(keypair.publicKey)).address
        const whitelistTransferTx = await whitelistMint.transfer(
            ownerWhitelistAtaAcct,
            userWhitelistAtaAcct,
            tokenOwner,
            [tokenOwner],
            1
        ).catch((e) => {console.log(e)});
        console.log("whitelistTransferTx", whitelistTransferTx);

        return userWhitelistAtaAcct;
    }

    let airdropVaultMintATA = async (keypair: anchor.web3.Keypair) => {
        const tokenAccount = await spl_token.Token.getAssociatedTokenAddress(
            spl_token.ASSOCIATED_TOKEN_PROGRAM_ID,
            spl_token.TOKEN_PROGRAM_ID,
            vaultMint.publicKey,
            tokenOwner.publicKey
        );

        const userTokenAccount = (await vaultMint.getOrCreateAssociatedAccountInfo(keypair.publicKey)).address

        const transferTx = await vaultMint.transfer(
            tokenAccount,
            userTokenAccount,
            tokenOwner,
            [tokenOwner],
            (10 ** 6)
        ).catch((e) => {console.log(e)});
        console.log("transferTx", transferTx);

        return userTokenAccount;
    }

    let hxroDeposit = async (
        trg: anchor.web3.PublicKey,
        keypair: anchor.web3.Keypair
    ) => {
        const [capitalLimitsState, ] = await anchor.web3.PublicKey.findProgramAddress(
            [
                Buffer.from("capital_limits_state"),
                marketProductGroup.toBytes(),
            ],
            dex
        )

        let userWhitelistAtaAcct = await airdropWhitelistATA(keypair).catch(
            (e) => console.log("ERROR:", e)
        );
        let userVaultMintAtaAcct = await airdropVaultMintATA(keypair).catch(
            (e) => console.log("ERROR:", e)
        );

        let depositTX = new anchor.web3.Transaction().add(
            new anchor.web3.TransactionInstruction (
                // @ts-ignore
                <anchor.web3.TransactionInstructionCtorFields>{
                    keys: [
                        spl_token.TOKEN_PROGRAM_ID,
                        keypair.publicKey,
                        userVaultMintAtaAcct,
                        trg,
                        marketProductGroup,
                        marketProductGroupVault,
                        capitalLimitsState,
                        userWhitelistAtaAcct
                    ],
                    data: Buffer.from([1]),
                    programId: dex,
                },
            )
        )

        return await anchor.web3.sendAndConfirmTransaction(
            program.provider.connection,
            depositTX,
            [keypair]
        ).catch(e => {
            console.log(e)
        })
    }
});
