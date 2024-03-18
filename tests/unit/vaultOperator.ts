import {
  attachImprovedLogDisplay,
  expectError,
  toAbsolutePrice,
  toLegMultiplier,
  withTokenDecimals,
} from "../utilities/helpers";
import { Context, getContext } from "../utilities/wrappers";
import { AuthoritySide, FixedSize, OrderType, Quote } from "../utilities/types";

describe("Vault operator", () => {
  let context: Context;

  beforeEach(function () {
    attachImprovedLogDisplay(this, context);
  });

  before(async () => {
    context = await getContext();
  });

  it("Can't create a two-way vault", async () => {
    await expectError(
      context.createVaultOperatorRfq({
        orderType: OrderType.TwoWay,
        fixedSize: FixedSize.getBaseAsset(toLegMultiplier(2)),
        acceptableLimitPrice: 46_000,
      }),
      "UnsupportedRfqType"
    );
  });

  it("Can't confirm two responses", async () => {
    const vault = await context.createVaultOperatorRfq({
      orderType: OrderType.Sell,
      fixedSize: FixedSize.getBaseAsset(toLegMultiplier(2)),
      acceptableLimitPrice: 46_000,
    });

    const firstResponse = await vault.rfq.respond({
      bid: Quote.getFixedSize(toAbsolutePrice(withTokenDecimals(48_000))),
    });
    const secondResponse = await vault.rfq.respond({
      bid: Quote.getFixedSize(toAbsolutePrice(withTokenDecimals(50_000))),
    });

    await vault.confirmResponse(firstResponse);
    await expectError(vault.confirmResponse(secondResponse), "AlreadyConfirmed");
  });

  it("Can't accept worse sell price", async () => {
    const vault = await context.createVaultOperatorRfq({
      orderType: OrderType.Sell,
      fixedSize: FixedSize.getBaseAsset(withTokenDecimals(2)),
      acceptableLimitPrice: 40_000,
    });

    const response = await vault.rfq.respond({ bid: Quote.getFixedSize(toAbsolutePrice(withTokenDecimals(39_999))) });
    await expectError(vault.confirmResponse(response), "PriceWorseThanLimit");
  });

  it("Can't accept worse buy price", async () => {
    const vault = await context.createVaultOperatorRfq({
      orderType: OrderType.Buy,
      fixedSize: FixedSize.getQuoteAsset(withTokenDecimals(50_000)),
      acceptableLimitPrice: 40_000,
    });

    const response = await vault.rfq.respond({ ask: Quote.getFixedSize(toAbsolutePrice(withTokenDecimals(40_001))) });
    await expectError(vault.confirmResponse(response), "PriceWorseThanLimit");
  });

  it("Can't withdraw to a different user", async () => {
    const vault = await context.createVaultOperatorRfq({
      orderType: OrderType.Buy,
      fixedSize: FixedSize.getQuoteAsset(withTokenDecimals(50_000)),
      acceptableLimitPrice: 40_000,
    });

    const response = await vault.rfq.respond({ ask: Quote.getFixedSize(toAbsolutePrice(withTokenDecimals(40_001))) });
    await expectError(vault.confirmResponse(response), "PriceWorseThanLimit");
  });

  it("Can't withdraw to a different address", async () => {
    const vault = await context.createVaultOperatorRfq({
      orderType: OrderType.Sell,
      fixedSize: FixedSize.getBaseAsset(toLegMultiplier(2)),
      acceptableLimitPrice: 48_000,
    });

    const response = await vault.rfq.respond({ bid: Quote.getFixedSize(toAbsolutePrice(withTokenDecimals(48_000))) });
    await vault.confirmResponse(response);

    await vault.prepareToSettle();
    await response.prepareEscrowSettlement(AuthoritySide.Maker);
    await response.settleEscrow(vault.operator, [context.maker.publicKey]);

    await response.cleanUp();
    await expectError(vault.withdrawTokens({ withdrawTo: context.dao.publicKey }), "WrongCreatorAddress");
  });
});