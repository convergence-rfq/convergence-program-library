import * as anchor from '@project-serum/anchor';
import { Program } from '@project-serum/anchor';
import { Rfq } from '../target/types/rfq';

describe('rfq', () => {

  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.Provider.env());

  const program = anchor.workspace.Rfq as Program<Rfq>;

  it('Initialize RFQ with tokens!', async () => {
    // Add your test here.
    const tx = await program.rpc.initialize({});
    console.log("Your transaction signature", tx);


  });


  it('Initialize RFQ One!', async () => {
    // Add your test here.
    const tx = await program.rpc.initialize({});
    console.log("Your transaction signature", tx);


  });

});
