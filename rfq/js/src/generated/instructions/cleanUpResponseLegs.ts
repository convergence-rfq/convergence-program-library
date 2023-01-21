/**
 * This code was GENERATED using the solita package.
 * Please DO NOT EDIT THIS FILE, instead rerun solita to update it or write a wrapper to add functionality.
 *
 * See: https://github.com/metaplex-foundation/solita
 */

import * as beet from '@metaplex-foundation/beet'
import * as web3 from '@solana/web3.js'

/**
 * @category Instructions
 * @category CleanUpResponseLegs
 * @category generated
 */
export type CleanUpResponseLegsInstructionArgs = {
  legAmountToClear: number
}
/**
 * @category Instructions
 * @category CleanUpResponseLegs
 * @category generated
 */
export const cleanUpResponseLegsStruct = new beet.BeetArgsStruct<
  CleanUpResponseLegsInstructionArgs & {
    instructionDiscriminator: number[] /* size: 8 */
  }
>(
  [
    ['instructionDiscriminator', beet.uniformFixedSizeArray(beet.u8, 8)],
    ['legAmountToClear', beet.u8],
  ],
  'CleanUpResponseLegsInstructionArgs'
)
/**
 * Accounts required by the _cleanUpResponseLegs_ instruction
 *
 * @property [] protocol
 * @property [] rfq
 * @property [_writable_] response
 * @category Instructions
 * @category CleanUpResponseLegs
 * @category generated
 */
export type CleanUpResponseLegsInstructionAccounts = {
  protocol: web3.PublicKey
  rfq: web3.PublicKey
  response: web3.PublicKey
  anchorRemainingAccounts?: web3.AccountMeta[]
}

export const cleanUpResponseLegsInstructionDiscriminator = [
  21, 23, 250, 1, 46, 50, 55, 102,
]

/**
 * Creates a _CleanUpResponseLegs_ instruction.
 *
 * @param accounts that will be accessed while the instruction is processed
 * @param args to provide as instruction data to the program
 *
 * @category Instructions
 * @category CleanUpResponseLegs
 * @category generated
 */
export function createCleanUpResponseLegsInstruction(
  accounts: CleanUpResponseLegsInstructionAccounts,
  args: CleanUpResponseLegsInstructionArgs,
  programId = new web3.PublicKey('EYZVRgDAWHahx3bJXFms7CoPA6ncwJFkGFPiTa15X8Fk')
) {
  const [data] = cleanUpResponseLegsStruct.serialize({
    instructionDiscriminator: cleanUpResponseLegsInstructionDiscriminator,
    ...args,
  })
  const keys: web3.AccountMeta[] = [
    {
      pubkey: accounts.protocol,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: accounts.rfq,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: accounts.response,
      isWritable: true,
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
