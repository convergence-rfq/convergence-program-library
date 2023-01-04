import { BN } from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";
import { sleep, toAbsolutePrice, TokenChangeMeasurer, toLegMultiplier, withTokenDecimals } from "../utilities/helpers";
import * as anchor from "@project-serum/anchor";
import { Context, getContext, Mint } from "../utilities/wrappers";
import { AuthoritySide, Quote, Side, OrderType } from "../utilities/types";
import {
  PsyoptionsAmericanInstrumentClass,
  AmericanPsyoptions,
} from "../utilities/instruments/psyoptionsAmericanInstrument";
import {
  createProgram,
  getAllOptionAccounts,
  getOptionByKey,
  instructions,
  OptionMarketWithKey,
} from "@mithraic-labs/psy-american";

import { CONTRACT_DECIMALS_BN } from "../dependencies/tokenized-euros/src";

import * as Spl from "@solana/spl-token";
import { OptionType } from "../dependencies/tokenized-euros/src/types";

describe("Psyoptions American instrument integration tests", async () => {
  let context: Context;
  let taker: PublicKey;
  let maker: PublicKey;
  let dao: PublicKey;

  before(async () => {
    context = await getContext();
    taker = context.taker.publicKey;
    maker = context.maker.publicKey;
    dao = context.dao.publicKey;
  });
  console.log("Context is created successfully...");
  it("create an RFq to buy 1 option ...", async () => {
    console.log("taker address :", context.taker.publicKey.toBase58());
    console.log("make address :", context.maker.publicKey.toBase58());

    let options = await AmericanPsyoptions.initalizeNewPsyoptionsAmerican(context, context.maker);
    console.log("Option market is initialized successfully...");
    console.log("Option mint is:", options.optionMint.toBase58());

    console.log("Miniting 1 option to Maker..");
    let sig = await options.mintPsyOPtions(context.maker, new anchor.BN(1), OptionType.CALL, context);
    console.log("Option has been minted successfully with Signature:", sig);

    let tokenMeasurer = await TokenChangeMeasurer.takeSnapshot(
      context,
      ["quote", "asset", options.callMint],
      [context.taker.publicKey, context.maker.publicKey]
    );
    // create a two way RFQ specifying 1 option call as a leg
    console.log("Creating RFQ..");
    try {
      const rfq = await context.createRfq({
        legs: [
          PsyoptionsAmericanInstrumentClass.create(context, options, OptionType.CALL, {
            amount: new BN(1),
            side: Side.Bid,
          }),
        ],
      });
    } catch (e) {
      console.error(e);
    }

    console.log("rfq done creation");

    // response with agreeing to sell 2 options for 50$ or buy 5 for 45$

    // const response = await rfq.respond({
    //   bid: Quote.getStandart(toAbsolutePrice(withTokenDecimals(45)), toLegMultiplier(5)),
    //   ask: Quote.getStandart(toAbsolutePrice(withTokenDecimals(50)), toLegMultiplier(2)),
    // });

    // console.log("response done...");

    // // taker confirms to buy 1 option
    // await response.confirm({ side: Side.Ask, legMultiplierBps: toLegMultiplier(1) });

    // console.log("response confirmed...");

    // console.log("preparing settlement for taker..");

    // await response.prepareSettlement(AuthoritySide.Taker);

    // console.log("preparing settlement for Maker..");

    // await response.prepareSettlement(AuthoritySide.Maker);

    // console.log("settlement for maker and taker....");

    // // taker should receive 1 option, maker should receive 50$ and lose 1 bitcoin as option collateral
    // await response.settle(maker, [taker]);
    // await tokenMeasurer.expectChange([
    //   { token: options.callMint, user: taker, delta: new BN(1) },
    //   { token: "quote", user: taker, delta: withTokenDecimals(-50) },
    //   { token: "quote", user: maker, delta: withTokenDecimals(50) },
    //   { token: "asset", user: maker, delta: withTokenDecimals(0) },
    //   { token: options.callMint, user: maker, delta: new BN(-1) },
    // ]);

    // console.log("unlock response...");

    // await response.unlockResponseCollateral();
    // console.log("cleanup...");
    // await response.cleanUp();
  });

  // it("Create a RFQ where taker wants to sell 2 options", async () => {
  //   console.log("taker address :", context.taker.publicKey.toBase58());
  //   console.log("maker address :", context.maker.publicKey.toBase58());

  //   let options = await AmericanPsyoptions.initalizeNewPsyoptionsAmerican(context, context.taker);
  //   console.log("Option market is initialized successfully...");
  //   console.log("Option mint is:", options.optionMint.toBase58());

  //   console.log("Miniting 2 options to Taker..");
  //   let sig = await options.mintPsyOPtions(context.taker, new anchor.BN(2), OptionType.CALL, context);
  //   console.log("Option has been minted successfully with Signature:", sig);
  //   let tokenMeasurer = await TokenChangeMeasurer.takeSnapshot(
  //     context,
  //     ["asset", "quote", options.callMint],
  //     [taker, maker]
  //   );

  //   // create a two way RFQ specifying 1 option call as a leg

  //   const rfq = await context.createRfq({
  //     legs: [
  //       PsyoptionsAmericanInstrumentClass.create(context, options, OptionType.CALL, {
  //         amount: new BN(1),
  //         side: Side.Bid,
  //       }),
  //     ],
  //   });

  //   // response with agreeing to buy 2 options for 45$

  //   const response = await rfq.respond({
  //     bid: Quote.getStandart(toAbsolutePrice(withTokenDecimals(45)), toLegMultiplier(2)),
  //   });
  //   console.log("response done ...");

  //   await response.confirm({ side: Side.Bid, legMultiplierBps: toLegMultiplier(2) });
  //   console.log("Response confirmed..");

  //   // taker confirms to sell 2 options

  //   // console.log(await response.getData());

  //   try {
  //     await response.prepareSettlement(AuthoritySide.Taker);
  //     console.log("prepare settlement for taker..");
  //   } catch (e) {
  //     console.error(e);
  //   }

  //   try {
  //     await response.prepareSettlement(AuthoritySide.Maker);
  //   } catch (e) {
  //     console.error(e);
  //   }

  //   console.log("prepare settlement for maker..");

  //   console.log("settlement for maker and taker....");

  //   // taker should redceive 90$, maker should receive 2 options
  //   await response.settle(taker, [maker]);

  //   await tokenMeasurer.expectChange([
  //     { token: options.callMint, user: taker, delta: new BN(-2) },
  //     { token: "quote", user: taker, delta: withTokenDecimals(90) },
  //     { token: "quote", user: maker, delta: withTokenDecimals(-90) },
  //     { token: "asset", user: maker, delta: withTokenDecimals(0) },
  //     { token: options.callMint, user: maker, delta: new BN(2) },
  //   ]);
  //   try {
  //     await response.unlockResponseCollateral();
  //   } catch (e) {
  //     console.error(e);
  //   }

  //   await response.cleanUp();
  // });

  // it("Create two-way RFQ with one psyoptions-american option leg, respond but maker defaults on settlement", async () => {
  //   console.log("taker address :", context.taker.publicKey.toBase58());
  //   console.log("maker address :", context.maker.publicKey.toBase58());
  //   // create a two way RFQ specifying 1 option put as a leg
  //   let options = await AmericanPsyoptions.initalizeNewPsyoptionsAmerican(context, context.taker);
  //   console.log("Option market is initialized successfully...");
  //   console.log("Option mint is:", options.optionMint.toBase58());
  //   console.log("Miniting 2 options to Taker..");
  //   let sig = await options.mintPsyOPtions(context.taker, new anchor.BN(2), OptionType.CALL, context);
  //   const rfq = await context.createRfq({
  //     activeWindow: 4,
  //     settlingWindow: 1,
  //     legs: [
  //       PsyoptionsAmericanInstrumentClass.create(context, options, OptionType.CALL, {
  //         amount: new BN(1),
  //         side: Side.Bid,
  //       }),
  //     ],
  //   });
  //   // response with agreeing to buy 5 options for 45$
  //   const response = await rfq.respond({
  //     bid: Quote.getStandart(toAbsolutePrice(withTokenDecimals(45)), toLegMultiplier(5)),
  //   });
  //   console.log("response done..");
  //   // taker confirms to sell 2 options
  //   await response.confirm({ side: Side.Bid, legMultiplierBps: toLegMultiplier(2) });
  //   console.log("response confirmed..");
  //   let tokenMeasurer = await TokenChangeMeasurer.takeSnapshot(context, [options.callMint], [taker]);
  //   await response.prepareSettlement(AuthoritySide.Taker);
  //   console.log("prepare settlement for taker..");
  //   await sleep(3000);
  //   await response.revertSettlementPreparation(AuthoritySide.Taker);
  //   console.log("revert preparation..");
  //   // taker have returned his assets
  //   await tokenMeasurer.expectChange([{ token: options.callMint, user: taker, delta: new BN(0) }]);

  //   await response.settleOnePartyDefault();
  //   console.log("settle one party default {taker}..");
  //   await response.cleanUp();
  //   await rfq.cleanUp();
  // });

  // it("Create two-way RFQ with one psyoptions-american option leg, respond but taker defaults on settlement", async () => {
  //   console.log("taker address :", context.taker.publicKey.toBase58());
  //   console.log("maker address :", context.maker.publicKey.toBase58());
  //   // create a two way RFQ specifying 1 option put as a leg
  //   let options = await AmericanPsyoptions.initalizeNewPsyoptionsAmerican(context, context.taker);
  //   console.log("Option market is initialized successfully...");
  //   console.log("Option mint is:", options.optionMint.toBase58());
  //   console.log("Miniting 2 options to Taker..");
  //   let sig = await options.mintPsyOPtions(context.taker, new anchor.BN(2), OptionType.CALL, context);
  //   const rfq = await context.createRfq({
  //     activeWindow: 4,
  //     settlingWindow: 1,
  //     legs: [
  //       PsyoptionsAmericanInstrumentClass.create(context, options, OptionType.CALL, {
  //         amount: new BN(1),
  //         side: Side.Bid,
  //       }),
  //     ],
  //   });
  //   // response with agreeing to buy 5 options for 45$
  //   const response = await rfq.respond({
  //     bid: Quote.getStandart(toAbsolutePrice(withTokenDecimals(45)), toLegMultiplier(5)),
  //   });
  //   console.log("response done..");
  //   // taker confirms to sell 2 options
  //   await response.confirm({ side: Side.Bid, legMultiplierBps: toLegMultiplier(2) });
  //   console.log("response confirmed..");
  //   let tokenMeasurer = await TokenChangeMeasurer.takeSnapshot(context, ["quote"], [maker]);
  //   await response.prepareSettlement(AuthoritySide.Maker);
  //   console.log("prepare settlement for Maker..");
  //   await tokenMeasurer.expectChange([{ token: "quote", user: maker, delta: withTokenDecimals(new BN(-90)) }]);
  //   await sleep(3000);
  //   await response.revertSettlementPreparation(AuthoritySide.Maker);

  //   console.log("revert preparation..");
  //   // taker have returned his assets

  //   await response.settleOnePartyDefault();
  //   await tokenMeasurer.expectChange([{ token: "quote", user: maker, delta: new BN(0) }]);
  //   console.log("settle one party default {maker}..");
  //   await response.cleanUp();
  //   await rfq.cleanUp();
  // });

  // it("Create two-way RFQ with one psyoptions-american option leg, respond but taker and maker defaults on settlement", async () => {
  //   console.log("taker address :", context.taker.publicKey.toBase58());
  //   console.log("maker address :", context.maker.publicKey.toBase58());
  //   // create a two way RFQ specifying 2 option call as a leg
  //   let options = await AmericanPsyoptions.initalizeNewPsyoptionsAmerican(context, context.taker);
  //   console.log("Option market is initialized successfully...");
  //   console.log("Option mint is:", options.optionMint.toBase58());
  //   console.log("Miniting 2 options to Taker..");
  //   let sig = await options.mintPsyOPtions(context.taker, new anchor.BN(2), OptionType.CALL, context);
  //   const rfq = await context.createRfq({
  //     activeWindow: 8,
  //     settlingWindow: 2,
  //     legs: [
  //       PsyoptionsAmericanInstrumentClass.create(context, options, OptionType.CALL, {
  //         amount: new BN(1),
  //         side: Side.Bid,
  //       }),
  //     ],
  //     orderType: OrderType.TwoWay,
  //   });
  //   // response with agreeing to buy 5 options for 45$
  //   const response = await rfq.respond({
  //     bid: Quote.getStandart(toAbsolutePrice(withTokenDecimals(45)), toLegMultiplier(5)),
  //   });
  //   console.log("response done..");
  //   // taker confirms to sell 2 options
  //   await response.confirm({ side: Side.Bid, legMultiplierBps: toLegMultiplier(2) });
  //   console.log("response confirmed..");
  //   let tokenMeasurer = await TokenChangeMeasurer.takeSnapshot(context, ["quote", options.callMint], [maker, taker]);
  //   await response.prepareSettlement(AuthoritySide.Maker);
  //   console.log("prepare settlement for Maker..");

  //   try {
  //     await response.prepareSettlement(AuthoritySide.Taker);
  //     console.log("prepare settlement for Taker..");
  //   } catch (e) {
  //     console.error(e);
  //   }

  //   await sleep(3000);
  //   try {
  //     await response.revertSettlementPreparation(AuthoritySide.Taker);
  //   } catch (e) {
  //     console.error(e);
  //   }

  //   await sleep(3000);
  //   await response.revertSettlementPreparation(AuthoritySide.Maker);

  //   console.log("revert preparation for taker and maker..");

  //   // taker have returned his assets

  //   await response.settleTwoPartyDefault();
  //   await tokenMeasurer.expectChange([
  //     { token: "quote", user: maker, delta: new BN(0) },
  //     { token: options.callMint, user: taker, delta: new BN(0) },
  //   ]);
  //   console.log("settle one party default {maker}..");
  //   await response.cleanUp();
  //   await rfq.cleanUp();
  // });
});
