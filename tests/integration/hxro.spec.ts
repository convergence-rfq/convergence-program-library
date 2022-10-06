import {Program} from "@project-serum/anchor";
import * as anchor from "@project-serum/anchor";
import { HxroInstrument as HxroInstrumentType } from '../../target/types/hxro_instrument';
import { DexIdl, Dex } from '../../hxro-instrument/dex-cpi/types';
import { Side } from "../utilities/types"
import { Context, getContext } from "../utilities/wrappers";
import { HxroInstrument } from "../utilities/hxroInstrument";
import {withTokenDecimals} from "../utilities/helpers";

function getTrgSeeds(name: string, marketProductGroup: anchor.web3.PublicKey): string {
    return "trdr_grp1:test" + name
}


describe("RFQ HXRO instrument integration tests", () => {
    anchor.setProvider(anchor.AnchorProvider.env())

    const program = anchor.workspace.HxroInstrument as Program<HxroInstrumentType>;

    let context: Context;

    before(async () => {
        context = await getContext();
    });

    it("Create two-way RFQ with one hxro leg", async () => {
        // create a two-way RFQ specifying 1 bitcoin as a leg
        const rfq = await context.createRfq({
                legs: [
                    new HxroInstrument(
                        context,
                        {
                            amount: withTokenDecimals(1),
                            side: Side.Bid
                        })],
            });
    });

    it("Settle", async () => {
        const payer = anchor.web3.Keypair.generate();
        const counterpartyPayer = anchor.web3.Keypair.generate();

        let airdropTX = await program.provider.connection.requestAirdrop(
            payer.publicKey,
            anchor.web3.LAMPORTS_PER_SOL * 2,
        )

        console.log("airdropTX", airdropTX)

        // sleep
        await new Promise( resolve => { setTimeout(resolve, 10000) });

        let airdropTX2 = await program.provider.connection.requestAirdrop(
            counterpartyPayer.publicKey,
            anchor.web3.LAMPORTS_PER_SOL * 2
        )
        console.log("airdropTX2", airdropTX2)

        const dex = new anchor.web3.PublicKey("FUfpR31LmcP1VSbz5zDaM7nxnH55iBHkpwusgrnhaFjL");
        const dexProgram = new anchor.Program(DexIdl as anchor.Idl, dex, anchor.getProvider()) as Program<Dex>;
        const product = new anchor.web3.PublicKey("3ERnKTAEcXGMQkT9kkwAi5ECPmvpKzVfAvymV2Bc13YU");

        const marketProductGroup = new anchor.web3.PublicKey("HyWxreWnng9ZBDPYpuYugAfpCMkRkJ1oz93oyoybDFLB");
        const feeModelProgram = new anchor.web3.PublicKey("5AZioCPiC7uZ4zRmkKSg5nsb2A98RhmW89a1pMwiDoeT");
        const riskEngineProgram = new anchor.web3.PublicKey("92wdgEqyiDKrcbFHoBTg8HxMj932xweRCKaciGSW3uMr");
        const feeModelConfigurationAcct = new anchor.web3.PublicKey("4Zwghg3tNaHZuzpQHDWA4mbSyoVrNEfvS765z7s4tNYd");
        const riskModelConfigurationAcct = new anchor.web3.PublicKey("9kg11bsVU4MueSBhMbnhW5j7HjfMPin7NNWZZkdoFnRJ");

        const operator = new anchor.web3.PublicKey("GbA1vNKFzGQogorVNF4yWrU7mWdb1gKAMJCSmirEApXg");

        const feeOutputRegister = new anchor.web3.PublicKey("rPnaqXrvo3aBMChVLywnVz6nykSfXwvBYu1Yz1p6crv");
        const riskOutputRegister = new anchor.web3.PublicKey("DevB1VB5Tt3YAeYZ8XTB1fXiFtXBqcP7PbfWGB71YyCE");
        const riskAndFeeSigner = new anchor.web3.PublicKey("AQJYsJ9k47ahEEXhvnNBFca4yH3zcFUfVaKrLPLgftYg");

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
            }
        ).signers(
            [payer, counterpartyPayer]
        ).transaction();

        tx.feePayer = payer.publicKey;

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
            }
        )

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
