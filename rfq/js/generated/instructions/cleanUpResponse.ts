/**
 * This code was GENERATED using the solita package.
 * Please DO NOT EDIT THIS FILE, instead rerun solita to update it or write a wrapper to add functionality.
 *
 * See: https://github.com/metaplex-foundation/solita
 */

import * as splToken from '@solana/spl-token'
import * as beet from '@metaplex-foundation/beet'
import * as web3 from '@solana/web3.js'

/**
 * @category Instructions
 * @category CleanUpResponse
 * @category generated
 */
export const cleanUpResponseStruct = new beet.BeetArgsStruct<{
  instructionDiscriminator: number[] /* size: 8 */
}>(
  [['instructionDiscriminator', beet.uniformFixedSizeArray(beet.u8, 8)]],
  'CleanUpResponseInstructionArgs'
)
/**
 * Accounts required by the _cleanUpResponse_ instruction
 *
 * @property [_writable_] maker
 * @property [] firstToPrepare
 * @property [] protocol
 * @property [_writable_] rfq
 * @property [_writable_] response
 * @property [_writable_] quoteEscrow
 * @property [_writable_] quoteBackupTokens
 * @category Instructions
 * @category CleanUpResponse
 * @category generated
 */
export type CleanUpResponseInstructionAccounts = {
  maker: web3.PublicKey
  firstToPrepare: web3.PublicKey
  protocol: web3.PublicKey
  rfq: web3.PublicKey
  response: web3.PublicKey
  quoteEscrow: web3.PublicKey
  quoteBackupTokens: web3.PublicKey
  tokenProgram?: web3.PublicKey
  anchorRemainingAccounts?: web3.AccountMeta[]
}

export const cleanUpResponseInstructionDiscriminator = [
  48, 127, 189, 252, 119, 36, 171, 251,
]

/**
 * Creates a _CleanUpResponse_ instruction.
 *
 * @param accounts that will be accessed while the instruction is processed
 * @category Instructions
 * @category CleanUpResponse
 * @category generated
 */
export function createCleanUpResponseInstruction(
  accounts: CleanUpResponseInstructionAccounts,
  programId = new web3.PublicKey('3t9BM7DwaibpjNVWAWYauZyhjteoTjuJqGEqxCv7x9MA')
) {
  const [data] = cleanUpResponseStruct.serialize({
    instructionDiscriminator: cleanUpResponseInstructionDiscriminator,
  })
  const keys: web3.AccountMeta[] = [
    {
      pubkey: accounts.maker,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: accounts.firstToPrepare,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: accounts.protocol,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: accounts.rfq,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: accounts.response,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: accounts.quoteEscrow,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: accounts.quoteBackupTokens,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: accounts.tokenProgram ?? splToken.TOKEN_PROGRAM_ID,
      isWritable: false,
      isSigner: false,
    },
  ]

  if (accounts.anchorRemainingAccounts != null) {
    for (const acc of accounts.anchorRemainingAccounts) {
      keys.push(acc)
    }
  }

  const ix = new web3.TransactionInstruction({
    programId,
    keys,
    data,
  })
  return ix
}