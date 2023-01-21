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
 * @category CancelResponse
 * @category generated
 */
export const cancelResponseStruct = new beet.BeetArgsStruct<{
  instructionDiscriminator: number[] /* size: 8 */
}>(
  [['instructionDiscriminator', beet.uniformFixedSizeArray(beet.u8, 8)]],
  'CancelResponseInstructionArgs'
)
/**
 * Accounts required by the _cancelResponse_ instruction
 *
 * @property [**signer**] maker
 * @property [] protocol
 * @property [] rfq
 * @property [_writable_] response
 * @category Instructions
 * @category CancelResponse
 * @category generated
 */
export type CancelResponseInstructionAccounts = {
  maker: web3.PublicKey
  protocol: web3.PublicKey
  rfq: web3.PublicKey
  response: web3.PublicKey
  anchorRemainingAccounts?: web3.AccountMeta[]
}

export const cancelResponseInstructionDiscriminator = [
  24, 134, 17, 237, 161, 162, 94, 141,
]

/**
 * Creates a _CancelResponse_ instruction.
 *
 * @param accounts that will be accessed while the instruction is processed
 * @category Instructions
 * @category CancelResponse
 * @category generated
 */
export function createCancelResponseInstruction(
  accounts: CancelResponseInstructionAccounts,
  programId = new web3.PublicKey('EYZVRgDAWHahx3bJXFms7CoPA6ncwJFkGFPiTa15X8Fk')
) {
  const [data] = cancelResponseStruct.serialize({
    instructionDiscriminator: cancelResponseInstructionDiscriminator,
  })
  const keys: web3.AccountMeta[] = [
    {
      pubkey: accounts.maker,
      isWritable: false,
      isSigner: true,
    },
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
