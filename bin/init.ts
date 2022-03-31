#!/usr/bin/env ts-node

import * as anchor from '@project-serum/anchor';
import * as dotenv from 'dotenv';

import {
  getProgram,
  getPda
} from '../lib/helpers';

dotenv.config();

anchor.setProvider(anchor.Provider.env());

const provider = anchor.getProvider();

const main = async (): Promise<any> => {
  const program = await getProgram(provider);

  const feeDenominator = 1_000;
  const feeNumerator = 0;

  const [protocolPda, _protocolBump] = await getPda(provider, 'convergence_rfq');

  const tx = await program.rpc.initialize(
    new anchor.BN(feeDenominator),
    new anchor.BN(feeNumerator),
    {
      accounts: {
        authority: provider.wallet.publicKey,
        protocol: protocolPda,
        systemProgram: anchor.web3.SystemProgram.programId
      }
    });

  return tx;
}

main()
  .then(tx => {
    console.log(tx);
  })
  .catch(err => {
    console.log(err);
  });