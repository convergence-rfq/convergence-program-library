import { BN } from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";
import { sleep, toAbsolutePrice, TokenChangeMeasurer, toLegMultiplier, withTokenDecimals } from "../utilities/helpers";
import * as anchor from "@project-serum/anchor";
import { Context, getContext } from "../utilities/wrappers";
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
import { Mint } from "../utilities/wrappers";
import { CONTRACT_DECIMALS_BN } from "../dependencies/tokenized-euros/src";

import { Token, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { OptionType } from "../dependencies/tokenized-euros/src/types";
import { program } from "@project-serum/anchor/dist/cjs/spl/associated-token";
import common from "mocha/lib/interfaces/common";
import { publicKey } from "@project-serum/anchor/dist/cjs/utils";

let rpc = new anchor.web3.Connection("http://localhost:8899");
let devnetRpc = new anchor.web3.Connection(anchor.web3.clusterApiUrl("devnet"));
let payer = anchor.AnchorProvider.env().wallet as anchor.Wallet;
let AnchorProvider = new anchor.AnchorProvider(rpc, payer, anchor.AnchorProvider.defaultOptions());

let psyOptionsAmericanLocalNetProgramId = new anchor.web3.PublicKey("77i2wXGdwV5MkV9W6X2T3bXwZwK7tFSDqBdL7XMz5yBF");

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

  it("Psyoptions American Integration ...", async () => {
    let options = await AmericanPsyoptions.initalizeNewPsyoptionsAmerican(context);
    console.log("Option mint is: ", options.optionMint.toBase58());
    let bal = await context.provider.connection.getBalance(context.maker.publicKey);
    console.log(bal);
    let sig = await options.mintPsyOPtions(context.maker, new anchor.BN(1), OptionType.CALL, context);
    console.log(sig);

    let tokenMeasurer = await TokenChangeMeasurer.takeSnapshot(
      context,
      ["quote", "asset", options.callMint],
      [context.taker.publicKey, context.maker.publicKey]
    );

    await PsyoptionsAmericanInstrumentClass.addInstrument(context);

    // create a two way RFQ specifying 1 option call as a leg
    try {
      const rfq = await context.createRfq({
        legs: [
          PsyoptionsAmericanInstrumentClass.create(
            context,
            options.callMint,
            options.optionMarketKey,
            OptionType.CALL,
            {
              amount: new BN(1).mul(CONTRACT_DECIMALS_BN),
              side: Side.Ask,
            }
          ),
        ],
      });
    } catch (e) {
      console.error(e);
    }

    // // response with agreeing to sell 2 options for 500$ or buy 5 for 450$
    // const response = await rfq.respond({
    //   bid: Quote.getStandart(toAbsolutePrice(withTokenDecimals(450)), toLegMultiplier(5)),
    //   ask: Quote.getStandart(toAbsolutePrice(withTokenDecimals(500)), toLegMultiplier(2)),
    // });
    // // taker confirms to buy 1 option
    // await response.confirm({ side: Side.Ask, legMultiplierBps: toLegMultiplier(1) });

    // await response.prepareSettlement(AuthoritySide.Taker);

    // await response.prepareSettlement(AuthoritySide.Maker);

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
