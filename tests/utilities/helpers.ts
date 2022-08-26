import { BN } from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";
import chai, { expect } from "chai";
import chaiBn from "chai-bn";
import { ABSOLUTE_PRICE_DECIMALS, LEG_MULTIPLIER_DECIMALS } from "./constants";
import { Context, Mint } from "./wrappers";

chai.use(chaiBn(BN));

// This function supresses solana error traces making test output clearer
export const expectError = async (promise: Promise<any>, errorText: string) => {
  // Disable error logs to prevent errors from blockchain validator spam
  const cachedStderrWrite = process.stdout.write;
  process.stderr.write = () => true;
  try {
    await promise;
    throw new Error(`No error thrown!`);
  } catch (e) {
    // Restore error logs
    process.stderr.write = cachedStderrWrite;

    if (!e?.message.includes(errorText) && !e?.logs?.some((e: string) => e.includes(errorText))) {
      throw e;
    }
  }
};

export const sleep = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export function toAbsolutePrice(value: BN) {
  return new BN(10).pow(new BN(ABSOLUTE_PRICE_DECIMALS)).mul(value);
}

export function toLegMultiplier(value: BN) {
  return new BN(10).pow(new BN(LEG_MULTIPLIER_DECIMALS)).mul(value);
}

export function withTokenDecimals(value: number) {
  return new BN(10).pow(new BN(9)).muln(value);
}

export class TokenChangeMeasurer {
  private constructor(
    private snapshots: {
      mint: Mint;
      user: PublicKey;
      balance: BN;
    }[]
  ) {}

  static async takeSnapshot(
    context: Context,
    mints = [context.quoteToken, context.assetToken],
    users = [context.taker.publicKey, context.maker.publicKey]
  ) {
    const snapshots = await Promise.all(
      mints.map(async (mint) => {
        return await Promise.all(
          users.map(async (user) => {
            return {
              mint,
              user,
              balance: await mint.getAssociatedBalance(user),
            };
          })
        );
      })
    );
    const flattened = snapshots.flat();

    return new TokenChangeMeasurer(flattened);
  }

  async expectChange(
    changes: {
      mint: Mint;
      user: PublicKey;
      delta: BN;
    }[]
  ) {
    for (const change of changes) {
      const snapshot = this.snapshots.find(
        (x) => x.mint.publicKey.equals(change.mint.publicKey) && x.user.equals(change.user)
      );
      const currentBalance = await change.mint.getAssociatedBalance(change.user);
      expect(change.delta).to.be.bignumber.equal(
        currentBalance.sub(snapshot.balance),
        `Balance change differs from expected! Mint: ${change.mint.publicKey.toString()}, user: ${change.user.toString()}, balance before: ${snapshot.balance.toString()}, balance currenty: ${currentBalance.toString()}, expected change: ${change.delta.toString()}`
      );
    }
  }
}
