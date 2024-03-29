import { PublicKey } from "@solana/web3.js";
import {
  TokenChangeMeasurer,
  attachImprovedLogDisplay,
  runInParallelWithWait,
  sleep,
  toAbsolutePrice,
  toLegMultiplier,
  withTokenDecimals,
  withoutSpotQuoteFees,
} from "../utilities/helpers";
import { Context, getContext } from "../utilities/wrappers";
import { AuthoritySide, OrderType, Quote } from "../utilities/types";

describe("Vault operator", () => {
  let context: Context;
  let taker: PublicKey;
  let maker: PublicKey;

  beforeEach(function () {
    attachImprovedLogDisplay(this, context);
  });

  before(async () => {
    context = await getContext();
    taker = context.taker.publicKey;
    maker = context.maker.publicKey;
  });

  it("Create a sell vault operator, active window ends and tokens are withdrawn", async () => {
    let tokenMeasurer = await TokenChangeMeasurer.takeDefaultSnapshot(context);

    const vault = await context.createVaultOperatorRfq({
      orderType: OrderType.Sell,
      size: toLegMultiplier(2),
      acceptableLimitPrice: 48_000,
      activeWindow: 1,
    });

    await sleep(1.5);
    await vault.withdrawTokens();

    await tokenMeasurer.expectChange([
      { token: "asset", user: taker, delta: withTokenDecimals(0) },
      { token: "asset", user: maker, delta: withTokenDecimals(0) },
      { token: "quote", user: taker, delta: withTokenDecimals(0) },
      { token: "quote", user: maker, delta: withTokenDecimals(0) },
    ]);
  });

  it("Create and settle a sell vault operator", async () => {
    let tokenMeasurer = await TokenChangeMeasurer.takeDefaultSnapshot(context);

    const vault = await context.createVaultOperatorRfq({
      orderType: OrderType.Sell,
      size: toLegMultiplier(2),
      acceptableLimitPrice: 48_000,
    });

    const response = await vault.rfq.respond({ bid: Quote.getFixedSize(toAbsolutePrice(withTokenDecimals(48_000))) });
    await vault.confirmResponse(response);

    await vault.prepareToSettle();
    await response.prepareEscrowSettlement(AuthoritySide.Maker);
    await response.settleEscrow(vault.operator, [maker]);

    await response.cleanUp();
    await vault.withdrawTokens();

    await tokenMeasurer.expectChange([
      { token: "asset", user: taker, delta: withTokenDecimals(-2) },
      { token: "asset", user: maker, delta: withTokenDecimals(2) },
      { token: "quote", user: taker, delta: withoutSpotQuoteFees(withTokenDecimals(48_000 * 2)) },
      { token: "quote", user: maker, delta: withTokenDecimals(-48_000 * 2) },
    ]);
  });

  it("Create and settle a buy vault operator", async () => {
    let tokenMeasurer = await TokenChangeMeasurer.takeDefaultSnapshot(context);

    const vault = await context.createVaultOperatorRfq({
      orderType: OrderType.Buy,
      size: withTokenDecimals(50_000),
      acceptableLimitPrice: 40_000,
    });

    const response = await vault.rfq.respond({ ask: Quote.getFixedSize(toAbsolutePrice(withTokenDecimals(40_000))) });
    await vault.confirmResponse(response);

    await response.prepareEscrowSettlement(AuthoritySide.Maker);
    await vault.prepareToSettle();
    await response.settleEscrow(maker, [vault.operator]);

    await response.cleanUp();
    await vault.withdrawTokens();

    await tokenMeasurer.expectChange([
      { token: "asset", user: taker, delta: withTokenDecimals(1.25) },
      { token: "asset", user: maker, delta: withTokenDecimals(-1.25) },
      { token: "quote", user: taker, delta: withTokenDecimals(-50_000) },
      { token: "quote", user: maker, delta: withoutSpotQuoteFees(withTokenDecimals(50_000)) },
    ]);
  });

  it("Create a buy vault but maker defaults", async () => {
    let tokenMeasurer = await TokenChangeMeasurer.takeDefaultSnapshot(context);

    const vault = await context.createVaultOperatorRfq({
      orderType: OrderType.Buy,
      size: withTokenDecimals(50_000),
      acceptableLimitPrice: 42_000,
      activeWindow: 2,
      settlingWindow: 1,
    });

    const response = await runInParallelWithWait(async () => {
      const response = await vault.rfq.respond({ ask: Quote.getFixedSize(toAbsolutePrice(withTokenDecimals(40_000))) });
      await vault.confirmResponse(response);

      await vault.prepareToSettle();
      return response;
    }, 3.5);

    await response.revertEscrowSettlementPreparation({ operator: vault.operator });
    await response.cleanUp();
    await vault.withdrawTokens();
    await vault.rfq.cleanUp({ taker: vault.operator });

    await tokenMeasurer.expectChange([
      { token: "asset", user: taker, delta: withTokenDecimals(0) },
      { token: "asset", user: maker, delta: withTokenDecimals(0) },
      { token: "quote", user: taker, delta: withTokenDecimals(0) },
      { token: "quote", user: maker, delta: withTokenDecimals(0) },
    ]);
  });

  it("Create a sell vault but vault defaults", async () => {
    let tokenMeasurer = await TokenChangeMeasurer.takeDefaultSnapshot(context);

    const vault = await context.createVaultOperatorRfq({
      orderType: OrderType.Sell,
      size: toLegMultiplier(2),
      acceptableLimitPrice: 46_000,
      activeWindow: 2,
      settlingWindow: 1,
    });

    const response = await runInParallelWithWait(async () => {
      const response = await vault.rfq.respond({ bid: Quote.getFixedSize(toAbsolutePrice(withTokenDecimals(48_000))) });
      await vault.confirmResponse(response);

      await response.prepareEscrowSettlement(AuthoritySide.Maker);
      return response;
    }, 3.5);

    await response.revertEscrowSettlementPreparation(AuthoritySide.Maker);
    await response.cleanUp();
    await vault.withdrawTokens();
    await vault.rfq.cleanUp({ taker: vault.operator });

    await tokenMeasurer.expectChange([
      { token: "asset", user: taker, delta: withTokenDecimals(0) },
      { token: "asset", user: maker, delta: withTokenDecimals(0) },
      { token: "quote", user: taker, delta: withTokenDecimals(0) },
      { token: "quote", user: maker, delta: withTokenDecimals(0) },
    ]);
  });

  it("Create a buy vault but both parties default", async () => {
    let tokenMeasurer = await TokenChangeMeasurer.takeDefaultSnapshot(context);

    const vault = await context.createVaultOperatorRfq({
      orderType: OrderType.Buy,
      size: withTokenDecimals(50_000),
      acceptableLimitPrice: 42_000,
      activeWindow: 2,
      settlingWindow: 1,
    });

    const response = await runInParallelWithWait(async () => {
      const response = await vault.rfq.respond({ ask: Quote.getFixedSize(toAbsolutePrice(withTokenDecimals(40_000))) });
      await vault.confirmResponse(response);
      return response;
    }, 3.5);

    await response.cleanUp();
    await vault.withdrawTokens();
    await vault.rfq.cleanUp({ taker: vault.operator });

    await tokenMeasurer.expectChange([
      { token: "asset", user: taker, delta: withTokenDecimals(0) },
      { token: "asset", user: maker, delta: withTokenDecimals(0) },
      { token: "quote", user: taker, delta: withTokenDecimals(0) },
      { token: "quote", user: maker, delta: withTokenDecimals(0) },
    ]);
  });
});
