/**
 * This code was GENERATED using the solita package.
 * Please DO NOT EDIT THIS FILE, instead rerun solita to update it or write a wrapper to add functionality.
 *
 * See: https://github.com/metaplex-foundation/solita
 */

import * as web3 from '@solana/web3.js'
import * as beet from '@metaplex-foundation/beet'
import * as beetSolana from '@metaplex-foundation/beet-solana'
import { BaseAssetIndex, baseAssetIndexBeet } from './BaseAssetIndex'
import { Side, sideBeet } from './Side'
export type Leg = {
  instrumentProgram: web3.PublicKey
  baseAssetIndex: BaseAssetIndex
  instrumentData: Uint8Array
  instrumentAmount: beet.bignum
  instrumentDecimals: number
  side: Side
}

/**
 * @category userTypes
 * @category generated
 */
export const legBeet = new beet.FixableBeetArgsStruct<Leg>(
  [
    ['instrumentProgram', beetSolana.publicKey],
    ['baseAssetIndex', baseAssetIndexBeet],
    ['instrumentData', beet.bytes],
    ['instrumentAmount', beet.u64],
    ['instrumentDecimals', beet.u8],
    ['side', sideBeet],
  ],
  'Leg'
)
