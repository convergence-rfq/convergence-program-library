import {Program} from "@project-serum/anchor";
import * as anchor from "@project-serum/anchor";
import { HxroInstrument, IDL } from '../../target/types/hxro_instrument';
import { Side } from "../utilities/types"


describe("RFQ HXRO instrument integration tests", () => {
    const anchor_provider = anchor.AnchorProvider.env();
    anchor.setProvider(anchor_provider)
    const provider = anchor.getProvider()

    const program = anchor.workspace.HxroInstrument as Program<HxroInstrument>;

    it("Settle", async () => {
        let tx = await provider.sendAndConfirm(new anchor.web3.Transaction().add(await program.methods.settle(
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
                side: Side.Ask,
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
                dex: anchor.web3.PublicKey.unique(),
                user: anchor_provider.wallet.publicKey,
                creator: anchor.web3.PublicKey.unique(),
                counterparty: anchor.web3.PublicKey.unique(),
                operator: anchor.web3.PublicKey.unique(),
                marketProductGroup: anchor.web3.PublicKey.unique(),
                product: anchor.web3.PublicKey.unique(),
                printTrade: anchor.web3.PublicKey.unique(),
                systemProgram: anchor.web3.SystemProgram.programId,
                feeModelProgram: anchor.web3.PublicKey.unique(),
                feeModelConfigurationAcct: anchor.web3.PublicKey.unique(),
                feeOutputRegister: anchor.web3.PublicKey.unique(),
                riskEngineProgram: anchor.web3.PublicKey.unique(),
                riskModelConfigurationAcct: anchor.web3.PublicKey.unique(),
                riskOutputRegister: anchor.web3.PublicKey.unique(),
                riskAndFeeSigner: anchor.web3.PublicKey.unique(),
                creatorTraderFeeStateAcct: anchor.web3.PublicKey.unique(),
                creatorTraderRiskStateAcct: anchor.web3.PublicKey.unique(),
                counterpartyTraderFeeStateAcct: anchor.web3.PublicKey.unique(),
                counterpartyTraderRiskStateAcct: anchor.web3.PublicKey.unique(),
            }
        ).instruction()));
        console.log("TX:", tx);
        console.log("OK")
    });
});
