import { BN } from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";
import { sleep, toAbsolutePrice, TokenChangeMeasurer, toLegMultiplier, withTokenDecimals } from "../utilities/helpers";
import * as anchor from "@project-serum/anchor";
import { Context, getContext } from "../utilities/wrappers";
import { AuthoritySide, Quote, Side } from "../utilities/types";
import {
  PsyoptionsAmericanInstrument,
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

let rpc = new anchor.web3.Connection("http://localhost:8899");
let devnetRpc = new anchor.web3.Connection(anchor.web3.clusterApiUrl("devnet"));
let payer = anchor.AnchorProvider.env().wallet as anchor.Wallet;
let AnchorProvider = new anchor.AnchorProvider(rpc, payer, anchor.AnchorProvider.defaultOptions());

let psyOptionsAmericanLocalNetProgramId = new anchor.web3.PublicKey("77i2wXGdwV5MkV9W6X2T3bXwZwK7tFSDqBdL7XMz5yBF");
async function getOptionMint(ctx: Context, optionMint: PublicKey) {
  let opMint = await Mint.wrap(ctx, optionMint);
  return opMint;
}

describe("Psyoptions American instrument integration tests", async () => {
  let context: Context;
  let taker: PublicKey;
  let maker: PublicKey;
  let dao: PublicKey;

  before(async () => {
    context = await getContext();
    taker = context.taker.publicKey;
    maker = payer.publicKey;
    dao = context.dao.publicKey;
  });

  it("Psyoptions American Integration ...", async () => {
    let option = await AmericanPsyoptions.initalizeNewPsyoptionsAmerican(context);
    console.log("Option mint is: ", option.optionMint.toBase58());
    // await sleep(200);

    let sig = await option.mintPsyOPtions(context.maker, new anchor.BN(1), OptionType.CALL);
    console.log(sig);

    // let op = await AmericanPsyoptions.getOptionMarketByKey(option.optionMarketKey);
    // console.log(op.key.toBase58()
  });
});
