import { BN } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, Transaction, AccountMeta } from "@solana/web3.js";
import { getCollateralInfoPda, getCollateralTokenPda, getResponsePda } from "../pdas";
import { DEFAULT_PRICE, DEFAULT_LEG_MULTIPLIER } from "../constants";
import { Quote } from "../types";
import { InstrumentController } from "../instrument";
import { expandComputeUnits, serializeOptionQuote, toBaseAssetAccount } from "../helpers";
import { HxroPrintTradeProvider } from "../printTradeProviders/hxroPrintTradeProvider";
import { Context } from "./context";
import { Response } from "./response";

export type RfqContent =
  | { type: "instrument"; quote: InstrumentController; legs: InstrumentController[] }
  | { type: "printTradeProvider"; provider: HxroPrintTradeProvider };

export class Rfq {
  private activeWindowExpiration?: number;
  public constructor(
    public context: Context,
    public account: PublicKey,
    public content: RfqContent,
    public whitelist: PublicKey | null
  ) {}

  async getActiveWindowExpiration() {
    if (this.activeWindowExpiration === undefined) {
      const data = await this.getData();
      this.activeWindowExpiration = (data.creationTimestamp.toNumber() as number) + data.activeWindow;
    }

    return this.activeWindowExpiration;
  }

  async respond({
    bid = null,
    ask = null,
    expirationTimestamp = null,
  }: {
    bid?: Quote | null;
    ask?: Quote | null;
    expirationTimestamp?: BN | null;
  } = {}) {
    if (bid === null && ask === null) {
      bid = Quote.getStandard(DEFAULT_PRICE, DEFAULT_LEG_MULTIPLIER);
    }
    if (expirationTimestamp === null) {
      expirationTimestamp = await this.getActiveWindowExpiration();
    }

    const response = await getResponsePda(
      this.account,
      this.context.maker.publicKey,
      this.context.program.programId,
      serializeOptionQuote(bid, this.context.program),
      serializeOptionQuote(ask, this.context.program),
      0
    );

    const additionalData =
      this.content.type === "instrument" ? Buffer.from([]) : this.content.provider.getResponseData();

    const responseValidateAccounts =
      this.content.type === "instrument" ? [] : this.content.provider.getValidateResponseAccounts();
    const riskEngineAccounts = await this.getRiskEngineAccounts();
    const rfqData = await this.getData();
    const defaultPubkey = PublicKey.default;
    let whitelistToPass = rfqData.whitelist.toBase58() !== defaultPubkey.toBase58() ? rfqData.whitelist : null;
    await this.context.program.methods
      .respondToRfq(bid as any, ask as any, 0, new BN(expirationTimestamp), additionalData)
      .accounts({
        maker: this.context.maker.publicKey,
        protocol: this.context.protocolPda,
        rfq: this.account,
        response,
        whitelist: whitelistToPass,
        collateralInfo: getCollateralInfoPda(this.context.maker.publicKey, this.context.program.programId),
        collateralToken: getCollateralTokenPda(this.context.maker.publicKey, this.context.program.programId),
        riskEngine: this.context.riskEngineProgram.programId,
        systemProgram: SystemProgram.programId,
      })
      .remainingAccounts([...responseValidateAccounts, ...riskEngineAccounts])
      .signers([this.context.maker])
      .preInstructions([expandComputeUnits])
      .rpc();

    return new Response(this.context, this, this.context.maker, response);
  }

  async cleanUp({ taker = this.context.taker.publicKey }: { taker?: PublicKey } = {}) {
    const whitelist = this?.whitelist
      ? this.whitelist.toBase58() !== PublicKey.default.toBase58()
        ? this.whitelist
        : null
      : null;
    await this.context.program.methods
      .cleanUpRfq()
      .accounts({
        taker,
        protocol: this.context.protocolPda,
        rfq: this.account,
        whitelist,
      })
      .rpc();
  }

  async cancel() {
    await this.context.program.methods
      .cancelRfq()
      .accounts({
        taker: this.context.taker.publicKey,
        protocol: this.context.protocolPda,
        rfq: this.account,
      })
      .signers([this.context.taker])
      .rpc();
  }

  async addLegs(legs: InstrumentController[], finalize = true) {
    if (this.content.type != "instrument") {
      throw Error("Not settled by instruments!");
    }
    this.content.legs = this.content.legs.concat(legs);

    const legData = legs.map((x) => x.toLegData());

    const baseAssetIndexes = legs.map((leg) => leg.getBaseAssetIndex());
    const baseAssetAccounts = baseAssetIndexes.map((index) => toBaseAssetAccount(index, this.context.program));
    const legAccounts = await (await Promise.all(legs.map(async (x) => await x.getValidationAccounts()))).flat();

    let txConstructor = this.context.program.methods
      .addLegsToRfq(legData)
      .accounts({
        taker: this.context.taker.publicKey,
        protocol: this.context.protocolPda,
        rfq: this.account,
      })
      .remainingAccounts([...baseAssetAccounts, ...legAccounts])
      .preInstructions([expandComputeUnits])
      .signers([this.context.taker]);

    if (finalize) {
      txConstructor = txConstructor.postInstructions([await this.getFinalizeConstructionInstruction()]);
    }

    await txConstructor.rpc();
  }

  async validatePrintTradeRfq() {
    let tx = new Transaction();
    let ix = await this.getValidateByPrintTradeProviderInstruction();
    tx.add(ix);
    await this.context.provider.sendAndConfirm(tx, [this.context.taker]);
  }

  async finalizeRfq() {
    let tx = new Transaction();
    let ix = await this.getFinalizeConstructionInstruction();
    tx.add(ix);
    await this.context.provider.sendAndConfirm(tx, [this.context.taker]);
  }

  getFinalizeConstructionInstruction() {
    return this.context.program.methods
      .finalizeRfqConstruction()
      .accounts({
        taker: this.context.taker.publicKey,
        protocol: this.context.protocolPda,
        rfq: this.account,
        collateralInfo: getCollateralInfoPda(this.context.taker.publicKey, this.context.program.programId),
        collateralToken: getCollateralTokenPda(this.context.taker.publicKey, this.context.program.programId),
        riskEngine: this.context.riskEngineProgram.programId,
      })
      .remainingAccounts(this.getRiskEngineAccounts())
      .instruction();
  }

  getValidateByPrintTradeProviderInstruction() {
    if (this.content.type !== "printTradeProvider") {
      throw Error("Is only supported for print trade RFQs!");
    }

    return this.context.program.methods
      .validateRfqByPrintTradeProvider()
      .accounts({
        taker: this.context.taker.publicKey,
        protocol: this.context.protocolPda,
        rfq: this.account,
      })
      .remainingAccounts(this.content.provider.getValidationAccounts())
      .instruction();
  }

  async getData() {
    return await this.context.program.account.rfq.fetch(this.account);
  }

  getRiskEngineAccounts(): AccountMeta[] {
    return [];
  }
}

export class Whitelist {
  public constructor(
    public context: Context,
    public account: PublicKey,
    public creator: PublicKey,
    public whitelist: PublicKey[]
  ) {}

  async cleanUp() {
    await this.context.program.methods
      .cleanUpWhitelist()
      .accounts({
        creator: this.creator,
        whitelistAccount: this.account,
        systemProgram: SystemProgram.programId,
      })
      .signers([this.context.taker])
      .rpc();
  }

  async getData() {
    return await this.context.program.account.whitelist.fetch(this.account);
  }
}
