import * as anchor from "@project-serum/anchor";
import {HxroInstrument as HxroInstrumentType} from '../../target/types/hxro_instrument';
import {Context, getContext} from "../utilities/wrappers";


describe("RFQ HXRO instrument integration tests", () => {
    anchor.setProvider(anchor.AnchorProvider.env())

    const operator = anchor.web3.Keypair.generate();

    const program = anchor.workspace.HxroInstrument as anchor.Program<HxroInstrumentType>;

    let context: Context;

    before(async () => {
        await program.provider.connection.requestAirdrop(
            operator.publicKey,
            anchor.web3.LAMPORTS_PER_SOL * 2
        )

        context = await getContext();
    });

    it("Both parties fail to prepare and both default", async() => {

    })
    it("The taker prepares, but the maker defaults", async() => {

    })
    it("The maker prepares, but the taker defaults", async() => {

    })
    it("The taker prepares, the maker executes, and the maker defaults", async() => {

    })
    it("The taker prepares, the maker executes, and the taker defaults", async() => {

    })
    it("The taker prepares, the maker executes, and both default", async() => {

    })
    it("The taker prepares, and the maker successfully executes", async() => {

    })
    it("The maker prepares, the taker executes, and the maker defaults", async() => {

    })
    it("The maker prepares, the taker executes, and the taker defaults", async() => {

    })
    it("The maker prepares, the taker executes, and both default", async() => {

    })
    it("The maker prepares, and the taker successfully executes", async() => {

    })
})
