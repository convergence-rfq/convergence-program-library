import * as assert from "assert";
import { Context } from "./wrappers";

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

export function getTimestampInFuture(afterSeconds: number) {
  const now = new Date().getTime() / 1_000;
  return now + afterSeconds;
}

export class TokenChangeMeasurer {
  private makerAssets: number;
  private makerQuotes: number;
  private takerAssets: number;
  private takerQuotes: number;

  private constructor(private context: Context) {}

  static async takeSnapshot(context: Context) {
    const measurer = new TokenChangeMeasurer(context);
    measurer.makerAssets = await context.getAssetTokenBalance(context.maker.publicKey);
    measurer.makerQuotes = await context.getQuoteTokenBalance(context.maker.publicKey);
    measurer.takerAssets = await context.getAssetTokenBalance(context.taker.publicKey);
    measurer.takerQuotes = await context.getQuoteTokenBalance(context.taker.publicKey);
    return measurer;
  }

  async expectChange(changes: {
    makerAssets?: number;
    makerQuotes?: number;
    takerAssets?: number;
    takerQuotes?: number;
  }) {
    if (changes.makerAssets !== undefined) {
      const currentValue = await this.context.getAssetTokenBalance(this.context.maker.publicKey);
      assert.equal(currentValue - this.makerAssets, changes.makerAssets);
      // console.log(`!!!makerAssets ${currentValue - this.makerAssets}`);
    }
    if (changes.makerQuotes !== undefined) {
      const currentValue = await this.context.getQuoteTokenBalance(this.context.maker.publicKey);
      assert.equal(currentValue - this.makerQuotes, changes.makerQuotes);
      // console.log(`!!!makerQuotes ${currentValue - this.makerQuotes}`);
    }
    if (changes.takerAssets !== undefined) {
      const currentValue = await this.context.getAssetTokenBalance(this.context.taker.publicKey);
      assert.equal(currentValue - this.takerAssets, changes.takerAssets);
      // console.log(`!!!takerAssets ${currentValue - this.takerAssets}`);
    }
    if (changes.takerQuotes !== undefined) {
      const currentValue = await this.context.getQuoteTokenBalance(this.context.taker.publicKey);
      assert.equal(currentValue - this.takerQuotes, changes.takerQuotes);
      // console.log(`!!!takerQuotes ${currentValue - this.takerQuotes}`);
    }
  }
}
