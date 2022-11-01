import {Program} from "@project-serum/anchor";
import * as anchor from "@project-serum/anchor";
import { HxroInstrument as HxroInstrumentType } from '../../target/types/hxro_instrument';
import { DexIdl, Dex } from '../../hxro-instrument/dex-cpi/types';
import {AuthoritySide, Quote, Side} from "../utilities/types"
import {Context, getContext, Mint} from "../utilities/wrappers";
import { HxroInstrument } from "../utilities/instruments/hxroInstrument";
import {toAbsolutePrice, toLegMultiplier, withTokenDecimals} from "../utilities/helpers";
import * as spl_token from "@solana/spl-token";
import {ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID} from "@solana/spl-token";
import {DEFAULT_COLLATERAL_FUNDED} from "../utilities/constants";

function getTrgSeeds(name: string, marketProductGroup: anchor.web3.PublicKey): string {
    return "trdr_grp1:test" + name
}


describe("RFQ HXRO instrument integration tests", () => {
    anchor.setProvider(anchor.AnchorProvider.env())

    const payer = anchor.web3.Keypair.fromSecretKey(
        Buffer.from(
            JSON.parse(
                require("fs").readFileSync(process.env.ANCHOR_WALLET, {
                    encoding: "utf-8",
                })
            )
        )
    );
    const counterpartyPayer = anchor.web3.Keypair.generate();

    const dex = new anchor.web3.PublicKey("FUfpR31LmcP1VSbz5zDaM7nxnH55iBHkpwusgrnhaFjL");
    const marketProductGroup = new anchor.web3.PublicKey("HyWxreWnng9ZBDPYpuYugAfpCMkRkJ1oz93oyoybDFLB");
    const feeModelProgram = new anchor.web3.PublicKey("5AZioCPiC7uZ4zRmkKSg5nsb2A98RhmW89a1pMwiDoeT");
    const riskEngineProgram = new anchor.web3.PublicKey("92wdgEqyiDKrcbFHoBTg8HxMj932xweRCKaciGSW3uMr");
    const feeModelConfigurationAcct = new anchor.web3.PublicKey("4Zwghg3tNaHZuzpQHDWA4mbSyoVrNEfvS765z7s4tNYd");
    const riskModelConfigurationAcct = new anchor.web3.PublicKey("9kg11bsVU4MueSBhMbnhW5j7HjfMPin7NNWZZkdoFnRJ");
    const feeOutputRegister = new anchor.web3.PublicKey("rPnaqXrvo3aBMChVLywnVz6nykSfXwvBYu1Yz1p6crv");
    const riskOutputRegister = new anchor.web3.PublicKey("DevB1VB5Tt3YAeYZ8XTB1fXiFtXBqcP7PbfWGB71YyCE");
    const riskAndFeeSigner = new anchor.web3.PublicKey("AQJYsJ9k47ahEEXhvnNBFca4yH3zcFUfVaKrLPLgftYg");

    let response_key: anchor.web3.PublicKey;

    const program = anchor.workspace.HxroInstrument as Program<HxroInstrumentType>;

    let context: Context;

    before(async () => {
        context = await getContext();
    });

    it("Create two-way RFQ with one hxro leg", async () => {
        const vaultMint = new spl_token.Token(
            context.provider.connection,
            new anchor.web3.PublicKey("HYuv5qxNmUpAVcm8u2rPCjjL2Sz5KHnVWsm56vYzZtjh"),
            spl_token.TOKEN_PROGRAM_ID,
            payer,
        )

        await context.quoteToken.createAssociatedAccountWithTokens(
            payer.publicKey
        )
        await context.quoteToken.createAssociatedAccountWithTokens(
            counterpartyPayer.publicKey
        )
        try {
            const vaultMintWrapped = await Mint.wrap(context, vaultMint.publicKey);

            const rfq = await context.createRfq({
                legs: [
                    HxroInstrument.create(
                        context,
                        {
                            mint: vaultMintWrapped,
                            amount: withTokenDecimals(1),
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
                        })],
            });
            // response with agreeing to sell 2 bitcoins for 22k$ or buy 5 for 21900$
            const response = await rfq.respond({
                bid: Quote.getStandart(toAbsolutePrice(withTokenDecimals(1)), toLegMultiplier(5)),
                ask: Quote.getStandart(toAbsolutePrice(withTokenDecimals(1)), toLegMultiplier(2)),
            });
            response_key = response.account;
            // taker confirms to buy 1 bitcoin
            await response.confirm({ side: Side.Ask, legMultiplierBps: toLegMultiplier(1) });
            await response.prepareSettlement(AuthoritySide.Taker);
            await response.prepareSettlement(AuthoritySide.Maker);
        } catch (e) {
            console.log("ERROR", e)
        }
    });

    it("Settle", async () => {
        const [escrow, ] = await anchor.web3.PublicKey.findProgramAddress(
            [
                Buffer.from("escrow"),
                response_key.toBytes(),
                Uint8Array.of(0)
            ],
            program.programId
        )

        const dexProgram = new anchor.Program(DexIdl as anchor.Idl, dex, anchor.getProvider()) as Program<Dex>;
        const product = new anchor.web3.PublicKey("3ERnKTAEcXGMQkT9kkwAi5ECPmvpKzVfAvymV2Bc13YU");

        const operator = new anchor.web3.PublicKey("GbA1vNKFzGQogorVNF4yWrU7mWdb1gKAMJCSmirEApXg");

        const creator = await anchor.web3.PublicKey.createWithSeed(
            payer.publicKey,
            getTrgSeeds("1", marketProductGroup),
            dex
        )
        const [creatorTraderFeeStateAcct, ] = await anchor.web3.PublicKey.findProgramAddress(
            [
                Buffer.from("trader_fee_acct"),
                creator.toBuffer(),
                marketProductGroup.toBuffer(),
            ],
            feeModelProgram,
        )
        const creatorTraderRiskStateKeypair = anchor.web3.Keypair.generate();
        const creatorTraderRiskStateAcct = creatorTraderRiskStateKeypair.publicKey

        console.log("Creator: ", creator.toString())
        const space = 63632;
        let lamports = await program.provider.connection.getMinimumBalanceForRentExemption(space)

        let createCreatorTX = new anchor.web3.Transaction().add(
            anchor.web3.SystemProgram.createAccountWithSeed(
                {
                    fromPubkey: payer.publicKey,
                    newAccountPubkey: creator,
                    basePubkey: payer.publicKey,
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
                        <anchor.web3.AccountMeta>{pubkey: payer.publicKey, isSigner: true, isWritable: false},
                        <anchor.web3.AccountMeta>{pubkey: feeModelConfigurationAcct, isSigner: false, isWritable: false},
                        <anchor.web3.AccountMeta>{pubkey: creatorTraderFeeStateAcct, isSigner: false, isWritable: true},
                        <anchor.web3.AccountMeta>{pubkey: marketProductGroup, isSigner: false, isWritable: false},
                        <anchor.web3.AccountMeta>{pubkey: creator, isSigner: false, isWritable: false},
                        <anchor.web3.AccountMeta>{pubkey: anchor.web3.SystemProgram.programId, isSigner: false, isWritable: false},
                    ],
                    data: Buffer.from([1]),
                    programId: feeModelProgram,
                },
            )
        ).add(
            await dexProgram.methods.initializeTraderRiskGroup().accounts(
                {
                    owner: payer.publicKey,
                    traderRiskGroup: creator,
                    marketProductGroup: marketProductGroup,
                    riskSigner: riskAndFeeSigner,
                    traderRiskStateAcct: creatorTraderRiskStateAcct,
                    traderFeeStateAcct: creatorTraderFeeStateAcct,
                    riskEngineProgram: riskEngineProgram,
                    systemProgram: anchor.web3.SystemProgram.programId,
                }
            ).instruction()
        );

        createCreatorTX.feePayer = payer.publicKey

        const createCreatorTXHash = await anchor.web3.sendAndConfirmTransaction(
            program.provider.connection,
            createCreatorTX,
            [payer, creatorTraderRiskStateKeypair]
        ).catch(e => {
            console.log(e)
        });
        console.log("createCreatorTXHash: ", createCreatorTXHash)

        const counterparty = await anchor.web3.PublicKey.createWithSeed(
            counterpartyPayer.publicKey,
            getTrgSeeds("2", marketProductGroup),
            dex
        )
        const [counterpartyTraderFeeStateAcct, ] = await anchor.web3.PublicKey.findProgramAddress(
            [
                Buffer.from("trader_fee_acct"),
                counterparty.toBuffer(),
                marketProductGroup.toBuffer(),
            ],
            feeModelProgram,
        )

        const counterpartyTraderRiskStateKeypair = anchor.web3.Keypair.generate();
        const counterpartyTraderRiskStateAcct = counterpartyTraderRiskStateKeypair.publicKey

        console.log("Counterparty: ", counterparty.toString())

        let createCounterpartyTX = new anchor.web3.Transaction().add(
            anchor.web3.SystemProgram.createAccountWithSeed(
                {
                    fromPubkey: counterpartyPayer.publicKey,
                    newAccountPubkey: counterparty,
                    basePubkey: counterpartyPayer.publicKey,
                    seed: getTrgSeeds("2", marketProductGroup),
                    lamports: lamports,
                    space: space,
                    programId: dex,
                },
            )
        ).add(
            new anchor.web3.TransactionInstruction (
                <anchor.web3.TransactionInstructionCtorFields>{
                    keys: [
                        <anchor.web3.AccountMeta>{pubkey: counterpartyPayer.publicKey, isSigner: true, isWritable: false},
                        <anchor.web3.AccountMeta>{pubkey: feeModelConfigurationAcct, isSigner: false, isWritable: false},
                        <anchor.web3.AccountMeta>{pubkey: counterpartyTraderFeeStateAcct, isSigner: false, isWritable: true},
                        <anchor.web3.AccountMeta>{pubkey: marketProductGroup, isSigner: false, isWritable: false},
                        <anchor.web3.AccountMeta>{pubkey: counterparty, isSigner: false, isWritable: false},
                        <anchor.web3.AccountMeta>{pubkey: anchor.web3.SystemProgram.programId, isSigner: false, isWritable: false},
                    ],
                    data: Buffer.from([1]),
                    programId: feeModelProgram,
                },
            )
        ).add(
            await dexProgram.methods.initializeTraderRiskGroup().accounts(
                {
                    owner: counterpartyPayer.publicKey,
                    traderRiskGroup: counterparty,
                    marketProductGroup: marketProductGroup,
                    riskSigner: riskAndFeeSigner,
                    traderRiskStateAcct: counterpartyTraderRiskStateAcct,
                    traderFeeStateAcct: counterpartyTraderFeeStateAcct,
                    riskEngineProgram: riskEngineProgram,
                    systemProgram: anchor.web3.SystemProgram.programId,
                }
            ).instruction()
        );

        createCounterpartyTX.feePayer = counterpartyPayer.publicKey

        const createCounterpartyTXHash = await anchor.web3.sendAndConfirmTransaction(
            program.provider.connection,
            createCounterpartyTX,
            [counterpartyPayer, counterpartyTraderRiskStateKeypair]
        ).catch(e => {
            console.log(e)
        });
        console.log("createCounterpartyTXHash: ", createCounterpartyTXHash)

        const [printTrade, ] = await anchor.web3.PublicKey.findProgramAddress(
            [
                Buffer.from(anchor.utils.bytes.utf8.encode("print_trade")),
                product.toBuffer(),
                creator.toBuffer(),
                counterparty.toBuffer(),
            ],
            dexProgram.programId,
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

        const marketProductGroupVault = new anchor.web3.PublicKey("HLzQZ9DndaXkrwfwq8RbZFsDdSQ91Hufht6ekBSmfbQq")
        const [capitalLimitsState, ] = await anchor.web3.PublicKey.findProgramAddress(
            [
                Buffer.from("capital_limits_state"),
                marketProductGroup.toBytes(),
            ],
            dex
        )
        const whitelistMint = new anchor.web3.PublicKey("6QFnukEmE8kgaYD6Cn2kTbuQp9vUHw6MDnaZbRFBy7BL");

        const whitelistAtaAcct = await spl_token.Token.getAssociatedTokenAddress(
            spl_token.ASSOCIATED_TOKEN_PROGRAM_ID,
            spl_token.TOKEN_PROGRAM_ID,
            whitelistMint,
            payer.publicKey
        );

        console.log(
            {
                dex: dex.toString(),
                creatorOwner: payer.publicKey.toString(),
                counterpartyOwner: counterpartyPayer.publicKey.toString(),
                creator: creator.toString(),
                counterparty: counterparty.toString(),
                operator: operator.toString(),
                marketProductGroup: marketProductGroup.toString(),
                product: product.toString(),
                printTrade: printTrade.toString(),
                systemProgram: anchor.web3.SystemProgram.programId.toString(),
                feeModelProgram: feeModelProgram.toString(),
                feeModelConfigurationAcct: feeModelConfigurationAcct.toString(),
                feeOutputRegister: feeOutputRegister.toString(),
                riskEngineProgram: riskEngineProgram.toString(),
                riskModelConfigurationAcct: riskModelConfigurationAcct.toString(),
                riskOutputRegister: riskOutputRegister.toString(),
                riskAndFeeSigner: riskAndFeeSigner.toString(),
                creatorTraderFeeStateAcct: creatorTraderFeeStateAcct.toString(),
                creatorTraderRiskStateAcct: creatorTraderRiskStateAcct.toString(),
                counterpartyTraderFeeStateAcct: counterpartyTraderFeeStateAcct.toString(),
                counterpartyTraderRiskStateAcct: counterpartyTraderRiskStateAcct.toString(),
                sAccount: s_account.toString(),
                rAccount: r_account.toString(),
                marketProductGroupVault: marketProductGroupVault.toString(),
                capitalLimitsState: capitalLimitsState.toString(),
                whitelistAtaAcct: whitelistAtaAcct.toString(),
                escrow: escrow.toString(),
            }
        )
        let tx = await program.methods.settle(
            // @ts-ignore
            {
                productIndex: new anchor.BN(0),
                size: {
                    m: new anchor.BN(0),
                    exp: new anchor.BN(0),
                },
                price: {
                    m: new anchor.BN(0),
                    exp: new anchor.BN(0),
                },
                creatorSide: Side.Ask,
                counterpartySide: Side.Bid,
                operatorCreatorFeeProportion: {
                    m: new anchor.BN(0),
                    exp: new anchor.BN(0),
                },
                operatorCounterpartyFeeProportion: {
                    m: new anchor.BN(0),
                    exp: new anchor.BN(0),
                },
            }
        ).accounts(
            {
                dex: dex,
                creatorOwner: payer.publicKey,
                counterpartyOwner: counterpartyPayer.publicKey,
                creator: creator,
                counterparty: counterparty,
                operator: operator,
                marketProductGroup: marketProductGroup,
                product: product,
                printTrade: printTrade,
                systemProgram: anchor.web3.SystemProgram.programId,
                feeModelProgram: feeModelProgram,
                feeModelConfigurationAcct: feeModelConfigurationAcct,
                feeOutputRegister: feeOutputRegister,
                riskEngineProgram: riskEngineProgram,
                riskModelConfigurationAcct: riskModelConfigurationAcct,
                riskOutputRegister: riskOutputRegister,
                riskAndFeeSigner: riskAndFeeSigner,
                creatorTraderFeeStateAcct: creatorTraderFeeStateAcct,
                creatorTraderRiskStateAcct: creatorTraderRiskStateAcct,
                counterpartyTraderFeeStateAcct: counterpartyTraderFeeStateAcct,
                counterpartyTraderRiskStateAcct: counterpartyTraderRiskStateAcct,
                sAccount: s_account,
                rAccount: r_account,
                tokenProgram: spl_token.TOKEN_PROGRAM_ID,
                marketProductGroupVault: marketProductGroupVault,
                capitalLimits: capitalLimitsState,
                whitelistAtaAcct: whitelistAtaAcct,
                escrow: escrow,
            }
        ).signers(
            [payer, counterpartyPayer]
        ).transaction();

        tx.feePayer = payer.publicKey;

        let txHash = await anchor.web3.sendAndConfirmTransaction(
            program.provider.connection,
            tx,
            [payer, counterpartyPayer]
        ).catch(e => {
            console.log(e)
        });
        console.log("TX:", txHash);
    });
});
