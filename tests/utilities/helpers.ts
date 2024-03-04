import { AnchorError, BN, Program } from "@coral-xyz/anchor";
import { sha256 } from "@noble/hashes/sha256";
import { BigNumber } from "bignumber.js";
import { PublicKey, ComputeBudgetProgram, SendTransactionError } from "@solana/web3.js";
import chai, { expect } from "chai";
import chaiBn from "chai-bn";
import { ABSOLUTE_PRICE_DECIMALS, FEE_BPS_DECIMALS, LEG_MULTIPLIER_DECIMALS, SPOT_QUOTE_FEE_BPS } from "./constants";
import { Context, Mint } from "./wrappers";
import { Rfq as RfqIdl } from "../../target/types/rfq";
import { FeeParams, LegData } from "./types";
import { getBaseAssetPda } from "./pdas";

chai.use(chaiBn(BN));

// This function supresses solana error traces making test output clearer
export const expectError = async (promise: Promise<any>, errorText: string) => {
  try {
    await promise;
    throw new Error(`No error thrown!`);
  } catch (e) {
    if (!e?.message.includes(errorText) && !e?.logs?.some((e: string) => e.includes(errorText))) {
      throw e;
    }
  }
};

export const sleep = (seconds: number) => {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
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

type InferredOutputs<T> = Promise<{ [K in keyof T]: T[K] extends () => Promise<infer R> ? R : never }>;
export async function executeInParallel<T extends Array<() => Promise<any>>>(...fns: T): Promise<InferredOutputs<T>> {
  return Promise.all(fns.map((x) => x())) as unknown as InferredOutputs<T>;
}

/**
 * Runs a promise in parallel with wait promise, awaiting both of them.
 *
 * @remarks
 * Is usually is used to do things in parallel while waiting for an RFQ to default to save time on the test run
 *
 * @param promiseGetter - A promise getter. It's easier to convert a block of async code to a getter than to a promise
 * @param waitInSeconds - Wait time in seconds
 * @returns Result of `promiseGetter`
 */
export async function runInParallelWithWait<T>(promiseGetter: () => Promise<T>, waitInSeconds: number): Promise<T> {
  const [result] = await Promise.all([promiseGetter(), sleep(waitInSeconds)]);
  return result;
}

export function serializeLegData(legs: LegData[], program: Program<RfqIdl>) {
  const serializedLegsData = legs.map((leg) => program.coder.types.encode("Leg", leg));
  const lengthBuffer = Buffer.alloc(4);
  lengthBuffer.writeInt32LE(legs.length);
  const fullLegDataBuffer = Buffer.concat([lengthBuffer, ...serializedLegsData]);
  return { data: fullLegDataBuffer, hash: sha256(fullLegDataBuffer) };
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
      return context.btcToken.getAssociatedBalance(user);
    } else if (token == "additionalAsset") {
      return context.solToken.getAssociatedBalance(user);
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
      precision?: BN;
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
      if (!snapshot) {
        throw Error(`Missing snapshot for token ${change.token} and user ${change.user.toString()}`);
      }
      if (change.precision === undefined) {
        expect(change.delta).to.be.bignumber.equal(
          change.currentBalance.sub(snapshot.balance),
          `Balance change differs from expected! Token: ${change.token.toString()}, user: ${change.user.toString()}, balance before: ${snapshot.balance.toString()}, balance currenty: ${change.currentBalance.toString()}, expected change: ${change.delta.toString()}`
        );
      } else {
        let difference = change.delta.sub(change.currentBalance.sub(snapshot.balance)).abs();
        expect(difference).to.be.bignumber.lessThan(
          change.precision,
          `Balance change differs from expected! Token: ${change.token.toString()}, user: ${change.user.toString()}, balance before: ${snapshot.balance.toString()}, balance currenty: ${change.currentBalance.toString()}, expected change: ${change.delta.toString()} with precision ${change.precision.toString()}`
        );
      }
    }
  }
}

export function toLittleEndian(value: number, bytes: number) {
  const buf = Buffer.allocUnsafe(bytes);
  buf.writeUIntLE(value, 0, bytes);
  return buf;
}

export const expandComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({
  units: 1400000,
});

export function serializeOptionQuote(quote: any | null, program: Program<RfqIdl>): Buffer {
  if (quote === null) {
    return Buffer.from([0]);
  }

  const serializedQuote = program.coder.types.encode("Quote", quote);
  return Buffer.concat([Buffer.from([1]), serializedQuote]);
}

export function calculateFeesValue(value: BN, fee: number): BN {
  const bignumValue = new BigNumber(value.toString());
  return new BN(bignumValue.multipliedBy(fee).toString());
}

export function toApiFeeParams(params: FeeParams) {
  return {
    takerBps: new BN(params.taker * 10 ** FEE_BPS_DECIMALS),
    makerBps: new BN(params.maker * 10 ** FEE_BPS_DECIMALS),
  };
}

// call this function from mocha beforeAll hook
export function attachImprovedLogDisplay(mochaContext: Mocha.Context, context: Context) {
  function customErrorHandler(error: Error) {
    let parsedError;
    if (error instanceof AnchorError) {
      parsedError = {
        logs: error.logs,
        message: error.error.errorMessage,
      };
    } else if (error instanceof SendTransactionError && error.logs) {
      parsedError = {
        logs: error.logs,
        message: error.message,
      };
    }

    if (parsedError) {
      console.error(`Logs for error "${parsedError.message}"`);
      for (const log of parsedError.logs) {
        const modifiedLog = addPubkeyExplanations(context, log);
        console.error(modifiedLog);
      }
    }
  }

  function wrapTestFunction(fn: Mocha.Func | Mocha.AsyncFunc): Mocha.Func | Mocha.AsyncFunc {
    return async function (this: Mocha.Context, done) {
      try {
        if (fn.length === 1) {
          // The test function expects a 'done' callback
          (fn as Mocha.Func).call(this, done);
        } else {
          // The test function returns a promise
          await (fn as Mocha.AsyncFunc).call(this);
        }
      } catch (error) {
        customErrorHandler(error);
        throw error;
      }
    };
  }

  if (mochaContext.currentTest?.fn) {
    mochaContext.currentTest.fn = wrapTestFunction(mochaContext.currentTest.fn);
  }
}

export function addPubkeyExplanations(context: Context, input: string) {
  let result = input;
  for (const [pubkeyString, name] of Object.entries(context.pubkeyToName)) {
    result = result.replace(new RegExp(pubkeyString, "g"), `${pubkeyString}(${name})`);
  }

  return result;
}

export function toBaseAssetAccount(index: number, program: Program<RfqIdl>) {
  return {
    pubkey: getBaseAssetPda(index, program.programId),
    isSigner: false,
    isWritable: false,
  };
}

export function inversePubkeyToName(value: { [pubkey: string]: string }): { [name: string]: PublicKey } {
  const result: { [name: string]: PublicKey } = {};

  for (const key in value) {
    const name = value[key];
    result[name] = new PublicKey(key);
  }

  return result;
}

export function calculateSpotQuoteFee(amount: BN): BN {
  return amount.mul(SPOT_QUOTE_FEE_BPS).div(new BN(10).pow(new BN(FEE_BPS_DECIMALS)));
}

export function withoutSpotQuoteFees(amount: BN): BN {
  return amount.sub(calculateSpotQuoteFee(amount));
}
