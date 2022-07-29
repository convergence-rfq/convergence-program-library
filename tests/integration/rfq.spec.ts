/**
 * RFQ Specification
 *
 * Step 1 - Requests:
 * - Taker wants an asset quote for one or two-way market
 *
 * Optional - Cancels:
 * - Taker cancels RFQ
 *
 * Step 2: Responds:
 * - Maker submits one or two-way order and deposits collateral
 *
 * Step 3 - Confirms:
 * - Taker confirms response by depositing collateral
 *
 * Optional - Last look:
 * - Set to false
 *
 * Step 4 - Returns collateral:
 * - Unconfirmed maker orders get collateral returned
 *
 * Step 5 - Settles:
 * - Taker receives quote
 * - Maker receives asset
 */

import * as anchor from "@project-serum/anchor";
import { Wallet } from "@project-serum/anchor";
import { Token, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Keypair, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import * as assert from "assert";

import {
  Instrument,
  Order,
  Quote,
  Venue,
  calcFee,
  cancel,
  confirm,
  getBalance,
  getRfqs,
  getProgram,
  getAllOrders,
  getMyOrders,
  getRfqOrders,
  initializeProtocol,
  lastLook,
  respond,
  returnCollateral,
  request,
  requestAirdrop,
  setFee,
  settle,
} from "../../lib/helpers";
import { Program } from "@project-serum/anchor";

let assetToken: Token;
let quoteToken: Token;

const ASSET_DECIMALS = 6;
const QUOTE_DECIMALS = 2;

const MINT_AIRDROP_ASSET = 1_000_000 * 10 ** ASSET_DECIMALS;
const MINT_AIRDROP_QUOTE = 10_000_000_000_000 * 10 ** QUOTE_DECIMALS;

const FEE_NUMERATOR = 1;
const FEE_DENOMINATOR = 1_000;

const TAKER_ORDER_AMOUNT1 = 5 * 10 ** ASSET_DECIMALS;
const TAKER_ORDER_AMOUNT2 = 32 * 10 ** ASSET_DECIMALS;
const TAKER_ORDER_AMOUNT3 = 20 * 10 ** ASSET_DECIMALS;
const TAKER_ORDER_AMOUNT4 = 17 * 10 ** ASSET_DECIMALS;

const MAKER_A_ASK_AMOUNT1 = 41_000 * 10 ** QUOTE_DECIMALS * TAKER_ORDER_AMOUNT1;
const MAKER_A_BID_AMOUNT1 = 39_100 * 10 ** QUOTE_DECIMALS * TAKER_ORDER_AMOUNT1;
const MAKER_A_ASK_AMOUNT2 = 41_100 * 10 ** QUOTE_DECIMALS * TAKER_ORDER_AMOUNT1;
const MAKER_A_BID_AMOUNT2 = 39_200 * 10 ** QUOTE_DECIMALS * TAKER_ORDER_AMOUNT1; // Sell winner
const MAKER_B_ASK_AMOUNT1 = null;
const MAKER_B_BID_AMOUNT1 = 40_000 * 10 ** QUOTE_DECIMALS * TAKER_ORDER_AMOUNT2;
const MAKER_B_ASK_AMOUNT2 = 42_000 * 10 ** QUOTE_DECIMALS * TAKER_ORDER_AMOUNT2;
const MAKER_B_BID_AMOUNT2 = 41_000 * 10 ** QUOTE_DECIMALS * TAKER_ORDER_AMOUNT2; // Invalid
const MAKER_C_ASK_AMOUNT1 = null;
const MAKER_C_BID_AMOUNT1 = 41_100 * 10 ** QUOTE_DECIMALS * TAKER_ORDER_AMOUNT2; // Sell winner
const MAKER_C_ASK_AMOUNT2 = null;
const MAKER_C_BID_AMOUNT2 = 39_000 * 10 ** QUOTE_DECIMALS * TAKER_ORDER_AMOUNT2;
const MAKER_D_ASK_AMOUNT1 = 39_500 * 10 ** QUOTE_DECIMALS * TAKER_ORDER_AMOUNT2;
const MAKER_D_BID_AMOUNT1 = null;
const MAKER_D_ASK_AMOUNT2 = 39_000 * 10 ** QUOTE_DECIMALS * TAKER_ORDER_AMOUNT3; // Buy winner
const MAKER_D_BID_AMOUNT2 = null;
const MAKER_D_ASK_AMOUNT3 = 39_100 * 10 ** QUOTE_DECIMALS * TAKER_ORDER_AMOUNT4; // Expires
const MAKER_D_BID_AMOUNT3 = 39_010 * 10 ** QUOTE_DECIMALS * TAKER_ORDER_AMOUNT4;

const FEE1 = calcFee(MAKER_A_BID_AMOUNT2, FEE_NUMERATOR, FEE_DENOMINATOR);
const FEE2 = calcFee(MAKER_C_BID_AMOUNT1, FEE_NUMERATOR, FEE_DENOMINATOR);
const FEE3 = calcFee(TAKER_ORDER_AMOUNT3, FEE_NUMERATOR, FEE_DENOMINATOR);

let daoAssetATA: PublicKey;
let daoQuoteATA: PublicKey;
let takerAssetATA: PublicKey;
let takerQuoteATA: PublicKey;
let makerAAssetATA: PublicKey;
let makerAQuoteATA: PublicKey;
let makerBAssetATA: PublicKey;
let makerBQuoteATA: PublicKey;
let makerCAssetATA: PublicKey;
let makerCQuoteATA: PublicKey;
let makerDAssetATA: PublicKey;
let makerDQuoteATA: PublicKey;

let mintAuthority: Wallet;
let dao: Wallet;
let bot: Wallet;
let taker: Wallet;
let makerA: Wallet;
let makerB: Wallet;
let makerC: Wallet;
let makerD: Wallet;

let rfqPda1: PublicKey;
let rfqPda2: PublicKey;
let rfqPda3: PublicKey;
let rfqPda4: PublicKey;
let rfqPda5: PublicKey;

let orderPda1: PublicKey;
let orderPda2: PublicKey;
let orderPda3: PublicKey;

anchor.setProvider(anchor.AnchorProvider.env());

const provider = anchor.getProvider();
let program: Program;

const sleep = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

describe("RFQ Specification", () => {
  before(async () => {
    program = await getProgram(provider);

    mintAuthority = new Wallet(Keypair.generate());
    dao = new Wallet(Keypair.generate());
    taker = new Wallet(Keypair.generate());
    bot = new Wallet(Keypair.generate());
    makerA = new Wallet(Keypair.generate());
    makerB = new Wallet(Keypair.generate());
    makerC = new Wallet(Keypair.generate());
    makerD = new Wallet(Keypair.generate());

    await requestAirdrop(provider, mintAuthority.publicKey, LAMPORTS_PER_SOL * 10);
    await requestAirdrop(provider, dao.publicKey, LAMPORTS_PER_SOL * 10);
    await requestAirdrop(provider, taker.publicKey, LAMPORTS_PER_SOL * 10);
    await requestAirdrop(provider, bot.publicKey, LAMPORTS_PER_SOL * 10);
    await requestAirdrop(provider, makerA.publicKey, LAMPORTS_PER_SOL * 10);
    await requestAirdrop(provider, makerB.publicKey, LAMPORTS_PER_SOL * 10);
    await requestAirdrop(provider, makerC.publicKey, LAMPORTS_PER_SOL * 10);
    await requestAirdrop(provider, makerD.publicKey, LAMPORTS_PER_SOL * 10);

    const takerBalance = await provider.connection.getBalance(taker.publicKey);
    console.log("Taker SOL balance:", takerBalance);

    const mintAuthorityBalance = await provider.connection.getBalance(mintAuthority.publicKey);
    console.log("Mint authority SOL balance:", mintAuthorityBalance);

    assetToken = await Token.createMint(
      program.provider.connection,
      mintAuthority.payer,
      mintAuthority.publicKey,
      mintAuthority.publicKey,
      ASSET_DECIMALS,
      TOKEN_PROGRAM_ID
    );
    quoteToken = await Token.createMint(
      program.provider.connection,
      mintAuthority.payer,
      mintAuthority.publicKey,
      mintAuthority.publicKey,
      QUOTE_DECIMALS,
      TOKEN_PROGRAM_ID
    );

    // NOTE: Do not create DAO asset ATA as this is tested for in settle function
    takerAssetATA = await assetToken.createAssociatedTokenAccount(taker.publicKey);
    makerAAssetATA = await assetToken.createAssociatedTokenAccount(makerA.publicKey);
    makerBAssetATA = await assetToken.createAssociatedTokenAccount(makerB.publicKey);
    makerCAssetATA = await assetToken.createAssociatedTokenAccount(makerC.publicKey);
    makerDAssetATA = await assetToken.createAssociatedTokenAccount(makerD.publicKey);

    daoQuoteATA = await quoteToken.createAssociatedTokenAccount(dao.publicKey);
    takerQuoteATA = await quoteToken.createAssociatedTokenAccount(taker.publicKey);
    makerAQuoteATA = await quoteToken.createAssociatedTokenAccount(makerA.publicKey);
    makerBQuoteATA = await quoteToken.createAssociatedTokenAccount(makerB.publicKey);
    makerCQuoteATA = await quoteToken.createAssociatedTokenAccount(makerC.publicKey);
    makerDQuoteATA = await quoteToken.createAssociatedTokenAccount(makerD.publicKey);

    await assetToken.mintTo(takerAssetATA, mintAuthority.publicKey, [], MINT_AIRDROP_ASSET);
    await assetToken.mintTo(makerAAssetATA, mintAuthority.publicKey, [], MINT_AIRDROP_ASSET);
    await assetToken.mintTo(makerBAssetATA, mintAuthority.publicKey, [], MINT_AIRDROP_ASSET);
    await assetToken.mintTo(makerCAssetATA, mintAuthority.publicKey, [], MINT_AIRDROP_ASSET);
    await assetToken.mintTo(makerDAssetATA, mintAuthority.publicKey, [], MINT_AIRDROP_ASSET);

    await quoteToken.mintTo(takerQuoteATA, mintAuthority.publicKey, [], MINT_AIRDROP_QUOTE);
    await quoteToken.mintTo(makerAQuoteATA, mintAuthority.publicKey, [], MINT_AIRDROP_QUOTE);
    await quoteToken.mintTo(makerBQuoteATA, mintAuthority.publicKey, [], MINT_AIRDROP_QUOTE);
    await quoteToken.mintTo(makerCQuoteATA, mintAuthority.publicKey, [], MINT_AIRDROP_QUOTE);
    await quoteToken.mintTo(makerDQuoteATA, mintAuthority.publicKey, [], MINT_AIRDROP_QUOTE);
  });

  it("DAO initializes protocol with 0bps fee", async () => {
    const { protocolPda } = await initializeProtocol(provider, dao, FEE_DENOMINATOR, 0);
    const protocolState: any = await program.account.protocolState.fetch(protocolPda);
    assert.ok(protocolState.feeDenominator.eq(new anchor.BN(FEE_DENOMINATOR)));
    assert.ok(protocolState.feeNumerator.eq(new anchor.BN(0)));
  });

  it(`DAO sets ${FEE_NUMERATOR}bps protocol fee`, async () => {
    const { protocolPda } = await setFee(provider, dao, FEE_DENOMINATOR, FEE_NUMERATOR);
    const protocolState: any = await program.account.protocolState.fetch(protocolPda);
    assert.ok(protocolState.feeDenominator.eq(new anchor.BN(FEE_DENOMINATOR)));
    assert.ok(protocolState.feeNumerator.eq(new anchor.BN(FEE_NUMERATOR)));
  });

  it(`RFQ 1: Taker requests two-way asset quote for ${TAKER_ORDER_AMOUNT1}`, async () => {
    const requestOrder = Order.TwoWay;
    const now = new Date().getTime() / 1_000;
    const expiry = now + 2; // Expires in 2 seconds
    const legs = [
      {
        amount: new anchor.BN(TAKER_ORDER_AMOUNT1),
        instrument: Instrument.Spot,
        venue: Venue.Convergence,
      },
    ];

    const res = await request(
      null,
      assetToken.publicKey,
      taker,
      expiry,
      false,
      legs,
      TAKER_ORDER_AMOUNT1,
      provider,
      quoteToken.publicKey,
      requestOrder
    );
    rfqPda1 = res.rfqPda;

    const rfqState = await program.account.rfqState.fetch(res.rfqPda);
    assert.ok(rfqState.authority.toString() === taker.publicKey.toString());
  });

  it("RFQ 1: Maker A responds to two-way request then Taker confirms best bid", async () => {
    const res1 = await respond(
      provider,
      makerA,
      rfqPda1,
      MAKER_A_BID_AMOUNT1,
      MAKER_A_ASK_AMOUNT1,
      makerAAssetATA,
      makerAQuoteATA
    );
    orderPda1 = res1.orderPda;

    const res2 = await respond(
      provider,
      makerA,
      rfqPda1,
      MAKER_A_BID_AMOUNT2,
      MAKER_A_ASK_AMOUNT2,
      makerAAssetATA,
      makerAQuoteATA
    );
    orderPda2 = res2.orderPda;

    let assetBalance = await getBalance(provider, taker.publicKey, assetToken.publicKey);
    let quoteBalance = await getBalance(provider, taker.publicKey, quoteToken.publicKey);
    console.log("Taker asset balance:", assetBalance);
    console.log("Taker quote balance:", quoteBalance);

    try {
      await confirm(provider, rfqPda1, orderPda1, taker, takerAssetATA, takerQuoteATA, Quote.Bid);
    } catch (err) {
      assert.strictEqual(err.error.errorCode.code, "InvalidConfirm");
    }

    const res3 = await confirm(provider, rfqPda1, orderPda2, taker, takerAssetATA, takerQuoteATA, Quote.Bid);

    const orderState: any = await program.account.orderState.fetch(orderPda2);
    const rfqState: any = await program.account.rfqState.fetch(rfqPda1);
    console.log("Order confirmed quote:", orderState.confirmedQuote);
    console.log("Best ask:", rfqState.bestAskAmount?.toNumber());
    console.log("Best bid:", rfqState.bestBidAmount?.toNumber());

    try {
      await confirm(provider, rfqPda1, orderPda1, taker, takerAssetATA, takerQuoteATA, Quote.Bid);
      assert.ok(false);
    } catch (err) {
      assert.strictEqual(err.error.errorCode.code, "RfqConfirmed");
    }

    try {
      await respond(
        provider,
        makerA,
        rfqPda1,
        MAKER_B_BID_AMOUNT1,
        MAKER_B_ASK_AMOUNT1,
        makerAAssetATA,
        makerAQuoteATA
      );
      assert.ok(false);
    } catch (err) {
      assert.strictEqual(err.error.errorCode.code, "RfqConfirmed");
    }

    assetBalance = await getBalance(provider, taker.publicKey, assetToken.publicKey);
    quoteBalance = await getBalance(provider, taker.publicKey, quoteToken.publicKey);
    console.log("Taker asset balance:", assetBalance);
    console.log("Taker quote balance:", quoteBalance);
    assert.equal(assetBalance, MINT_AIRDROP_ASSET - TAKER_ORDER_AMOUNT1);
    assert.equal(quoteBalance, MINT_AIRDROP_QUOTE);

    assetBalance = await getBalance(provider, makerA.publicKey, assetToken.publicKey);
    quoteBalance = await getBalance(provider, makerA.publicKey, quoteToken.publicKey);
    console.log("Maker A asset balance:", assetBalance);
    console.log("Maker A quote balance:", quoteBalance);
    assert.equal(assetBalance, MINT_AIRDROP_ASSET - TAKER_ORDER_AMOUNT1 - TAKER_ORDER_AMOUNT1);
    assert.equal(quoteBalance, MINT_AIRDROP_QUOTE - MAKER_A_BID_AMOUNT1 - MAKER_A_BID_AMOUNT2);

    assert.ok(rfqState.confirmedOrder);
  });

  it("RFQ 1: Taker and Maker A return collateral then settle", async () => {
    await returnCollateral(provider, makerA, rfqPda1, orderPda1, makerAAssetATA, makerAQuoteATA);
    await returnCollateral(provider, makerA, rfqPda1, orderPda2, makerAAssetATA, makerAQuoteATA);
    let assetBalance = await getBalance(provider, makerA.publicKey, assetToken.publicKey);
    let quoteBalance = await getBalance(provider, makerA.publicKey, quoteToken.publicKey);
    console.log("Maker A asset balance:", assetBalance);
    console.log("Maker A quote balance:", quoteBalance);
    assert.equal(assetBalance, MINT_AIRDROP_ASSET);
    assert.equal(quoteBalance, MINT_AIRDROP_QUOTE - MAKER_A_BID_AMOUNT2);

    await settle(provider, makerA, rfqPda1, orderPda2, makerAAssetATA, makerAQuoteATA);
    assetBalance = await getBalance(provider, makerA.publicKey, assetToken.publicKey);
    quoteBalance = await getBalance(provider, makerA.publicKey, quoteToken.publicKey);
    console.log("Maker A asset balance:", assetBalance);
    console.log("Maker A quote balance:", quoteBalance);
    assert.equal(assetBalance, MINT_AIRDROP_ASSET + TAKER_ORDER_AMOUNT1);
    assert.equal(quoteBalance, MINT_AIRDROP_QUOTE - MAKER_A_BID_AMOUNT2);

    await settle(provider, taker, rfqPda1, orderPda2, takerAssetATA, takerQuoteATA);
    assetBalance = await getBalance(provider, taker.publicKey, assetToken.publicKey);
    quoteBalance = await getBalance(provider, taker.publicKey, quoteToken.publicKey);
    console.log("Taker asset balance:", assetBalance);
    console.log("Taker quote balance:", quoteBalance);
    assert.equal(assetBalance, MINT_AIRDROP_ASSET - TAKER_ORDER_AMOUNT1);
    assert.equal(quoteBalance, MINT_AIRDROP_QUOTE + MAKER_A_BID_AMOUNT2 - FEE1);
  });

  it("RFQ 2: Taker initializes sell for 10", async () => {
    const orderType = Order.Sell;
    const now = new Date().getTime() / 1_000;
    const expiry = now + 15; // Expires in 15 seconds
    const orderAmount = TAKER_ORDER_AMOUNT2;
    const legs = [
      {
        venue: Venue.Convergence,
        amount: new anchor.BN(TAKER_ORDER_AMOUNT2),
        instrument: Instrument.Spot,
      },
    ];

    const res = await request(
      null,
      assetToken.publicKey,
      taker,
      expiry,
      true,
      legs,
      orderAmount,
      provider,
      quoteToken.publicKey,
      orderType
    );
    rfqPda2 = res.rfqPda;

    const rfqState: any = await program.account.rfqState.fetch(rfqPda2);
    console.log("Order type:", rfqState.orderType);
    console.log("Order amount:", rfqState.orderAmount.toNumber());

    const assetBalance = await getBalance(provider, taker.publicKey, assetToken.publicKey);
    const quoteBalance = await getBalance(provider, taker.publicKey, quoteToken.publicKey);
    console.log("Taker asset balance:", assetBalance);
    console.log("Taker quote balance:", quoteBalance);

    assert.ok(rfqState.authority.toString() === taker.publicKey.toString());
    assert.deepEqual(rfqState.orderType, orderType);
    assert.equal(rfqState.orderAmount.toString(), TAKER_ORDER_AMOUNT2.toString());
    assert.equal(rfqState.expiry.toString(), Math.floor(expiry).toString());
  });

  it("RFQ 2: Maker B and C respond", async () => {
    const res1 = await respond(
      provider,
      makerB,
      rfqPda2,
      MAKER_B_BID_AMOUNT1,
      MAKER_B_ASK_AMOUNT1,
      makerBAssetATA,
      makerBQuoteATA
    );
    orderPda1 = res1.orderPda;

    let rfqState: any = await program.account.rfqState.fetch(rfqPda2);
    console.log("Response 1 best ask:", rfqState.bestAskAmount?.toNumber());
    console.log("Response 1 best bid:", rfqState.bestBidAmount?.toNumber());

    try {
      await respond(
        provider,
        makerB,
        rfqPda2,
        MAKER_B_BID_AMOUNT2,
        MAKER_B_ASK_AMOUNT2,
        makerBAssetATA,
        makerBQuoteATA
      );
      assert.ok(false);
    } catch (err) {
      assert.strictEqual(err.error.errorCode.code, "InvalidQuote");
    }

    assert.equal(rfqState.bestBidAmount?.toString(), MAKER_B_BID_AMOUNT1.toString());

    const res2 = await respond(
      provider,
      makerC,
      rfqPda2,
      MAKER_C_BID_AMOUNT1,
      MAKER_C_ASK_AMOUNT1,
      makerCAssetATA,
      makerCQuoteATA
    );
    orderPda2 = res2.orderPda;

    rfqState = await program.account.rfqState.fetch(rfqPda2);
    console.log("Response 2 best ask:", rfqState.bestAskAmount?.toNumber());
    console.log("Response 2 best bid:", rfqState.bestBidAmount?.toNumber());

    assert.equal(rfqState.bestBidAmount?.toString(), MAKER_C_BID_AMOUNT1.toString());

    const res3 = await respond(
      provider,
      makerC,
      rfqPda2,
      MAKER_C_BID_AMOUNT2,
      MAKER_C_ASK_AMOUNT2,
      makerCAssetATA,
      makerCQuoteATA
    );
    orderPda3 = res3.orderPda;

    rfqState = await program.account.rfqState.fetch(rfqPda2);
    console.log("Response 3 best ask:", rfqState.bestAskAmount?.toNumber());
    console.log("Response 3 best bid:", rfqState.bestBidAmount?.toNumber());

    let assetBalance = await getBalance(provider, makerB.publicKey, assetToken.publicKey);
    let quoteBalance = await getBalance(provider, makerB.publicKey, quoteToken.publicKey);
    console.log("Maker B asset balance:", assetBalance);
    console.log("Maker B quote balance:", quoteBalance);

    assetBalance = await getBalance(provider, makerC.publicKey, assetToken.publicKey);
    quoteBalance = await getBalance(provider, makerC.publicKey, quoteToken.publicKey);
    console.log("Maker C asset balance:", assetBalance);
    console.log("Maker C quote balance:", quoteBalance);

    assert.equal(rfqState.bestBidAmount?.toString(), MAKER_C_BID_AMOUNT1.toString());
  });

  it("RFQ 2: Taker confirms Maker B bid for 410,000", async () => {
    try {
      await confirm(provider, rfqPda2, orderPda1, taker, takerAssetATA, takerQuoteATA, Quote.Bid);
      assert.ok(false);
    } catch (err) {
      assert.strictEqual(err.error.errorCode.code, "InvalidConfirm");
    }

    try {
      await confirm(provider, rfqPda2, orderPda2, taker, takerAssetATA, takerQuoteATA, Quote.Ask);
      assert.ok(false);
    } catch (err) {
      assert.strictEqual(err.error.errorCode.code, "InvalidConfirm");
    }

    await confirm(provider, rfqPda2, orderPda2, taker, takerAssetATA, takerQuoteATA, Quote.Bid);
    const rfqState: any = await program.account.rfqState.fetch(rfqPda2);
    console.log("Best ask:", rfqState.bestAskAmount?.toNumber());
    console.log("Best bid:", rfqState.bestBidAmount?.toNumber());

    let assetBalance = await getBalance(provider, taker.publicKey, assetToken.publicKey);
    let quoteBalance = await getBalance(provider, taker.publicKey, quoteToken.publicKey);
    console.log("Taker asset balance:", assetBalance);
    console.log("Taker quote balance:", quoteBalance);

    assert.equal(assetBalance, MINT_AIRDROP_ASSET - TAKER_ORDER_AMOUNT2 - TAKER_ORDER_AMOUNT1);
    assert.equal(quoteBalance, MINT_AIRDROP_QUOTE + MAKER_A_BID_AMOUNT2 - FEE1);
    assert.ok(rfqState.confirmedOrder);
  });

  it("RFQ 2: Maker B and C last looks", async () => {
    await lastLook(provider, makerC, rfqPda2, orderPda2);

    const rfqState: any = await program.account.rfqState.fetch(rfqPda2);
    assert.equal(rfqState.lastLookApproved, true);
  });

  it("RFQ 2: Maker B and C return collateral", async () => {
    await returnCollateral(provider, makerB, rfqPda2, orderPda1, makerBAssetATA, makerBQuoteATA);
    await returnCollateral(provider, makerC, rfqPda2, orderPda3, makerCAssetATA, makerCQuoteATA);

    try {
      await returnCollateral(provider, makerC, rfqPda2, orderPda2, makerCAssetATA, makerCQuoteATA);
      assert.ok(false);
    } catch (err) {
      assert.strictEqual(err.error.errorCode.code, "NoCollateralToReturn");
    }

    try {
      await returnCollateral(provider, makerC, rfqPda2, orderPda3, makerCAssetATA, makerCQuoteATA);
      assert.ok(false);
    } catch (err) {
      assert.strictEqual(err.error.errorCode.code, "CollateralReturned");
    }

    let assetBalance = await getBalance(provider, taker.publicKey, assetToken.publicKey);
    let quoteBalance = await getBalance(provider, taker.publicKey, quoteToken.publicKey);
    console.log("Taker asset balance:", assetBalance);
    console.log("Taker quote balance:", quoteBalance);

    assetBalance = await getBalance(provider, makerA.publicKey, assetToken.publicKey);
    quoteBalance = await getBalance(provider, makerA.publicKey, quoteToken.publicKey);
    console.log("Maker A asset balance:", assetBalance);
    console.log("Maker A quote balance:", quoteBalance);

    assetBalance = await getBalance(provider, makerB.publicKey, assetToken.publicKey);
    quoteBalance = await getBalance(provider, makerB.publicKey, quoteToken.publicKey);
    console.log("Maker B asset balance:", assetBalance);
    console.log("Maker B quote balance:", quoteBalance);

    assetBalance = await getBalance(provider, makerC.publicKey, assetToken.publicKey);
    quoteBalance = await getBalance(provider, makerC.publicKey, quoteToken.publicKey);
    console.log("Maker C asset balance:", assetBalance);
    console.log("Maker C quote balance:", quoteBalance);
  });

  it("RFQ 2: Taker and Maker B settle", async () => {
    await settle(provider, taker, rfqPda2, orderPda2, takerAssetATA, takerQuoteATA);

    try {
      await settle(provider, makerB, rfqPda2, orderPda2, makerBAssetATA, makerBQuoteATA);
      assert.ok(false);
    } catch (err) {
      assert.strictEqual(err.error.errorCode.code, "InvalidAuthority");
    }

    await settle(provider, makerC, rfqPda2, orderPda2, makerCAssetATA, makerCQuoteATA);

    try {
      await settle(provider, makerC, rfqPda2, orderPda2, makerCAssetATA, makerCQuoteATA);
      assert.ok(false);
    } catch (err) {
      assert.strictEqual(err.error.errorCode.code, "OrderSettled");
    }

    try {
      await settle(provider, taker, rfqPda2, orderPda2, takerAssetATA, takerQuoteATA);
      assert.ok(false);
    } catch (err) {
      assert.strictEqual(err.error.errorCode.code, "RfqSettled");
    }

    let assetBalance = await getBalance(provider, taker.publicKey, assetToken.publicKey);
    let quoteBalance = await getBalance(provider, taker.publicKey, quoteToken.publicKey);
    console.log("Taker asset balance:", assetBalance);
    console.log("Taker quote balance:", quoteBalance);
    assert.equal(assetBalance, MINT_AIRDROP_ASSET - TAKER_ORDER_AMOUNT2 - TAKER_ORDER_AMOUNT1);
    assert.equal(quoteBalance, MINT_AIRDROP_QUOTE + MAKER_A_BID_AMOUNT2 - FEE1 + MAKER_C_BID_AMOUNT1 - FEE2);

    assetBalance = await getBalance(provider, makerB.publicKey, assetToken.publicKey);
    quoteBalance = await getBalance(provider, makerB.publicKey, quoteToken.publicKey);
    console.log("Maker B asset balance:", assetBalance);
    console.log("Maker B quote balance:", quoteBalance);
    assert.equal(assetBalance, MINT_AIRDROP_ASSET);
    assert.equal(quoteBalance, MINT_AIRDROP_QUOTE);

    assetBalance = await getBalance(provider, makerC.publicKey, assetToken.publicKey);
    quoteBalance = await getBalance(provider, makerC.publicKey, quoteToken.publicKey);
    console.log("Maker C asset balance:", assetBalance);
    console.log("Maker C quote balance:", quoteBalance);
    assert.equal(assetBalance, MINT_AIRDROP_ASSET + TAKER_ORDER_AMOUNT2);
    assert.equal(quoteBalance, MINT_AIRDROP_QUOTE - MAKER_C_BID_AMOUNT1);
  });

  it(`RFQ 3: Taker requests buy order for ${TAKER_ORDER_AMOUNT3}, Maker D responds, Taker confirms, both settle`, async () => {
    const requestOrder = Order.Buy;
    const now = new Date().getTime() / 1_000;
    const expiry = now + 3;
    const legs = [
      {
        amount: new anchor.BN(TAKER_ORDER_AMOUNT3),
        instrument: Instrument.Spot,
        venue: Venue.Convergence,
      },
    ];

    const res = await request(
      null,
      assetToken.publicKey,
      taker,
      expiry,
      false,
      legs,
      TAKER_ORDER_AMOUNT3,
      provider,
      quoteToken.publicKey,
      requestOrder
    );
    rfqPda3 = res.rfqPda;

    const res1 = await respond(
      provider,
      makerD,
      rfqPda3,
      MAKER_D_BID_AMOUNT1,
      MAKER_D_ASK_AMOUNT1,
      makerDAssetATA,
      makerDQuoteATA
    );
    const res2 = await respond(
      provider,
      makerD,
      rfqPda3,
      MAKER_D_BID_AMOUNT2,
      MAKER_D_ASK_AMOUNT2,
      makerDAssetATA,
      makerDQuoteATA
    );
    orderPda1 = res1.orderPda;
    orderPda2 = res2.orderPda;

    await confirm(provider, rfqPda3, orderPda2, taker, takerAssetATA, takerQuoteATA, Quote.Ask);
    await returnCollateral(provider, makerD, rfqPda3, orderPda1, makerDAssetATA, makerDQuoteATA);
    await settle(provider, taker, rfqPda3, orderPda2, takerAssetATA, takerQuoteATA);
    await settle(provider, makerD, rfqPda3, orderPda2, makerDAssetATA, makerDQuoteATA);

    let assetBalance = await getBalance(provider, taker.publicKey, assetToken.publicKey);
    let quoteBalance = await getBalance(provider, taker.publicKey, quoteToken.publicKey);
    console.log("Taker asset balance:", assetBalance);
    console.log("Taker quote balance:", quoteBalance);
    assert.equal(
      assetBalance,
      MINT_AIRDROP_ASSET - TAKER_ORDER_AMOUNT2 - TAKER_ORDER_AMOUNT1 + TAKER_ORDER_AMOUNT3 - FEE3
    );
    assert.equal(
      quoteBalance,
      MINT_AIRDROP_QUOTE + MAKER_A_BID_AMOUNT2 - FEE1 + MAKER_C_BID_AMOUNT1 - FEE2 - MAKER_D_ASK_AMOUNT2
    );

    assetBalance = await getBalance(provider, makerD.publicKey, assetToken.publicKey);
    quoteBalance = await getBalance(provider, makerD.publicKey, quoteToken.publicKey);
    console.log("Maker D asset balance:", assetBalance);
    console.log("Maker D quote balance:", quoteBalance);
    assert.equal(assetBalance, MINT_AIRDROP_ASSET - TAKER_ORDER_AMOUNT3);
    assert.equal(quoteBalance, MINT_AIRDROP_QUOTE + MAKER_D_ASK_AMOUNT2);
  });

  it(`RFQ 4: Taker requests two-way for ${TAKER_ORDER_AMOUNT4} but response expires and collateral is returned`, async () => {
    const requestOrder = Order.TwoWay;
    const now = new Date().getTime() / 1_000;
    const expiry = now + 1;
    const legs = [
      {
        amount: new anchor.BN(TAKER_ORDER_AMOUNT4),
        instrument: Instrument.Spot,
        venue: Venue.Convergence,
      },
    ];

    const res = await request(
      null,
      assetToken.publicKey,
      taker,
      expiry,
      false,
      legs,
      TAKER_ORDER_AMOUNT4,
      provider,
      quoteToken.publicKey,
      requestOrder
    );
    rfqPda4 = res.rfqPda;

    let assetBalance = await getBalance(provider, makerD.publicKey, assetToken.publicKey);
    let quoteBalance = await getBalance(provider, makerD.publicKey, quoteToken.publicKey);
    console.log("Maker D asset balance:", assetBalance);
    console.log("Maker D quote balance:", quoteBalance);
    assert.equal(assetBalance, MINT_AIRDROP_ASSET - TAKER_ORDER_AMOUNT3);
    assert.equal(quoteBalance, MINT_AIRDROP_QUOTE + MAKER_D_ASK_AMOUNT2);

    const res1 = await respond(
      provider,
      makerD,
      rfqPda4,
      MAKER_D_BID_AMOUNT3,
      MAKER_D_ASK_AMOUNT3,
      makerDAssetATA,
      makerDQuoteATA
    );
    orderPda1 = res1.orderPda;

    let rfqState: any = await program.account.rfqState.fetch(rfqPda4);
    let orderState: any = await program.account.orderState.fetch(orderPda1);

    console.log("Order bid:", orderState.bid.toNumber());
    console.log("Order ask:", orderState.ask.toNumber());
    assert.ok(!rfqState.settled);

    console.log("Sleeping for 2s...");
    await sleep(3_000);

    try {
      await respond(
        provider,
        makerD,
        rfqPda4,
        MAKER_D_BID_AMOUNT2,
        MAKER_D_ASK_AMOUNT2,
        makerDAssetATA,
        makerDQuoteATA
      );
      assert.ok(false);
    } catch (err) {
      assert.strictEqual(err.error.errorCode.code, "RfqInactive");
    }

    try {
      await confirm(provider, rfqPda4, orderPda1, taker, takerAssetATA, takerQuoteATA, Quote.Ask);
      assert.ok(false);
    } catch (err) {
      assert.strictEqual(err.error.errorCode.code, "RfqInactive");
    }

    try {
      await settle(provider, taker, rfqPda4, orderPda1, takerAssetATA, takerQuoteATA);
      assert.ok(false);
    } catch (err) {
      assert.strictEqual(err.error.errorCode.code, "RfqUnconfirmed");
    }

    assetBalance = await getBalance(provider, makerD.publicKey, assetToken.publicKey);
    quoteBalance = await getBalance(provider, makerD.publicKey, quoteToken.publicKey);
    console.log("Maker D asset balance:", assetBalance);
    console.log("Maker D quote balance:", quoteBalance);
    assert.equal(assetBalance, MINT_AIRDROP_ASSET - TAKER_ORDER_AMOUNT3 - TAKER_ORDER_AMOUNT4);
    assert.equal(quoteBalance, MINT_AIRDROP_QUOTE + MAKER_D_ASK_AMOUNT2 - MAKER_D_BID_AMOUNT3);

    const res2 = await returnCollateral(provider, makerD, rfqPda4, orderPda1, makerDAssetATA, makerDQuoteATA);
    rfqState = await program.account.rfqState.fetch(rfqPda4);
    orderState = await program.account.orderState.fetch(orderPda1);

    console.log("Bid confirmed:", orderState.bidConfirmed);
    console.log("Ask confirmed:", orderState.askConfirmed);
    assert.ok(!rfqState.confirmed);
    assert.ok(!orderState.askConfirmed);
    assert.ok(!orderState.bidConfirmed);

    assetBalance = await getBalance(provider, makerD.publicKey, assetToken.publicKey);
    quoteBalance = await getBalance(provider, makerD.publicKey, quoteToken.publicKey);
    console.log("Maker D asset balance:", assetBalance);
    console.log("Maker D quote balance:", quoteBalance);
    assert.equal(assetBalance, MINT_AIRDROP_ASSET - TAKER_ORDER_AMOUNT3);
    assert.equal(quoteBalance, MINT_AIRDROP_QUOTE + MAKER_D_ASK_AMOUNT2);

    assetBalance = await getBalance(provider, taker.publicKey, assetToken.publicKey);
    quoteBalance = await getBalance(provider, taker.publicKey, quoteToken.publicKey);
    console.log("Taker asset balance:", assetBalance);
    console.log("Taker quote balance:", quoteBalance);
    assert.equal(
      assetBalance,
      MINT_AIRDROP_ASSET - TAKER_ORDER_AMOUNT2 - TAKER_ORDER_AMOUNT1 + TAKER_ORDER_AMOUNT3 - FEE3
    );
    assert.equal(
      quoteBalance,
      MINT_AIRDROP_QUOTE + MAKER_A_BID_AMOUNT2 - FEE1 + MAKER_C_BID_AMOUNT1 - FEE2 - MAKER_D_ASK_AMOUNT2
    );

    const rfqOrders = await getRfqOrders(provider, rfqPda4);
    assert.equal(rfqOrders.length, 1);

    const myOrders = await getMyOrders(provider, makerD.publicKey);
    assert.equal(myOrders.length, 3);
  });

  it(`RFQ 5: Taker requests buy for ${TAKER_ORDER_AMOUNT2} but cancels`, async () => {
    const requestOrder = Order.Buy;
    const now = new Date().getTime() / 1_000;
    const expiry = now + 2;
    const legs = [
      {
        amount: new anchor.BN(TAKER_ORDER_AMOUNT2),
        instrument: Instrument.Spot,
        venue: Venue.Convergence,
      },
    ];

    const res1 = await request(
      null,
      assetToken.publicKey,
      taker,
      expiry,
      false,
      legs,
      TAKER_ORDER_AMOUNT2,
      provider,
      quoteToken.publicKey,
      requestOrder
    );
    rfqPda5 = res1.rfqPda;

    let rfqState: any = await program.account.rfqState.fetch(rfqPda5);
    assert.ok(!rfqState.canceled);

    const res2 = await cancel(provider, taker, rfqPda5);
    rfqState = await program.account.rfqState.fetch(rfqPda5);
    assert.ok(rfqState.canceled);

    try {
      await respond(
        provider,
        makerD,
        rfqPda5,
        MAKER_D_BID_AMOUNT3,
        MAKER_D_ASK_AMOUNT3,
        makerDAssetATA,
        makerDQuoteATA
      );
      assert.ok(false);
    } catch (err) {
      assert.strictEqual(err.error.errorCode.code, "RfqCanceled");
    }
  });

  it("DAO views all RFQs and responses", async () => {
    const rfqs: any = await getRfqs(provider, 1, 10);
    const allOrders = await getAllOrders(provider);
    assert.equal(rfqs.length, 5);
    assert.equal(allOrders.length, 8);
  });
});
