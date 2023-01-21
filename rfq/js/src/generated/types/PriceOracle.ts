/**
 * This code was GENERATED using the solita package.
 * Please DO NOT EDIT THIS FILE, instead rerun solita to update it or write a wrapper to add functionality.
 *
 * See: https://github.com/metaplex-foundation/solita
 */

import * as web3 from '@solana/web3.js'
import * as beetSolana from '@metaplex-foundation/beet-solana'
import * as beet from '@metaplex-foundation/beet'
/**
 * This type is used to derive the {@link PriceOracle} type as well as the de/serializer.
 * However don't refer to it in your code but use the {@link PriceOracle} type instead.
 *
 * @category userTypes
 * @category enums
 * @category generated
 * @private
 */
export type PriceOracleRecord = {
  Switchboard: { address: web3.PublicKey }
}

/**
 * Union type respresenting the PriceOracle data enum defined in Rust.
 *
 * NOTE: that it includes a `__kind` property which allows to narrow types in
 * switch/if statements.
 * Additionally `isPriceOracle*` type guards are exposed below to narrow to a specific variant.
 *
 * @category userTypes
 * @category enums
 * @category generated
 */
export type PriceOracle = beet.DataEnumKeyAsKind<PriceOracleRecord>

export const isPriceOracleSwitchboard = (
  x: PriceOracle
): x is PriceOracle & { __kind: 'Switchboard' } => x.__kind === 'Switchboard'

/**
 * @category userTypes
 * @category generated
 */
export const priceOracleBeet = beet.dataEnum<PriceOracleRecord>([
  [
    'Switchboard',
    new beet.BeetArgsStruct<PriceOracleRecord['Switchboard']>(
      [['address', beetSolana.publicKey]],
      'PriceOracleRecord["Switchboard"]'
    ),
  ],
]) as beet.FixableBeet<PriceOracle>
