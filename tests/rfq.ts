import * as anchor from '@project-serum/anchor';
import { Program, Provider } from '@project-serum/anchor';
import { Rfq } from '../target/types/rfq';
import * as assert from 'assert';
import * as idl from '../target/idl/rfq.json';


describe('rfq', () => {

  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.Provider.env());
  const provider = anchor.getProvider();
  const program = anchor.workspace.Rfq as Program<Rfq>;

  it('Initializes RFQs', async () => {
    const feeDenominator = 1_000;
    const feeNumerator = 3;
    const { tx, state } = await initializeProtocol(provider, feeDenominator, feeNumerator);
    assert.ok(state.rfqCount.eq(new anchor.BN(0)));
    console.log("Your transaction signature");


  });


  it('Initialize RFQ One!', async () => {
    // Add your test here.
    const tx = await program.rpc.initialize({});
    console.log("Your transaction signature");


  });

});



export async function initializeProtocol(
  provider: Provider,
  feeDenominator: number,
  feeNumerator: number
): Promise<any> {
  const program = getProgram(provider);
  const [protocolPda, _protocolBump] = await getProtocolPda(provider);
  const tx = await program.rpc.initialize(new anchor.BN(feeDenominator), new anchor.BN(feeNumerator), {
    accounts: {
      authority: provider.wallet.publicKey,
      protocol: protocolPda,
      systemProgram: anchor.web3.SystemProgram.programId
    }
  });
  const protocolState = await program.account.state.fetch(protocolPda)
  return { tx, protocolState };
}

export async function getProtocolPda(provider: any): Promise<any> {
  const program = getProgram(provider);
  const [protocolPda, protocolBump] = await anchor.web3.PublicKey.findProgramAddress(
    [toBuffer('convergence_rfq')],
    program.programId
  );
  return [protocolPda, protocolBump];
}

export async function getProgram(provider: Provider): Program<Rfq> {
  const programId = new anchor.web3.PublicKey(idl.metadata.address);
  // @ts-ignore
  return new anchor.Program(idl, programId, provider);
}

export const toBuffer = (x: any) => {
  return Buffer.from(anchor.utils.bytes.utf8.encode(x));
}
