import * as anchor from "@project-serum/anchor";
import { Program, Wallet, BN } from "@project-serum/anchor";
import * as assert from "assert";
import { Token, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Keypair, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";

import {
  BuySell,
  Contract,
  Instrument,
  Order,
  Quote,
  Venue,
  confirm,
  getProgram,
  processLegs,
  respond,
  request,
  requestAirdrop,
  settle,
} from "../../lib/helpers";

let assetToken: Token;
let quoteToken: Token;

const ASSET_DECIMALS = 6;
const QUOTE_DECIMALS = 2;

const MINT_AIRDROP_ASSET = 1_000_000 * 10 ** ASSET_DECIMALS;
const MINT_AIRDROP_QUOTE = 10_000_000_000_000 * 10 ** QUOTE_DECIMALS;

let takerAssetATA: PublicKey;
let takerQuoteATA: PublicKey;
let makerAAssetATA: PublicKey;
let makerAQuoteATA: PublicKey;

let taker: Wallet;
let maker: Wallet;

anchor.setProvider(anchor.AnchorProvider.env());

const provider = anchor.getProvider();
let program: Program;

describe("PsyOptions American Specification", () => {
  before(async () => {
    program = await getProgram(provider);

    // @ts-ignore
    taker = provider.wallet;
    maker = new Wallet(Keypair.generate());

    await requestAirdrop(provider, maker.publicKey, LAMPORTS_PER_SOL * 1);

    const takerBalance = await provider.connection.getBalance(taker.publicKey);
    console.log("Taker SOL balance:", takerBalance);

    const makerBalance = await provider.connection.getBalance(maker.publicKey);
    console.log("Maker SOL balance:", makerBalance);

    assetToken = await Token.createMint(
      program.provider.connection,
      taker.payer,
      taker.publicKey,
      taker.publicKey,
      ASSET_DECIMALS,
      TOKEN_PROGRAM_ID
    );
    quoteToken = await Token.createMint(
      program.provider.connection,
      taker.payer,
      taker.publicKey,
      taker.publicKey,
      QUOTE_DECIMALS,
      TOKEN_PROGRAM_ID
    );

    takerAssetATA = await assetToken.createAssociatedTokenAccount(taker.publicKey);
    makerAAssetATA = await assetToken.createAssociatedTokenAccount(maker.publicKey);

    takerQuoteATA = await quoteToken.createAssociatedTokenAccount(taker.publicKey);
    makerAQuoteATA = await quoteToken.createAssociatedTokenAccount(maker.publicKey);

    await assetToken.mintTo(takerAssetATA, taker.publicKey, [], MINT_AIRDROP_ASSET);
    await assetToken.mintTo(makerAAssetATA, taker.publicKey, [], MINT_AIRDROP_ASSET);

    await quoteToken.mintTo(takerQuoteATA, taker.publicKey, [], MINT_AIRDROP_QUOTE);
    await quoteToken.mintTo(makerAQuoteATA, taker.publicKey, [], MINT_AIRDROP_QUOTE);
  });

  it("RFQ 1: Taker requests two-way for PsyOptions American multi-leg covered call strategy", async () => {
    const TAKER_ORDER_AMOUNT = 1 * 10 ** ASSET_DECIMALS;

    const MAKER_ASK_AMOUNT1 = 20_000 * 10 ** QUOTE_DECIMALS;
    const MAKER_BID_AMOUNT1 = 19_500 * 10 ** QUOTE_DECIMALS;

    const requestOrder = Order.TwoWay;
    const expiry = new Date().getTime() / 1_000 + (60 * 5);
    const legs = [
      {
        amount: new anchor.BN(10),
        contract: Contract.Call,
        contractAssetAmount: new BN(1 * 10 ** ASSET_DECIMALS),
        contractQuoteAmount: new BN(1 * 10 ** QUOTE_DECIMALS),
        expiry: new BN(expiry),
        instrument: Instrument.Option,
        venue: Venue.PsyOptions,
        buySell: BuySell.Sell,
      },
      {
        amount: new BN(5 * 10 ** ASSET_DECIMALS),
        contract: null,
        contractAssetAmount: null,
        contractQuoteAmount: null,
        expiry: null,
        instrument: Instrument.Spot,
        venue: Venue.Convergence,
        buySell: BuySell.Sell,
      },
    ];

    const { rfqPda } = await request(
      null,
      assetToken.publicKey,
      taker,
      expiry,
      false,
      legs,
      TAKER_ORDER_AMOUNT,
      provider,
      quoteToken.publicKey,
      requestOrder
    );
    console.log("RFQ:", rfqPda.toString());

    const { orderPda } = await respond(
      provider,
      maker,
      rfqPda,
      MAKER_BID_AMOUNT1,
      MAKER_ASK_AMOUNT1,
      makerAAssetATA,
      makerAQuoteATA
    );
    console.log("Order:", orderPda.toString());

    const confirmationRes = await confirm(provider, rfqPda, orderPda, taker, takerAssetATA, takerQuoteATA, Quote.Bid);
    console.log("Confirmation:", confirmationRes.tx);

    const takerSettlementRes = await settle(provider, taker, rfqPda, orderPda, takerAssetATA, takerQuoteATA);
    console.log("Taker settlement:", takerSettlementRes.tx);

    const makerSettlmentRes = await settle(provider, maker, rfqPda, orderPda, makerAAssetATA, makerAQuoteATA);
    console.log("Maker settlement:", makerSettlmentRes.tx);

    await processLegs(provider, rfqPda, taker);

    const rfqState: any = await program.account.rfqState.fetch(rfqPda);
    assert.equal(legs.toString(), rfqState.legs.toString());

    for (let i = 0; i < rfqState.legs.length; i++) {
      assert.ok(rfqState.legs[i].processed);
    }
  });
});
