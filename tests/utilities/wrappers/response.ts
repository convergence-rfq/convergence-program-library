import { BN } from "@coral-xyz/anchor";
import { PublicKey, Keypair, AccountMeta } from "@solana/web3.js";
import { getCollateralInfoPda, getCollateralTokenPda } from "../pdas";
import { AuthoritySide, QuoteSide } from "../types";
import { expandComputeUnits } from "../helpers";
import { SettlementOutcome } from "../printTradeProviders/hxroPrintTradeProvider";
import { Context } from "./context";
import { Rfq } from "./rfq";

export class Response {
  //storing single here assumes all legs are prepared by the same single side
  public firstToPrepare: PublicKey | null;

  constructor(public context: Context, public rfq: Rfq, public maker: Keypair, public account: PublicKey) {
    this.firstToPrepare = null;
  }

  async confirm({
    side = QuoteSide.Bid,
    legMultiplierBps = null,
  }: {
    side?: QuoteSide;
    legMultiplierBps?: BN | null;
  } = {}) {
    await this.context.program.methods
      .confirmResponse(side, legMultiplierBps)
      .accounts({
        taker: this.context.taker.publicKey,
        protocol: this.context.protocolPda,
        rfq: this.rfq.account,
        response: this.account,
        collateralInfo: await getCollateralInfoPda(this.context.taker.publicKey, this.context.program.programId),
        makerCollateralInfo: await getCollateralInfoPda(this.context.maker.publicKey, this.context.program.programId),
        collateralToken: await getCollateralTokenPda(this.context.taker.publicKey, this.context.program.programId),
        riskEngine: this.context.riskEngineProgram.programId,
      })
      .remainingAccounts(await this.rfq.getRiskEngineAccounts())
      .preInstructions([expandComputeUnits])
      .signers([this.context.taker])
      .rpc();
  }

  async prepareEscrowSettlement(side: AuthoritySide, legAmount?: number) {
    if (this.rfq.content.type != "instrument") {
      throw Error("Not settled by instruments!");
    }

    const { legs, quote } = this.rfq.content;
    legAmount = legAmount || legs.length;
    const caller = side == AuthoritySide.Taker ? this.context.taker : this.context.maker;

    if (this.firstToPrepare === null) {
      this.firstToPrepare = caller.publicKey;
    }
    const quoteAccounts = await quote.getPrepareSettlementAccounts(side, "quote", this.rfq, this);
    const legAccounts = await (
      await Promise.all(
        legs
          .slice(0, legAmount)
          .map(async (x, index) => await x.getPrepareSettlementAccounts(side, { legIndex: index }, this.rfq, this))
      )
    ).flat();

    await this.context.program.methods
      .prepareEscrowSettlement(side, legAmount)
      .accounts({
        caller: caller.publicKey,
        protocol: this.context.protocolPda,
        rfq: this.rfq.account,
        response: this.account,
      })
      .signers([caller])
      .remainingAccounts([...quoteAccounts, ...legAccounts])
      .preInstructions([expandComputeUnits])
      .rpc();
  }

  async preparePrintTradeSettlement(
    side: AuthoritySide,
    expectedSettlement: SettlementOutcome,
    { skipPreStep = false } = {}
  ) {
    if (this.rfq.content.type != "printTradeProvider") {
      throw Error("Not settled by print trade provider!");
    }

    if (!skipPreStep) {
      await this.rfq.content.provider.executePrePreparePrintTradeSettlement(side, this.rfq, this, expectedSettlement);
    }

    const caller = side == AuthoritySide.Taker ? this.context.taker : this.context.maker;
    const accounts = this.rfq.content.provider.getPreparePrintTradeSettlementAccounts(side, this.rfq, this);

    if (this.firstToPrepare === null) {
      this.firstToPrepare = caller.publicKey;
    }

    await this.context.program.methods
      .preparePrintTradeSettlement(side)
      .accounts({
        caller: caller.publicKey,
        protocol: this.context.protocolPda,
        rfq: this.rfq.account,
        response: this.account,
      })
      .signers([caller])
      .remainingAccounts(accounts)
      .preInstructions([expandComputeUnits])
      .rpc();
  }

