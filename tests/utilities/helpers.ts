import { BN } from "@project-serum/anchor";
import { BigNumber } from "bignumber.js";
import { PublicKey } from "@solana/web3.js";
import chai, { expect } from "chai";
import chaiBn from "chai-bn";
import { ABSOLUTE_PRICE_DECIMALS, EMPTY_LEG_SIZE, LEG_MULTIPLIER_DECIMALS } from "./constants";
import { Context, Mint } from "./wrappers";
import { InstrumentController } from "./instrument";

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

export function toLegMultiplier(value: number) {
  let bignumber = new BigNumber(value).multipliedBy(new BigNumber(10).pow(LEG_MULTIPLIER_DECIMALS));
  return new BN(bignumber.toString());
}

export function withTokenDecimals(value: number) {
  let bignumber = new BigNumber(value).multipliedBy(new BigNumber(10).pow(9));
  return new BN(bignumber.toString());
}

export function executeInParallel(...fns: (() => Promise<any>)[]) {
  return Promise.all(fns.map((x) => x()));
}

export function calculateLegsSize(legs: InstrumentController[]) {
  return legs.map((leg) => EMPTY_LEG_SIZE + leg.getInstrumendDataSize()).reduce((x, y) => x + y, 4);
}

type MeasuredToken =
  | "quote"
  | "asset"
  | "additionalAsset"
  | "walletCollateral"
  | "unlockedCollateral"
  | "totalCollateral"
  | Mint;

export class TokenChangeMeasurer {
  private constructor(
    private context: Context,
    private snapshots: {
      token: MeasuredToken;
      user: PublicKey;
      balance: BN;
    }[]
  ) {}

  static takeDefaultSnapshot(context: Context) {
    return this.takeSnapshot(context, ["quote", "asset"], [context.taker.publicKey, context.maker.publicKey]);
  }

  static async takeSnapshot(context: Context, tokens: MeasuredToken[], users: PublicKey[]) {
    const snapshots = await Promise.all(
      tokens.map(async (token) => {
        return await Promise.all(
          users.map(async (user) => {
            return {
              token,
              user,
              balance: await TokenChangeMeasurer.getValue(context, token, user),
            };
          })
        );
      })
    );
    const flattened = snapshots.flat();

    return new TokenChangeMeasurer(context, flattened);
  }

  private static getValue(context: Context, token: MeasuredToken, user: PublicKey) {
    if (token == "quote") {
      return context.quoteToken.getAssociatedBalance(user);
    } else if (token == "asset") {
      return context.assetToken.getAssociatedBalance(user);
    } else if (token == "additionalAsset") {
      return context.additionalAssetToken.getAssociatedBalance(user);
    } else if (token == "unlockedCollateral") {
      return context.collateralToken.getUnlockedCollateral(user);
    } else if (token == "totalCollateral") {
      return context.collateralToken.getTotalCollateral(user);
    } else if (token == "walletCollateral") {
      return context.collateralToken.getAssociatedBalance(user);
    } else {
      return token.getAssociatedBalance(user);
    }
  }

  async expectChange(
    changes: {
      token: MeasuredToken;
      user: PublicKey;
      delta: BN;
    }[]
  ) {
    let extendedChanges = await Promise.all(
      changes.map(async (change) => {
        return {
          currentBalance: await TokenChangeMeasurer.getValue(this.context, change.token, change.user),
          ...change,
        };
      })
    );
    for (const change of extendedChanges) {
      const snapshot = this.snapshots.find((x) => x.token == change.token && x.user.equals(change.user));
      expect(change.delta).to.be.bignumber.equal(
        change.currentBalance.sub(snapshot.balance),
        `Balance change differs from expected! Token: ${change.token.toString()}, user: ${change.user.toString()}, balance before: ${snapshot.balance.toString()}, balance currenty: ${change.currentBalance.toString()}, expected change: ${change.delta.toString()}`
      );
    }
  }
}

export function toLittleEndian(value: number, bytes: number) {
  const buf = Buffer.allocUnsafe(bytes);
  buf.writeUIntLE(value, 0, bytes);
  return buf;
}
