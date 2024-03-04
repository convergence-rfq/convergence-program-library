import { BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import {
  attachImprovedLogDisplay,
  runInParallelWithWait,
  toAbsolutePrice,
  TokenChangeMeasurer,
  toLegMultiplier,
  withoutSpotQuoteFees,
  withTokenDecimals,
} from "../utilities/helpers";
import { PsyoptionsEuropeanInstrument, EuroOptionsFacade } from "../utilities/instruments/psyoptionsEuropeanInstrument";
import { AuthoritySide, OracleSource, Quote, RiskCategory, QuoteSide, LegSide } from "../utilities/types";
import { Context, getContext, Mint } from "../utilities/wrappers";
import { CONTRACT_DECIMALS_BN, OptionType } from "@mithraic-labs/tokenized-euros";
import { SWITCHBOARD_BTC_ORACLE } from "../utilities/constants";

describe("Psyoptions European instrument integration tests", () => {
  let context: Context;
  let taker: PublicKey;
  let maker: PublicKey;
  let options: EuroOptionsFacade;

  beforeEach(function () {
    attachImprovedLogDisplay(this, context);
  });

  before(async () => {
    context = await getContext();
    taker = context.taker.publicKey;
    maker = context.maker.publicKey;

    options = await EuroOptionsFacade.initalizeNewOptionMeta(context, {
      underlyingMint: context.btcToken,
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
    const rfq = await context.createEscrowRfq({
      legs: [
        PsyoptionsEuropeanInstrument.create(context, options, OptionType.CALL, {
          amount: new BN(1).mul(CONTRACT_DECIMALS_BN),
          side: LegSide.Long,
        }),
      ],
    });
    // response with agreeing to sell 2 options for 500$ or buy 5 for 450$
    const response = await rfq.respond({
      bid: Quote.getStandard(toAbsolutePrice(withTokenDecimals(450)), toLegMultiplier(5)),
      ask: Quote.getStandard(toAbsolutePrice(withTokenDecimals(500)), toLegMultiplier(2)),
    });
    // taker confirms to buy 1 option
    await response.confirm({
      side: QuoteSide.Ask,
      legMultiplierBps: toLegMultiplier(1),
    });

    await response.prepareEscrowSettlement(AuthoritySide.Taker);

    await options.mintOptions(context.maker, new BN(1), OptionType.CALL);
    await response.prepareEscrowSettlement(AuthoritySide.Maker);

    // taker should receive 1 option, maker should receive 500$ and lose 1 bitcoin as option collateral
    await response.settleEscrow(maker, [taker]);
    await tokenMeasurer.expectChange([
      {
        token: options.callMint,
        user: taker,
        delta: new BN(1).mul(CONTRACT_DECIMALS_BN),
      },
      { token: "quote", user: taker, delta: withTokenDecimals(-500) },
      { token: "quote", user: maker, delta: withoutSpotQuoteFees(withTokenDecimals(500)) },
      { token: "asset", user: maker, delta: withTokenDecimals(-1) },
      { token: options.callMint, user: maker, delta: new BN(0) },
    ]);

    await response.cleanUp();
  });

  it("Create two-way RFQ with one euro option leg, respond but maker defaults on settlement", async () => {
    // create a two way RFQ specifying 1 option put as a leg
    const rfq = await context.createEscrowRfq({
      activeWindow: 2,
      settlingWindow: 1,
      legs: [
        PsyoptionsEuropeanInstrument.create(context, options, OptionType.PUT, {
          amount: new BN(1).mul(CONTRACT_DECIMALS_BN),
          side: LegSide.Long,
        }),
      ],
    });

    const [response, tokenMeasurer] = await runInParallelWithWait(async () => {
      // response with agreeing to buy 5 options for 450$
      const response = await rfq.respond({
        bid: Quote.getStandard(toAbsolutePrice(withTokenDecimals(450)), toLegMultiplier(5)),
        expirationTimestamp: Date.now() / 1000 + 1,
      });
      // taker confirms to sell 2 options
      await response.confirm({
        side: QuoteSide.Bid,
        legMultiplierBps: toLegMultiplier(2),
      });

      await options.mintOptions(context.taker, new BN(2), OptionType.PUT);

      let tokenMeasurer = await TokenChangeMeasurer.takeSnapshot(context, [options.putMint], [taker]);
      await response.prepareEscrowSettlement(AuthoritySide.Taker);

      return [response, tokenMeasurer];
    }, 3.5);

    await response.revertEscrowSettlementPreparation(AuthoritySide.Taker);

    // taker have returned his assets
    await tokenMeasurer.expectChange([{ token: options.putMint, user: taker, delta: new BN(0) }]);

    await response.cleanUp();
    await rfq.cleanUp();
  });

  it("Successful settlement flow with a lot of different base asset options", async () => {
    const legAmount = 6;
    const baseAssetOffset = 6300;
    const mints = await Promise.all(
      [...Array(legAmount)].map(async (_, i) => {
        const mint = await Mint.create(context);
        await context.addBaseAsset(
          baseAssetOffset + i,
          "TEST",
          RiskCategory.High,
          OracleSource.Switchboard,
          SWITCHBOARD_BTC_ORACLE,
          null,
          null
        );
        await mint.register(baseAssetOffset + i);
        return mint;
      })
    );
    const options = await Promise.all(
      mints.map(
        async (mint, i) =>
          await EuroOptionsFacade.initalizeNewOptionMeta(context, {
            underlyingMint: mint,
            stableMint: context.quoteToken,
            underlyingPerContract: withTokenDecimals(i + 1),
          })
      )
    );
    const legs = options.map((option) =>
      PsyoptionsEuropeanInstrument.create(context, option, OptionType.CALL, {
        amount: new BN(1).mul(CONTRACT_DECIMALS_BN),
        side: LegSide.Long,
      })
    );
    const rfq = await context.createEscrowRfq({
      legs: [legs[0]],
      allLegs: legs,
      finalize: false,
    });
    await rfq.addLegs([...legs.slice(1, 3)], false);
    await rfq.addLegs([...legs.slice(3, 5)], false);
    await rfq.addLegs([...legs.slice(5)]);

    const response = await rfq.respond({
      bid: Quote.getStandard(toAbsolutePrice(withTokenDecimals(450)), toLegMultiplier(5)),
      ask: Quote.getStandard(toAbsolutePrice(withTokenDecimals(500)), toLegMultiplier(2)),
    });
    await response.confirm({
      side: QuoteSide.Ask,
      legMultiplierBps: toLegMultiplier(1),
    });

    // mint options
    await Promise.all(options.map(async (option) => option.mintOptions(context.maker, new BN(2), OptionType.CALL)));

    await response.prepareEscrowSettlement(AuthoritySide.Taker, legAmount / 2);
    await response.prepareMoreEscrowLegsSettlement(AuthoritySide.Taker, legAmount / 2, legAmount / 2);
    await response.prepareEscrowSettlement(AuthoritySide.Maker, legAmount / 2);
    await response.prepareMoreEscrowLegsSettlement(AuthoritySide.Maker, legAmount / 2, legAmount / 2);

    await response.settleEscrow(
      maker,
      [...Array(legAmount)].map(() => taker)
    );
    await response.cleanUp();
  });
});