  async prepareMoreEscrowLegsSettlement(side: AuthoritySide, from: number, legAmount: number) {
    if (this.rfq.content.type != "instrument") {
      throw Error("Not settled by instruments!");
    }

    const { legs } = this.rfq.content;
    const caller = side == AuthoritySide.Taker ? this.context.taker : this.context.maker;
    const remainingAccounts = await (
      await Promise.all(
        legs
          .slice(from, from + legAmount)
          .map(
            async (x, index) => await x.getPrepareSettlementAccounts(side, { legIndex: from + index }, this.rfq, this)
          )
      )
    ).flat();

    await this.context.program.methods
      .prepareMoreEscrowLegsSettlement(side, legAmount)
      .accounts({
        caller: caller.publicKey,
        protocol: this.context.protocolPda,
        rfq: this.rfq.account,
        response: this.account,
      })
      .signers([caller])
      .remainingAccounts(remainingAccounts)
      .preInstructions([expandComputeUnits])
      .rpc();
  }

  async settleEscrow(quoteReceiver: PublicKey, assetReceivers: PublicKey[], alreadySettledLegs = 0) {
    if (this.rfq.content.type != "instrument") {
      throw Error("Not settled by instruments!");
    }

    const { legs, quote } = this.rfq.content;
    const quoteAccounts = await quote.getSettleAccounts(quoteReceiver, "quote", this.rfq, this);
    const legAccounts = await (
      await Promise.all(
        legs
          .slice(alreadySettledLegs)
          .map(
            async (x, index) =>
              await x.getSettleAccounts(assetReceivers[index], { legIndex: alreadySettledLegs + index }, this.rfq, this)
          )
      )
    ).flat();

    await this.context.program.methods
      .settleEscrow()
      .accounts({
        protocol: this.context.protocolPda,
        rfq: this.rfq.account,
        response: this.account,
      })
      .remainingAccounts([...legAccounts, ...quoteAccounts])
      .preInstructions([expandComputeUnits])
      .rpc();
  }

  async settlePrintTrade() {
    if (this.rfq.content.type != "printTradeProvider") {
      throw Error("Not settled by print trade provider!");
    }

    const accounts = this.rfq.content.provider.getExecutePrintTradeSettlementAccounts(this.rfq, this);

    await this.context.program.methods
      .settlePrintTrade()
      .accounts({
        protocol: this.context.protocolPda,
        rfq: this.rfq.account,
        response: this.account,
      })
      .remainingAccounts(accounts)
      .preInstructions([expandComputeUnits])
      .rpc();
  }

  async expireSettlement({ accountOverrides = {} }: { accountOverrides?: { [id: string]: PublicKey } } = {}) {
    await this.context.program.methods
      .expireSettlement()
      .accounts({
        protocol: this.context.protocolPda,
        rfq: this.rfq.account,
        response: this.account,
        ...accountOverrides,
      })
      .rpc();
  }

  async partiallySettleEscrowLegs(assetReceivers: PublicKey[], legsToSettle: number, alreadySettledLegs = 0) {
    if (this.rfq.content.type != "instrument") {
      throw Error("Not settled by instruments!");
    }

    const remainingAccounts = await (
      await Promise.all(
        this.rfq.content.legs
          .slice(alreadySettledLegs, alreadySettledLegs + legsToSettle)
          .map(
            async (x, index) =>
              await x.getSettleAccounts(assetReceivers[index], { legIndex: alreadySettledLegs + index }, this.rfq, this)
          )
      )
    ).flat();

    await this.context.program.methods
      .partiallySettleEscrowLegs(legsToSettle)
      .accounts({
        protocol: this.context.protocolPda,
        rfq: this.rfq.account,
        response: this.account,
      })
      .remainingAccounts(remainingAccounts)
      .preInstructions([expandComputeUnits])
      .rpc();
  }

  async revertEscrowSettlementPreparation(
    side: { taker: {} } | { maker: {} } | { operator: PublicKey },
    preparedLegs?: number
  ) {
    if (this.rfq.content.type != "instrument") {
      throw Error("Not settled by instruments!");
    }

    const { legs, quote } = this.rfq.content;
    preparedLegs = preparedLegs || legs.length;
    const quoteAccounts = await quote.getRevertSettlementPreparationAccounts(side, "quote", this.rfq, this);
    const legAccounts = await (
      await Promise.all(
        legs
          .slice(0, preparedLegs)
          .map(
            async (x, index) =>
              await x.getRevertSettlementPreparationAccounts(side, { legIndex: index }, this.rfq, this)
          )
      )
    ).flat();
    const remainingAccounts = [...legAccounts, ...quoteAccounts];
    const programSide = "operator" in side ? AuthoritySide.Taker : side;

    await this.context.program.methods
      .revertEscrowSettlementPreparation(programSide)
      .accounts({
        protocol: this.context.protocolPda,
        rfq: this.rfq.account,
        response: this.account,
      })
      .remainingAccounts(remainingAccounts)
      .preInstructions([expandComputeUnits])
      .rpc();
  }

