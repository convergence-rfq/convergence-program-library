import { BN } from "@coral-xyz/anchor";
import { PublicKey, Keypair, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import {
  mintTo,
  getAccount,
  createMint,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";
import { getCollateralInfoPda, getCollateralTokenPda, getMintInfoPda } from "../pdas";
import { DEFAULT_TOKEN_AMOUNT, DEFAULT_MINT_DECIMALS } from "../constants";
import { executeInParallel } from "../helpers";
import { Context } from "./context";

export class Mint {
  public publicKey: PublicKey;
  public decimals: number;
  public baseAssetIndex: number | null;
  public mintInfoAddress: PublicKey | null;

  protected constructor(protected context: Context, address: PublicKey) {
    this.publicKey = address;
    this.decimals = DEFAULT_MINT_DECIMALS;
    this.baseAssetIndex = null;
    this.mintInfoAddress = null;
  }

  public static async wrap(context: Context, address: PublicKey) {
    const mint = new Mint(context, address);

    await executeInParallel(
      async () => await mint.createAssociatedTokenAccount(context.taker.publicKey),
      async () => await mint.createAssociatedTokenAccount(context.maker.publicKey),
      async () => await mint.createAssociatedTokenAccount(context.dao.publicKey)
    );

    return mint;
  }

  public static async loadExisting(
    context: Context,
    mintAddress: PublicKey,
    isRegistered?: boolean,
    baseAssetIndex?: number
  ) {
    const mint = new Mint(context, mintAddress);
    if (isRegistered) {
      mint.mintInfoAddress = await getMintInfoPda(mintAddress, context.program.programId);
    }
    mint.baseAssetIndex = baseAssetIndex ?? null;
    return mint;
  }

  public static async create(context: Context, keypair?: Keypair) {
    const token = await createMint(
      context.provider.connection,
      context.dao,
      context.dao.publicKey,
      null,
      DEFAULT_MINT_DECIMALS,
      keypair
    );
    const mint = new Mint(context, token);
    await executeInParallel(
      async () => await mint.createAssociatedAccountWithTokens(context.taker.publicKey),
      async () => await mint.createAssociatedAccountWithTokens(context.maker.publicKey),
      async () => await mint.createAssociatedAccountWithTokens(context.dao.publicKey)
    );

    return mint;
  }

  public async register(baseAssetIndex: number | null) {
    await this.context.registerMint(this, baseAssetIndex);
    this.baseAssetIndex = baseAssetIndex;
    this.mintInfoAddress = await getMintInfoPda(this.publicKey, this.context.program.programId);
  }

  public async createAssociatedAccountWithTokens(address: PublicKey, amount = DEFAULT_TOKEN_AMOUNT) {
    const account = await this.createAssociatedTokenAccount(address);
    await mintTo(
      this.context.provider.connection,
      this.context.dao,
      this.publicKey,
      account,
      this.context.dao,
      amount.toString()
    );
  }

  public async createAssociatedTokenAccount(address: PublicKey) {
    const associatedToken = this.getAssociatedAddress(address);

    const transaction = new Transaction().add(
      createAssociatedTokenAccountInstruction(this.context.dao.publicKey, associatedToken, address, this.publicKey)
    );

    await sendAndConfirmTransaction(this.context.provider.connection, transaction, [this.context.dao]);

    return associatedToken;
  }

  public getAssociatedAddress(address: PublicKey) {
    return getAssociatedTokenAddressSync(this.publicKey, address, true);
  }

  public async getAssociatedBalance(address: PublicKey) {
    const account = await getAccount(this.context.provider.connection, await this.getAssociatedAddress(address));
    return new BN(account.amount);
  }

  public assertRegisteredAsBaseAsset(): asserts this is {
    baseAssetIndex: number;
    mintInfoAddress: PublicKey;
  } {
    if (this.baseAssetIndex === null || this.mintInfoAddress === null) {
      throw new Error(`Mint ${this.publicKey.toString()} is not registered as base asset!`);
    }
  }

  public assertRegistered(): asserts this is { mintInfoAddress: PublicKey } {
    if (this.mintInfoAddress === null) {
      throw new Error(`Mint ${this.publicKey.toString()} is not registered!`);
    }
  }
}

export class CollateralMint extends Mint {
  public static async create(context: Context, keypair?: Keypair) {
    const mint = await Mint.create(context, keypair);
    return new CollateralMint(context, mint.publicKey);
  }

  public static async loadExisting(context: Context, mintAddress: PublicKey) {
    return new CollateralMint(context, mintAddress);
  }

  public async getTotalCollateral(address: PublicKey) {
    const account = await getAccount(this.context.provider.connection, await this.getTokenPda(address));
    return account.amount;
  }

  public async getUnlockedCollateral(address: PublicKey) {
    const tokenAccount = await getAccount(this.context.provider.connection, await this.getTokenPda(address));
    const collateralInfo = await this.context.program.account.collateralInfo.fetch(await this.getInfoPda(address));
    return new BN(tokenAccount.amount).sub(collateralInfo.lockedTokensAmount);
  }

  public async getTokenPda(address: PublicKey) {
    return await getCollateralTokenPda(address, this.context.program.programId);
  }

  public async getInfoPda(address: PublicKey) {
    return await getCollateralInfoPda(address, this.context.program.programId);
  }
}
