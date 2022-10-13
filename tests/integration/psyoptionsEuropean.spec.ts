import { BN } from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";
import { sleep, toAbsolutePrice, TokenChangeMeasurer, toLegMultiplier, withTokenDecimals } from "../utilities/helpers";
import { PsyoptionsEuropeanInstrument, EuroOptionsFacade } from "../utilities/instruments/psyoptionsEuropeanInstrument";
import { AuthoritySide, Quote, Side } from "../utilities/types";
import { Context, getContext } from "../utilities/wrappers";
import { CONTRACT_DECIMALS_BN, OptionType } from "../dependencies/tokenized-euros/src";

describe("Psyoptions European instrument integration tests", () => {
  let context: Context;
  let taker: PublicKey;
  let maker: PublicKey;
  let dao: PublicKey;
  let options: EuroOptionsFacade;

  before(async () => {
    context = await getContext();
    taker = context.taker.publicKey;
    maker = context.maker.publicKey;
    dao = context.dao.publicKey;

    options = await EuroOptionsFacade.initalizeNewOptionMeta(context, {
      underlyingMint: context.assetToken,
      stableMint: context.quoteToken,
      underlyingPerContract: withTokenDecimals(1),
    });
  });

  it("Create two-way RFQ with one euro option leg, respond and settle as sell", async () => {
    let tokenMeasurer = await TokenChangeMeasurer.takeSnapshot(
      context,
      ["quote", "asset", options.callMint],
      [taker, maker]
    );

    // create a two way RFQ specifying 1 option call as a leg
    const rfq = await context.createRfq({
      legs: [
        PsyoptionsEuropeanInstrument.create(context, options.callMint, options.metaKey, OptionType.CALL, {
          amount: new BN(1).mul(CONTRACT_DECIMALS_BN),
          side: Side.Bid,
        }),
      ],
    });
    // response with agreeing to sell 2 options for 500$ or buy 5 for 450$
    const response = await rfq.respond({
      bid: Quote.getStandart(toAbsolutePrice(withTokenDecimals(450)), toLegMultiplier(5)),
      ask: Quote.getStandart(toAbsolutePrice(withTokenDecimals(500)), toLegMultiplier(2)),
    });
    // taker confirms to buy 1 option
    await response.confirm({ side: Side.Ask, legMultiplierBps: toLegMultiplier(1) });

    await response.prepareSettlement(AuthoritySide.Taker);

    await options.mintOptions(context.maker, new BN(1), OptionType.CALL);
    await response.prepareSettlement(AuthoritySide.Maker);

    // taker should receive 1 option, maker should receive 500$ and lose 1 bitcoin as option collateral
    await response.settle(maker, [taker]);
    await tokenMeasurer.expectChange([
      { token: options.callMint, user: taker, delta: new BN(1).mul(CONTRACT_DECIMALS_BN) },
      { token: "quote", user: taker, delta: withTokenDecimals(-500) },
      { token: "quote", user: maker, delta: withTokenDecimals(500) },
      { token: "asset", user: maker, delta: withTokenDecimals(-1) },
      { token: options.callMint, user: maker, delta: new BN(0) },
    ]);

    await response.unlockResponseCollateral();
    await response.cleanUp();
  });

  it("Create two-way RFQ with one euro option leg, respond but maker defaults on settlement", async () => {
    // create a two way RFQ specifying 1 option put as a leg
    const rfq = await context.createRfq({
      activeWindow: 2,
      settlingWindow: 1,
      legs: [
        PsyoptionsEuropeanInstrument.create(context, options.putMint, options.metaKey, OptionType.PUT, {
          amount: new BN(1).mul(CONTRACT_DECIMALS_BN),
          side: Side.Bid,
        }),
      ],
    });
    // response with agreeing to buy 5 options for 450$
    const response = await rfq.respond({
      bid: Quote.getStandart(toAbsolutePrice(withTokenDecimals(450)), toLegMultiplier(5)),
    });
    // taker confirms to sell 2 options
    await response.confirm({ side: Side.Bid, legMultiplierBps: toLegMultiplier(2) });

    await options.mintOptions(context.taker, new BN(2), OptionType.PUT);

    let tokenMeasurer = await TokenChangeMeasurer.takeSnapshot(context, [options.putMint], [taker]);
    await response.prepareSettlement(AuthoritySide.Taker);
    await sleep(3000);

    await response.revertSettlementPreparation(AuthoritySide.Taker);

    // taker have returned his assets
    await tokenMeasurer.expectChange([{ token: options.putMint, user: taker, delta: new BN(0) }]);

    await response.settleOnePartyDefault();
    await response.cleanUp();
    await rfq.cleanUp();
  });
});