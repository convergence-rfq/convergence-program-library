import * as anchor from '@project-serum/anchor';
import { Program } from '@project-serum/anchor';
import { Rfq } from '../target/types/rfq';
import * as assert from 'assert';


describe('rfq', () => {

  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.Provider.env());
  const provider = anchor.getProvider();
  const program = anchor.workspace.Rfq as Program<Rfq>;

  it('Initializes RFQs', async () => {
    // Add your test here.
    const feeDenominator = 1_000;
    const feeNumerator = 3;
    const { tx, protocolState } = await program.rpc.initialize(provider, feeDenominator, feeNumerator);
    assert.ok(protocolState.rfqCount.eq(new anchor.BN(0)));
    console.log("Your transaction signature", tx);


  });


  it('Initialize RFQ One!', async () => {
    // Add your test here.
    const tx = await program.rpc.initialize({});
    console.log("Your transaction signature", tx);


  });

});