  async revertPrintTradeSettlementPreparation(side: { taker: {} } | { maker: {} }) {
    if (this.rfq.content.type != "printTradeProvider") {
      throw Error("Not settled by print trade!");
    }

    const remainingAccounts = this.rfq.content.provider.getRevertPrintTradeSettlementPreparationAccounts(
      this.rfq,
      this,
      side
    );

    await this.context.program.methods
      .revertPrintTradeSettlementPreparationPreparation(side)
      .accounts({
        protocol: this.context.protocolPda,
        rfq: this.rfq.account,
        response: this.account,
      })
      .remainingAccounts(remainingAccounts)
      .preInstructions([expandComputeUnits])
      .rpc();
  }

  async partlyRevertEscrowSettlementPreparation(
    side: { taker: {} } | { maker: {} },
    legAmount: number,
    preparedLegs?: number
  ) {
    if (this.rfq.content.type != "instrument") {
      throw Error("Not settled by instruments!");
    }

    const { legs } = this.rfq.content;
    const _preparedLegs = preparedLegs || legs.length;

    const remainingAccounts = await (
      await Promise.all(
        legs
          .slice(_preparedLegs - legAmount, preparedLegs)
          .map(
            async (x, index) =>
              await x.getRevertSettlementPreparationAccounts(
                side,
                { legIndex: _preparedLegs - legAmount + index },
                this.rfq,
                this
              )
          )
      )
    ).flat();

    await this.context.program.methods
      .partlyRevertEscrowSettlementPreparation(side, legAmount)
      .accounts({
        protocol: this.context.protocolPda,
        rfq: this.rfq.account,
        response: this.account,
      })
      .remainingAccounts(remainingAccounts)
      .preInstructions([expandComputeUnits])
      .rpc();
  }

  async cleanUp(preparedLegs?: number) {
    let remainingAccounts: AccountMeta[] = [];
    if (this.firstToPrepare) {
      const content = this.rfq.content;
      if (content.type === "instrument") {
        const { legs, quote } = content;
        preparedLegs = preparedLegs || legs.length;
        const quoteAccounts = await quote.getCleanUpAccounts("quote", this.rfq, this);
        const legAccounts = await (
          await Promise.all(
            legs
              .slice(0, preparedLegs)
              .map(async (x, index) => await x.getCleanUpAccounts({ legIndex: index }, this.rfq, this))
          )
        ).flat();

        remainingAccounts = [...legAccounts, ...quoteAccounts];
      } else {
        remainingAccounts = content.provider.getCleanUpPrintTradeSettlementAccounts(this.rfq, this);
      }
    }

    await this.context.program.methods
      .cleanUpResponse()
      .accounts({
        maker: this.context.maker.publicKey,
        protocol: this.context.protocolPda,
        rfq: this.rfq.account,
        response: this.account,
      })
      .remainingAccounts(remainingAccounts)
      .preInstructions([expandComputeUnits])
      .rpc();
  }

  async cleanUpEscrowLegs(legAmount: number, preparedLegs?: number) {
    if (this.rfq.content.type != "instrument") {
      throw Error("Not settled by instruments!");
    }

    const { legs } = this.rfq.content;
    const _preparedLegs = preparedLegs || legs.length;

    let remainingAccounts: AccountMeta[] = [];
    if (this.firstToPrepare) {
      remainingAccounts = await (
        await Promise.all(
          legs
            .slice(_preparedLegs - legAmount, preparedLegs)
            .map(
              async (x, index) =>
                await x.getCleanUpAccounts({ legIndex: _preparedLegs - legAmount + index }, this.rfq, this)
            )
        )
      ).flat();
    }

    await this.context.program.methods
      .cleanUpResponseEscrowLegs(legAmount)
      .accounts({
        protocol: this.context.protocolPda,
        rfq: this.rfq.account,
        response: this.account,
      })
      .remainingAccounts(remainingAccounts)
      .preInstructions([expandComputeUnits])
      .rpc();
  }

  async cancel() {
    await this.context.program.methods
      .cancelResponse()
      .accounts({
        maker: this.context.maker.publicKey,
        protocol: this.context.protocolPda,
        rfq: this.rfq.account,
        response: this.account,
      })
      .signers([this.context.maker])
      .rpc();
  }

  async getData() {
    return await this.context.program.account.response.fetch(this.account);
  }
}
