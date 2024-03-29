import { BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { OptionType } from "@mithraic-labs/tokenized-euros";
import { SOLANA_BASE_ASSET_INDEX } from "../utilities/constants";
import {
  attachImprovedLogDisplay,
  toAbsolutePrice,
  TokenChangeMeasurer,
  toLegMultiplier,
  withTokenDecimals,
} from "../utilities/helpers";
import { EuroOptionsFacade, PsyoptionsEuropeanInstrument } from "../utilities/instruments/psyoptionsEuropeanInstrument";
import { SpotInstrument } from "../utilities/instruments/spotInstrument";
import { FixedSize, LegSide, OrderType, Quote, QuoteSide } from "../utilities/types";
import { Context, getContext } from "../utilities/wrappers";
import {
  HxroContext,
  HxroPrintTradeProvider,
  getHxroContext,
} from "../utilities/printTradeProviders/hxroPrintTradeProvider";

describe("Required collateral calculation and lock", () => {
  let context: Context;
  let hxroContext: HxroContext;
  let taker: PublicKey;
  let maker: PublicKey;

  beforeEach(function () {
    attachImprovedLogDisplay(this, context);
  });

  before(async () => {
    context = await getContext();
    hxroContext = await getHxroContext(context);
    taker = context.taker.publicKey;
    maker = context.maker.publicKey;
  });

  it("Correct collateral locked for variable size rfq creation", async () => {
    let measurer = await TokenChangeMeasurer.takeSnapshot(context, ["unlockedCollateral"], [taker]);

    await context.createEscrowRfq({ fixedSize: FixedSize.None });

    await measurer.expectChange([{ token: "unlockedCollateral", user: taker, delta: new BN(0) }]);
  });

  it("Correct collateral locked for fixed quote asset size rfq creation", async () => {
    let measurer = await TokenChangeMeasurer.takeSnapshot(context, ["unlockedCollateral"], [taker]);

    await context.createEscrowRfq({ fixedSize: FixedSize.getQuoteAsset(withTokenDecimals(5)) });

    await measurer.expectChange([{ token: "unlockedCollateral", user: taker, delta: new BN(0) }]);
  });

  it("Correct collateral locked for fixed leg structure size spot rfq creation", async () => {
    let measurer = await TokenChangeMeasurer.takeSnapshot(context, ["unlockedCollateral"], [taker]);

    // 1 bitcoin with price of 20k$
    await context.createEscrowRfq({
      orderType: OrderType.TwoWay,
      legs: [
        SpotInstrument.createForLeg(context, {
          mint: context.btcToken,
          amount: withTokenDecimals(1),
          side: LegSide.Long,
        }),
      ],
      fixedSize: FixedSize.getBaseAsset(toLegMultiplier(1)),
    });

    await measurer.expectChange([{ token: "unlockedCollateral", user: taker, delta: withTokenDecimals(0) }]);
  });

  it("Correct collateral locked for fix base asset rfq creation with different oracle types", async () => {
    let measurer = await TokenChangeMeasurer.takeSnapshot(context, ["unlockedCollateral"], [taker]);

    // 1 bitcoin + 10 sol + 2 eth
    const rfq = await context.createEscrowRfq({
      orderType: OrderType.TwoWay,
      legs: [
        SpotInstrument.createForLeg(context, {
          mint: context.btcToken,
          amount: withTokenDecimals(1),
          side: LegSide.Long,
        }), // 660 USDC collateral
        SpotInstrument.createForLeg(context, {
          mint: context.solToken,
          amount: withTokenDecimals(10),
          side: LegSide.Long,
        }), // 23.1 USDC collateral
        SpotInstrument.createForLeg(context, {
          mint: context.ethToken,
          amount: withTokenDecimals(2),
          side: LegSide.Long,
        }), // 220 USDC collateral
      ],
      fixedSize: FixedSize.getBaseAsset(toLegMultiplier(1)),
      finalize: false,
    });
    await rfq.finalizeRfq();

    await measurer.expectChange([{ token: "unlockedCollateral", user: taker, delta: withTokenDecimals(0) }]);
  });

  it("Correct collateral locked for responding to spot rfq", async () => {
    // solana rfq with 20 tokens in the leg
    const rfq = await context.createEscrowRfq({
      orderType: OrderType.TwoWay,
      legs: [
        SpotInstrument.createForLeg(context, {
          mint: context.solToken,
          amount: withTokenDecimals(20),
          side: LegSide.Long,
        }),
      ],
      fixedSize: FixedSize.None,
    });

    let measurer = await TokenChangeMeasurer.takeSnapshot(context, ["unlockedCollateral"], [maker]);
    // respond with leg multiplier of 2
    await rfq.respond({ bid: Quote.getStandard(toAbsolutePrice(new BN(20)), toLegMultiplier(2)) });
    await measurer.expectChange([{ token: "unlockedCollateral", user: maker, delta: withTokenDecimals(0) }]);
  });

  it("Correct additional collateral locked for taker and unlocked for maker on lower confirmation", async () => {
    // bitcoin leg with the size of 1, solana leg with the size of 200
    const rfq = await context.createEscrowRfq({
      orderType: OrderType.TwoWay,
      legs: [
        SpotInstrument.createForLeg(context, {
          mint: context.btcToken,
          amount: withTokenDecimals(1),
          side: LegSide.Long,
        }),
        SpotInstrument.createForLeg(context, {
          mint: context.solToken,
          amount: withTokenDecimals(200),
          side: LegSide.Short,
        }),
      ],
      fixedSize: FixedSize.None,
    });

    // respond with leg multiplier of 2
    const response = await rfq.respond({ bid: Quote.getStandard(toAbsolutePrice(new BN(20)), toLegMultiplier(2)) });

    let measurer = await TokenChangeMeasurer.takeSnapshot(context, ["unlockedCollateral"], [taker, maker]);
    // confirm multiplier leg multiplier of 1
    await response.confirm({ side: QuoteSide.Bid, legMultiplierBps: toLegMultiplier(1) });
    await measurer.expectChange([
      {
        token: "unlockedCollateral",
        user: taker,
        delta: withTokenDecimals(0),
      },
      { token: "unlockedCollateral", user: maker, delta: withTokenDecimals(0) },
    ]);
  });

  it("Correct collateral locked for option rfq", async () => {
    const options = await EuroOptionsFacade.initalizeNewOptionMeta(context, {
      underlyingMint: context.btcToken,
      stableMint: context.quoteToken,
      underlyingPerContract: withTokenDecimals(0.1),
      strikePrice: withTokenDecimals(22000),
      expireIn: 90 * 24 * 60 * 60, // 90 days
    });

    let measurer = await TokenChangeMeasurer.takeSnapshot(context, ["unlockedCollateral"], [taker]);
    const rfq = await context.createEscrowRfq({
      legs: [
        PsyoptionsEuropeanInstrument.create(context, options, OptionType.CALL, { amount: 10000, side: LegSide.Long }),
      ], // 1 contract with 4 decimals
      fixedSize: FixedSize.None,
    });
    const response = await rfq.respond({ bid: Quote.getStandard(withTokenDecimals(200), toLegMultiplier(3)) });

    await response.confirm();
    await measurer.expectChange([
      {
        token: "unlockedCollateral",
        user: taker,
        delta: withTokenDecimals(0),
      },
    ]);
  });

  it("Correct collateral locked if all scenarios yield positive pnl", async () => {
    const optionLow = await EuroOptionsFacade.initalizeNewOptionMeta(context, {
      underlyingMint: context.btcToken,
      stableMint: context.quoteToken,
      underlyingPerContract: withTokenDecimals(1),
      strikePrice: withTokenDecimals(18000),
      expireIn: 90 * 24 * 60 * 60, // 90 days
    });
    const optionMedium = await EuroOptionsFacade.initalizeNewOptionMeta(context, {
      underlyingMint: context.btcToken,
      stableMint: context.quoteToken,
      underlyingPerContract: withTokenDecimals(1),
      strikePrice: withTokenDecimals(20000),
      expireIn: 90 * 24 * 60 * 60, // 90 days
    });
    const optionHigh = await EuroOptionsFacade.initalizeNewOptionMeta(context, {
      underlyingMint: context.btcToken,
      stableMint: context.quoteToken,
      underlyingPerContract: withTokenDecimals(1),
      strikePrice: withTokenDecimals(22000),
      expireIn: 90 * 24 * 60 * 60, // 90 days
    });

    let measurer = await TokenChangeMeasurer.takeSnapshot(context, ["unlockedCollateral"], [taker]);
    const legs = [
      PsyoptionsEuropeanInstrument.create(context, optionLow, OptionType.CALL, {
        amount: 10000,
        side: LegSide.Long,
      }),
      PsyoptionsEuropeanInstrument.create(context, optionMedium, OptionType.CALL, {
        amount: 20000,
        side: LegSide.Short,
      }),
      PsyoptionsEuropeanInstrument.create(context, optionHigh, OptionType.CALL, {
        amount: 10000,
        side: LegSide.Long,
      }),
    ];
    const rfq = await context.createEscrowRfq({
      legs: legs.slice(0, 2),
      allLegs: legs,
      fixedSize: FixedSize.getBaseAsset(toLegMultiplier(1)),
      finalize: false,
      orderType: OrderType.Buy,
      settlingWindow: 90 * 24 * 60 * 60, // 90 days
    });
    await rfq.addLegs(legs.slice(2));

    await measurer.expectChange([
      {
        token: "unlockedCollateral",
        user: taker,
        delta: withTokenDecimals(0),
      },
    ]);
  });

  it("Correct collateral locked if all scenarios yield negative pnl", async () => {
    const optionLow = await EuroOptionsFacade.initalizeNewOptionMeta(context, {
      underlyingMint: context.btcToken,
      stableMint: context.quoteToken,
      underlyingPerContract: withTokenDecimals(1),
      strikePrice: withTokenDecimals(18000),
      expireIn: 90 * 24 * 60 * 60, // 90 days
    });
    const optionMedium = await EuroOptionsFacade.initalizeNewOptionMeta(context, {
      underlyingMint: context.btcToken,
      stableMint: context.quoteToken,
      underlyingPerContract: withTokenDecimals(1),
      strikePrice: withTokenDecimals(20000),
      expireIn: 90 * 24 * 60 * 60, // 90 days
    });
    const optionHigh = await EuroOptionsFacade.initalizeNewOptionMeta(context, {
      underlyingMint: context.btcToken,
      stableMint: context.quoteToken,
      underlyingPerContract: withTokenDecimals(1),
      strikePrice: withTokenDecimals(22000),
      expireIn: 90 * 24 * 60 * 60, // 90 days
    });

    let measurer = await TokenChangeMeasurer.takeSnapshot(context, ["unlockedCollateral"], [taker]);
    const legs = [
      PsyoptionsEuropeanInstrument.create(context, optionLow, OptionType.CALL, {
        amount: 10000,
        side: LegSide.Long,
      }),
      PsyoptionsEuropeanInstrument.create(context, optionMedium, OptionType.CALL, {
        amount: 20000,
        side: LegSide.Short,
      }),
      PsyoptionsEuropeanInstrument.create(context, optionHigh, OptionType.CALL, {
        amount: 10000,
        side: LegSide.Long,
      }),
    ];
    const rfq = await context.createEscrowRfq({
      legs: legs.slice(0, 2),
      allLegs: legs,
      fixedSize: FixedSize.getBaseAsset(toLegMultiplier(1)),
      finalize: false,
      orderType: OrderType.Sell,
      settlingWindow: 90 * 24 * 60 * 60, // 90 days
    });
    await rfq.addLegs(legs.slice(2));

    await measurer.expectChange([
      {
        token: "unlockedCollateral",
        user: taker,
        delta: withTokenDecimals(0),
      },
    ]);
  });

  it("Correct collateral locked for fix base asset Hxro rfq creation", async () => {
    let measurer = await TokenChangeMeasurer.takeSnapshot(context, ["unlockedCollateral"], [taker]);

    await context.createPrintTradeRfq({
      printTradeProvider: new HxroPrintTradeProvider(context, hxroContext, [
        {
          amount: 20,
          baseAssetIndex: SOLANA_BASE_ASSET_INDEX,
          side: LegSide.Long,
          productIndex: 0,
        },
      ]),
      fixedSize: FixedSize.getBaseAsset(toLegMultiplier(1)),
      orderType: OrderType.Buy,
      settlingWindow: 90 * 24 * 60 * 60, // 90 days
    });

    await measurer.expectChange([{ token: "unlockedCollateral", user: taker, delta: withTokenDecimals(0) }]);
  });
});
