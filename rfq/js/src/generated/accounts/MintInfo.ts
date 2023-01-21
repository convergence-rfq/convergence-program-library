/**
 * This code was GENERATED using the solita package.
 * Please DO NOT EDIT THIS FILE, instead rerun solita to update it or write a wrapper to add functionality.
 *
 * See: https://github.com/metaplex-foundation/solita
 */

import * as web3 from '@solana/web3.js'
import * as beet from '@metaplex-foundation/beet'
import * as beetSolana from '@metaplex-foundation/beet-solana'
import { MintType, mintTypeBeet } from '../types/MintType'

/**
 * Arguments used to create {@link MintInfo}
 * @category Accounts
 * @category generated
 */
export type MintInfoArgs = {
  bump: number
  mintAddress: web3.PublicKey
  decimals: number
  mintType: MintType
}

export const mintInfoDiscriminator = [199, 115, 213, 221, 219, 29, 135, 174]
/**
 * Holds the data for the {@link MintInfo} Account and provides de/serialization
 * functionality for that data
 *
 * @category Accounts
 * @category generated
 */
export class MintInfo implements MintInfoArgs {
  private constructor(
    readonly bump: number,
    readonly mintAddress: web3.PublicKey,
    readonly decimals: number,
    readonly mintType: MintType
  ) {}

  /**
   * Creates a {@link MintInfo} instance from the provided args.
   */
  static fromArgs(args: MintInfoArgs) {
    return new MintInfo(
      args.bump,
      args.mintAddress,
      args.decimals,
      args.mintType
    )
  }

  /**
   * Deserializes the {@link MintInfo} from the data of the provided {@link web3.AccountInfo}.
   * @returns a tuple of the account data and the offset up to which the buffer was read to obtain it.
   */
  static fromAccountInfo(
    accountInfo: web3.AccountInfo<Buffer>,
    offset = 0
  ): [MintInfo, number] {
    return MintInfo.deserialize(accountInfo.data, offset)
  }

  /**
   * Retrieves the account info from the provided address and deserializes
   * the {@link MintInfo} from its data.
   *
   * @throws Error if no account info is found at the address or if deserialization fails
   */
  static async fromAccountAddress(
    connection: web3.Connection,
    address: web3.PublicKey,
    commitmentOrConfig?: web3.Commitment | web3.GetAccountInfoConfig
  ): Promise<MintInfo> {
    const accountInfo = await connection.getAccountInfo(
      address,
      commitmentOrConfig
    )
    if (accountInfo == null) {
      throw new Error(`Unable to find MintInfo account at ${address}`)
    }
    return MintInfo.fromAccountInfo(accountInfo, 0)[0]
  }

  /**
   * Provides a {@link web3.Connection.getProgramAccounts} config builder,
   * to fetch accounts matching filters that can be specified via that builder.
   *
   * @param programId - the program that owns the accounts we are filtering
   */
  static gpaBuilder(
    programId: web3.PublicKey = new web3.PublicKey(
      'EYZVRgDAWHahx3bJXFms7CoPA6ncwJFkGFPiTa15X8Fk'
    )
  ) {
    return beetSolana.GpaBuilder.fromStruct(programId, mintInfoBeet)
  }

  /**
   * Deserializes the {@link MintInfo} from the provided data Buffer.
   * @returns a tuple of the account data and the offset up to which the buffer was read to obtain it.
   */
  static deserialize(buf: Buffer, offset = 0): [MintInfo, number] {
    return mintInfoBeet.deserialize(buf, offset)
  }

  /**
   * Serializes the {@link MintInfo} into a Buffer.
   * @returns a tuple of the created Buffer and the offset up to which the buffer was written to store it.
   */
  serialize(): [Buffer, number] {
    return mintInfoBeet.serialize({
      accountDiscriminator: mintInfoDiscriminator,
      ...this,
    })
  }

  /**
   * Returns the byteSize of a {@link Buffer} holding the serialized data of
   * {@link MintInfo} for the provided args.
   *
   * @param args need to be provided since the byte size for this account
   * depends on them
   */
  static byteSize(args: MintInfoArgs) {
    const instance = MintInfo.fromArgs(args)
    return mintInfoBeet.toFixedFromValue({
      accountDiscriminator: mintInfoDiscriminator,
      ...instance,
    }).byteSize
  }

  /**
   * Fetches the minimum balance needed to exempt an account holding
   * {@link MintInfo} data from rent
   *
   * @param args need to be provided since the byte size for this account
   * depends on them
   * @param connection used to retrieve the rent exemption information
   */
  static async getMinimumBalanceForRentExemption(
    args: MintInfoArgs,
    connection: web3.Connection,
    commitment?: web3.Commitment
  ): Promise<number> {
    return connection.getMinimumBalanceForRentExemption(
      MintInfo.byteSize(args),
      commitment
    )
  }

  /**
   * Returns a readable version of {@link MintInfo} properties
   * and can be used to convert to JSON and/or logging
   */
  pretty() {
    return {
      bump: this.bump,
      mintAddress: this.mintAddress.toBase58(),
      decimals: this.decimals,
      mintType: this.mintType.__kind,
    }
  }
}

/**
 * @category Accounts
 * @category generated
 */
export const mintInfoBeet = new beet.FixableBeetStruct<
  MintInfo,
  MintInfoArgs & {
    accountDiscriminator: number[] /* size: 8 */
  }
>(
  [
    ['accountDiscriminator', beet.uniformFixedSizeArray(beet.u8, 8)],
    ['bump', beet.u8],
    ['mintAddress', beetSolana.publicKey],
    ['decimals', beet.u8],
    ['mintType', mintTypeBeet],
  ],
  MintInfo.fromArgs,
  'MintInfo'
)
