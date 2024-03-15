import { PublicKey } from "@solana/web3.js";
import { attachImprovedLogDisplay, toAbsolutePrice, toLegMultiplier, withTokenDecimals } from "../utilities/helpers";
import { Context, getContext } from "../utilities/wrappers";
import { AuthoritySide, FixedSize, OrderType, Quote } from "../utilities/types";

describe("RFQ escrow settlement using spot integration tests", () => {
  let context: Context;
  let taker: PublicKey;
  let maker: PublicKey;
  let dao: PublicKey;

  beforeEach(function () {
    attachImprovedLogDisplay(this, context);
  });

  before(async () => {
    context = await getContext();
    taker = context.taker.publicKey;
    maker = context.maker.publicKey;
    dao = context.dao.publicKey;
  });

  it.only("Create a sell vault operator", async () => {
    const vault = await context.createVaultOperatorRfq({
      orderType: OrderType.Sell,
      fixedSize: FixedSize.getBaseAsset(toLegMultiplier(2)),
      acceptableLimitPrice: 46_000,
    });

    const response = await vault.rfq.respond({ bid: Quote.getFixedSize(toAbsolutePrice(withTokenDecimals(48_000))) });
    await vault.confirmResponse(response);

    await vault.prepareToSettle();
    await response.prepareEscrowSettlement(AuthoritySide.Maker);
    await response.settleEscrow(vault.operator, [maker]);

    await response.cleanUp();
    await vault.rfq.cleanUp({ taker: vault.operator });
  });

  it.only("Create a buy vault operator", async () => {
    const vault = await context.createVaultOperatorRfq({
      orderType: OrderType.Buy,
      fixedSize: FixedSize.getQuoteAsset(withTokenDecimals(50_000)),
      acceptableLimitPrice: 42_000,
    });

    const response = await vault.rfq.respond({ ask: Quote.getFixedSize(toAbsolutePrice(withTokenDecimals(40_000))) });
    await vault.confirmResponse(response);

    await response.prepareEscrowSettlement(AuthoritySide.Maker);
    await vault.prepareToSettle();
    await response.settleEscrow(maker, [vault.operator]);

    await response.cleanUp();
    await vault.rfq.cleanUp({ taker: vault.operator });
  });
});
