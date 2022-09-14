/**
 * This code was GENERATED using the solita package.
 * Please DO NOT EDIT THIS FILE, instead rerun solita to update it or write a wrapper to add functionality.
 *
 * See: https://github.com/metaplex-foundation/solita
 */

import * as beet from '@metaplex-foundation/beet'
import { PriceQuote, priceQuoteBeet } from './PriceQuote'
/**
 * This type is used to derive the {@link Quote} type as well as the de/serializer.
 * However don't refer to it in your code but use the {@link Quote} type instead.
 *
 * @category userTypes
 * @category enums
 * @category generated
 * @private
 */
export type QuoteRecord = {
  Standart: { priceQuote: PriceQuote; legsMultiplierBps: beet.bignum }
  FixedSize: { priceQuote: PriceQuote }
}

/**
 * Union type respresenting the Quote data enum defined in Rust.
 *
 * NOTE: that it includes a `__kind` property which allows to narrow types in
 * switch/if statements.
 * Additionally `isQuote*` type guards are exposed below to narrow to a specific variant.
 *
 * @category userTypes
 * @category enums
 * @category generated
 */
export type Quote = beet.DataEnumKeyAsKind<QuoteRecord>

export const isQuoteStandart = (
  x: Quote
): x is Quote & { __kind: 'Standart' } => x.__kind === 'Standart'
export const isQuoteFixedSize = (
  x: Quote
): x is Quote & { __kind: 'FixedSize' } => x.__kind === 'FixedSize'

/**
 * @category userTypes
 * @category generated
 */
export const quoteBeet = beet.dataEnum<QuoteRecord>([
  [
    'Standart',
    new beet.FixableBeetArgsStruct<QuoteRecord['Standart']>(
      [
        ['priceQuote', priceQuoteBeet],
        ['legsMultiplierBps', beet.u64],
      ],
      'QuoteRecord["Standart"]'
    ),
  ],

  [
    'FixedSize',
    new beet.FixableBeetArgsStruct<QuoteRecord['FixedSize']>(
      [['priceQuote', priceQuoteBeet]],
      'QuoteRecord["FixedSize"]'
    ),
  ],
]) as beet.FixableBeet<Quote>