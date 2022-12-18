import { BN } from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";
import { sleep, toAbsolutePrice, TokenChangeMeasurer, toLegMultiplier, withTokenDecimals } from "../utilities/helpers";
import * as anchor from "@project-serum/anchor";
import { Context, getContext, Mint } from "../utilities/wrappers";
import { AuthoritySide, Quote, Side } from "../utilities/types";
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
import { program } from "@project-serum/anchor/dist/cjs/spl/associated-token";
import common from "mocha/lib/interfaces/common";
import { publicKey } from "@project-serum/anchor/dist/cjs/utils";
import { ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";

let rpc = new anchor.web3.Connection("http://localhost:8899");
let devnetRpc = new anchor.web3.Connection(anchor.web3.clusterApiUrl("devnet"));
let payer = anchor.AnchorProvider.env().wallet as anchor.Wallet;
let AnchorProvider = new anchor.AnchorProvider(rpc, payer, anchor.AnchorProvider.defaultOptions());

let psyOptionsAmericanLocalNetProgramId = new anchor.web3.PublicKey("R2y9ip6mxmWUj4pt54jP2hz2dgvMozy9VTSwMWE7evs");

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
  it("Psyoptions American Integration ...", async () => {
    console.log(context.taker.publicKey.toBase58());
    try {
      await context.quoteToken.token.mintTo(
        await context.quoteToken.getAssociatedAddress(context.taker.publicKey),
        context.dao,
        [],
        1000000000000
      );
    } catch (e) {
      console.error(e);
    }

    let ball = await context.provider.connection.getTokenAccountBalance(
      await context.quoteToken.getAssociatedAddress(context.taker.publicKey)
    );
    console.log("taker token bal", ball.value.amount);

    //  let b = await context.provider.connection.getTokenAccountBalance(context.quoteToken.getAssociatedAddress(context.));
    //  console.log(b.value.amount);
    // let b = await context.provider.connection.getTokenAccountBalance(
    //   await context.quoteToken.getAssociatedAddress(context.maker.publicKey)
    // );
    // console.log(b.value.amount);

    let options = await AmericanPsyoptions.initalizeNewPsyoptionsAmerican(context);
    console.log("Option market is initialized successfully...");
    console.log("Option mint is:", options.optionMint.toBase58());
    // let bal = await context.provider.connection.getBalance(context.maker.publicKey);
    // console.log(bal);
    let sig = await options.mintPsyOPtions(context.maker, new anchor.BN(1), OptionType.CALL, context);
    console.log("Option has been minted successfully with Signature:", sig);

    let tokenMeasurer = await TokenChangeMeasurer.takeSnapshot(
      context,
      ["quote", "asset", options.callMint],
      [context.taker.publicKey, context.maker.publicKey]
    );
    // create a two way RFQ specifying 1 option call as a leg
    console.log("Creating RFQ..");
    const rfq = await context.createRfq({
      legs: [
        PsyoptionsAmericanInstrumentClass.create(context, options.callMint, options.optionMarketKey, OptionType.CALL, {
          amount: new BN(1).mul(CONTRACT_DECIMALS_BN),
          side: Side.Ask,
        }),
      ],
    });

    // response with agreeing to sell 2 options for 50$ or buy 5 for 45$

    const response = await rfq.respond({
      bid: Quote.getStandart(toAbsolutePrice(withTokenDecimals(45)), toLegMultiplier(5)),
      ask: Quote.getStandart(toAbsolutePrice(withTokenDecimals(50)), toLegMultiplier(2)),
    });

    console.log("response done...");
    // console.log(context.protocolPda.toBase58());
    // console.log();

    // taker confirms to buy 1 option
    await response.confirm({ side: Side.Ask, legMultiplierBps: toLegMultiplier(1) });
    console.log("response confirmed...");
    // try {
    //   await response.prepareSettlement(AuthoritySide.Taker);
    // } catch (e) {
    //   console.error(e);
    // }
    console.log("preparing settlement for taker..");
    let b = await context.provider.connection.getTokenAccountBalance(
      await context.quoteToken.getAssociatedAddress(context.taker.publicKey)
    );
    console.log("taker token bal", b.value.amount);
    try {
      await response.prepareSettlement(AuthoritySide.Taker);
    } catch (e) {
      console.error(e);
    }

    // // taker should receive 1 option, maker should receive 500$ and lose 1 bitcoin as option collateral
    // await response.settle(maker, [taker]);
    // await tokenMeasurer.expectChange([
    //   { token: options.callMint, user: taker, delta: new BN(1).mul(CONTRACT_DECIMALS_BN) },
    //   { token: "quote", user: taker, delta: withTokenDecimals(-500) },
    //   { token: "quote", user: maker, delta: withTokenDecimals(500) },
    //   { token: "asset", user: maker, delta: withTokenDecimals(-1) },
    //   { token: options.callMint, user: maker, delta: new BN(0) },
    // ]);

    // await response.unlockResponseCollateral();
    // await response.cleanUp();
  });
});
