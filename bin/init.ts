#!/usr/bin/env ts-node

import * as anchor from '@project-serum/anchor'
import * as dotenv from 'dotenv'

import { PROTOCOL_SEED, getProgram } from '../lib/helpers'

dotenv.config()

const env = anchor.AnchorProvider.env()
anchor.setProvider(env)

const provider = anchor.getProvider()

const main = async (): Promise<any> => {
  const program = await getProgram(provider)

  const feeDenominator = 1_000
  const feeNumerator = 0

  const [protocolPda, _protocolBump] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from(PROTOCOL_SEED)],
    program.programId
  )

  const tx = await program.methods.initialize(
    new anchor.BN(feeDenominator),
    new anchor.BN(feeNumerator))
    .accounts({
      authority: env.wallet.publicKey,
      protocol: protocolPda,
      systemProgram: anchor.web3.SystemProgram.programId
    })
    .rpc()

  return tx
}

main()
  .then(tx => {
    console.log(tx)
  })
  .catch(err => {
    console.log(err)
  })