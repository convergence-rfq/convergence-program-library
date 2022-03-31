/** 
  * RFQ Tests
  * 
  * Taker wants to quote 10 MNGO tokens in USDC
  * 
  * Maker A makes one-way market, 10 MNGO at 100/x USDC, deposits 100 USDC as collateral
  * Maker B makes two-way market, 10 MNGO at 105/110 USDC, deposits 105 USDC and 110 USDC as collateral
  * Maker C makes two-way market, 10 MGNO at 90/120 USDC, deposits 90 USDC and 120 USDC as collateral
  * 
  * Taker reveals he wants to buy 10 MNGO
  * Maker B is winner at 110
  * Taker deposits 110 USDC as collateral
  * 
  * Return collateral:
  * - A gets 100 USDC back
  * - B gets 105 USDC back
  * - C gets 90 USDC and 120 USDC back
  * 
  * Last look:
  * - Set to true
  * 
  * Settle:
  * - Taker gets 10 MNGO
  * - Maker B gets 110 USDC
  * 
  * TODO:
  * - [ ] Add direction of order in respond, right now assumes it knows direction of request
  * - [ ] Fees
  */

import * as anchor from '@project-serum/anchor';
import * as assert from 'assert';
import { Token, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Keypair, PublicKey } from "@solana/web3.js";

import {
  Instrument,
  Order,
  confirm,
  getBalance,
  getRfqs,
  initializeProtocol,
  lastLook,
  respond,
  returnCollateral,
  program,
  request,
  requestAirdrop,
  settle,
} from '../lib/helpers';

let assetMint: Token;
let quoteMint: Token;
let authorityAssetToken: PublicKey;
let authorityQuoteToken: PublicKey;
let makerAAssetToken: PublicKey;
let makerAQuoteToken: PublicKey;
let makerBAssetToken: PublicKey;
let makerBQuoteToken: PublicKey;
let makerCAssetToken: PublicKey;
let makerCQuoteToken: PublicKey;
let mintAuthority: Keypair;
let marketMakerA: Keypair;
let marketMakerB: Keypair;
let marketMakerC: Keypair;
let taker: Keypair;

const TAKER_ORDER_AMOUNT = new anchor.BN(10); // Order to buy 10 asset tokens for XX? quote tokens
const MAKER_A_ASK_AMOUNT = new anchor.BN(120);
const MAKER_A_BID_AMOUNT = new anchor.BN(0);
const MAKER_B_ASK_AMOUNT = new anchor.BN(110); // Winning maker
const MAKER_B_BID_AMOUNT = new anchor.BN(105);
const MAKER_C_ASK_AMOUNT = new anchor.BN(120);
const MAKER_C_BID_AMOUNT = new anchor.BN(90);
const MINT_AIRDROP = 100_000;

anchor.setProvider(anchor.Provider.env());

const provider = anchor.getProvider();

describe('rfq', () => {
  before(async () => {
    mintAuthority = Keypair.generate();
    marketMakerA = Keypair.generate();
    marketMakerB = Keypair.generate();
    marketMakerC = Keypair.generate();
    taker = Keypair.generate();

    await requestAirdrop(provider, taker.publicKey, 10_000_000_000);
    await requestAirdrop(provider, mintAuthority.publicKey, 10_000_000_000);
    await requestAirdrop(provider, marketMakerA.publicKey, 10_000_000_000);
    await requestAirdrop(provider, marketMakerB.publicKey, 10_000_000_000);
    await requestAirdrop(provider, marketMakerC.publicKey, 10_000_000_000);

    const walletBalance = await provider.connection.getBalance(taker.publicKey);
    console.log('taker wallet balance:', walletBalance);

    const mintAuthorityBalance = await provider.connection.getBalance(mintAuthority.publicKey);
    console.log('mint wallet balance:', mintAuthorityBalance);

    assetMint = await Token.createMint(program.provider.connection,
      mintAuthority,
      mintAuthority.publicKey,
      mintAuthority.publicKey,
      0,
      TOKEN_PROGRAM_ID
    );

    quoteMint = await Token.createMint(program.provider.connection,
      mintAuthority,
      mintAuthority.publicKey,
      mintAuthority.publicKey,
      0,
      TOKEN_PROGRAM_ID
    );

    authorityAssetToken = await assetMint.createAssociatedTokenAccount(taker.publicKey);
    authorityQuoteToken = await quoteMint.createAssociatedTokenAccount(taker.publicKey);
    makerAAssetToken = await assetMint.createAssociatedTokenAccount(marketMakerA.publicKey);
    makerAQuoteToken = await quoteMint.createAssociatedTokenAccount(marketMakerA.publicKey);
    makerBAssetToken = await assetMint.createAssociatedTokenAccount(marketMakerB.publicKey);
    makerBQuoteToken = await quoteMint.createAssociatedTokenAccount(marketMakerB.publicKey);
    makerCAssetToken = await assetMint.createAssociatedTokenAccount(marketMakerC.publicKey);
    makerCQuoteToken = await quoteMint.createAssociatedTokenAccount(marketMakerC.publicKey);

    await quoteMint.mintTo(authorityQuoteToken, mintAuthority.publicKey, [], MINT_AIRDROP);
    await assetMint.mintTo(makerAAssetToken, mintAuthority.publicKey, [], MINT_AIRDROP);
    await quoteMint.mintTo(makerAQuoteToken, mintAuthority.publicKey, [], MINT_AIRDROP);
    await assetMint.mintTo(makerBAssetToken, mintAuthority.publicKey, [], MINT_AIRDROP);
    await quoteMint.mintTo(makerBQuoteToken, mintAuthority.publicKey, [], MINT_AIRDROP);
    await assetMint.mintTo(makerCAssetToken, mintAuthority.publicKey, [], MINT_AIRDROP);
    await quoteMint.mintTo(makerCQuoteToken, mintAuthority.publicKey, [], MINT_AIRDROP);
  });

  it('DAO initializes protocol', async () => {
    const feeDenominator = 1_000;
    const feeNumerator = 0;
    const { protocolState } = await initializeProtocol(provider, taker, feeDenominator, feeNumerator);
    assert.ok(protocolState.rfqCount.eq(new anchor.BN(0)));
    assert.ok(protocolState.accessManagerCount.eq(new anchor.BN(0)));
  });

  it('Maker initializes RFQ 1', async () => {
    const requestOrder = Order.Buy;
    const instrument = Instrument.Spot;
    const expiry = new anchor.BN(-1);
    const amount = TAKER_ORDER_AMOUNT;
    const { rfqState, protocolState } = await request(amount, assetMint, taker, expiry, instrument, provider, quoteMint, requestOrder);
    assert.ok(rfqState.id.eq(new anchor.BN(1)));
    assert.ok(protocolState.rfqCount.eq(new anchor.BN(1)));
  });

  it('Maker responds to RFQ 1 and times out', async () => {
    setTimeout(() => {
      console.log('delay of 500ms');
    }, 500);

    const rfqId = 1;

    try {
      const { rfqState } = await respond(provider, marketMakerA, rfqId, new anchor.BN(0), MAKER_A_ASK_AMOUNT, makerAAssetToken, makerAQuoteToken);
      console.log('time delay:', rfqState.timeResponse - rfqState.timeBegin);
    } catch (err) {
      console.log('response timeout');
    }
  });

  it('Taker initializes RFQ 2', async () => {
    const requestOrder = Order.Buy;
    const instrument = Instrument.Spot;
    const expiry = new anchor.BN(1_000);
    const amount = TAKER_ORDER_AMOUNT;

    const { rfqState, protocolState } = await request(amount, assetMint, taker, expiry, instrument, provider, quoteMint, requestOrder);
    assert.equal(rfqState.expired, false);
    assert.deepEqual(rfqState.requestOrder, requestOrder);
    assert.deepEqual(rfqState.instrument, instrument);
    assert.equal(rfqState.expiry.toString(), expiry.toString());
    assert.equal(rfqState.orderAmount.toString(), TAKER_ORDER_AMOUNT.toString());
    assert.equal(protocolState.rfqCount.toNumber(), 2);

    const assetMintBalance = await getBalance(provider, taker, assetMint.publicKey);
    const quoteMintBalance = await getBalance(provider, taker, quoteMint.publicKey);

    console.log('taker order:', rfqState.requestOrder);
    console.log('taker amount:', rfqState.orderAmount.toString());
    console.log('taker asset balance:', assetMintBalance);
    console.log('taker quote balance:', quoteMintBalance);
  });

  it('Maker responds to RFQ 2', async () => {
    const rfqId = 2;

    const response1 = await respond(provider, marketMakerA, rfqId, MAKER_A_BID_AMOUNT, MAKER_A_ASK_AMOUNT, makerAAssetToken, makerAQuoteToken);
    console.log('response 1 two-way ask:', response1.rfqState.bestAskAmount.toString());
    console.log('response 1 two-way bid:', response1.rfqState.bestBidAmount.toString());

    const response2 = await respond(provider, marketMakerB, rfqId, MAKER_B_BID_AMOUNT, MAKER_B_ASK_AMOUNT, makerBAssetToken, makerBQuoteToken);
    console.log('response 2 two-way ask:', response2.rfqState.bestAskAmount.toString());
    console.log('response 2 two-way bid:', response2.rfqState.bestBidAmount.toString());

    const response3 = await respond(provider, marketMakerC, rfqId, MAKER_C_BID_AMOUNT, MAKER_C_ASK_AMOUNT, makerCAssetToken, makerCQuoteToken);
    console.log('response 3 two-way ask:', response3.rfqState.bestAskAmount.toString());
    console.log('response 3 two-way bid:', response3.rfqState.bestBidAmount.toString());

    const makerAassetBalance = await getBalance(provider, marketMakerA, assetMint.publicKey);
    const makerAquoteBalance = await getBalance(provider, marketMakerA, quoteMint.publicKey);
    console.log('maker A asset balance:', makerAassetBalance);
    console.log('maker A quote balance:', makerAquoteBalance);

    const makerBassetBalance = await getBalance(provider, marketMakerB, assetMint.publicKey);
    const makerBquoteBalance = await getBalance(provider, marketMakerB, quoteMint.publicKey);
    console.log('maker B asset balance:', makerBassetBalance);
    console.log('maker B quote balance:', makerBquoteBalance);

    const makerCassetBalance = await getBalance(provider, marketMakerC, assetMint.publicKey);
    const makerCquoteBalance = await getBalance(provider, marketMakerC, quoteMint.publicKey);
    console.log('maker C asset balance:', makerCassetBalance);
    console.log('maker C quote balance:', makerCquoteBalance);

    assert.equal(response1.rfqState.bestAskAmount.toString(), MAKER_A_ASK_AMOUNT.toString());
    assert.equal(response3.rfqState.bestAskAmount.toString(), MAKER_B_ASK_AMOUNT.toString());
    assert.equal(response3.rfqState.bestBidAmount.toString(), MAKER_B_BID_AMOUNT.toString());
  });

  it('Taker confirms RFQ 2 price pre-settlement', async () => {
    const rfqId = 2;
    const confirmOrder = Order.Buy;

    const { rfqState } = await confirm(provider, rfqId, confirmOrder, taker, authorityAssetToken, authorityQuoteToken);
    console.log('best ask confirmation:', rfqState.bestAskAmount.toNumber());
    console.log('best bid confirmation:', rfqState.bestBidAmount.toNumber());

    const assetMintBalance = await getBalance(provider, taker, assetMint.publicKey);
    const quoteMintBalance = await getBalance(provider, taker, quoteMint.publicKey);

    console.log('taker asset balance confirmation:', assetMintBalance);
    console.log('taker quote balance confirmation:', quoteMintBalance);

    assert.equal(assetMintBalance, 0);
    assert.equal(quoteMintBalance, 100_000 - MAKER_B_ASK_AMOUNT.toNumber());
    assert.equal(rfqState.confirmed, true);
  });

  it('Maker last look for RFQ 2', async () => {
    const rfqId = 2;

    const response1 = await lastLook(provider, marketMakerA, rfqId, 1);
    const response2 = await lastLook(provider, marketMakerB, rfqId, 2);
    const response3 = await lastLook(provider, marketMakerC, rfqId, 3);

    console.log('best ask approved:', response1.rfqState.bestAskAmount.toString());
    console.log('best bid approved:', response2.rfqState.bestBidAmount.toString());
    console.log('confirm order:', response3.rfqState.confirmOrder.toString());

    assert.equal(response1.rfqState.approved, false);
    assert.equal(response2.rfqState.approved, true);
    assert.equal(response3.rfqState.approved, true);
  });

  it('Miner returns collateral for RFQ 2', async () => {
    const rfqId = 2;

    await returnCollateral(provider, taker, rfqId, 0, makerAAssetToken, authorityQuoteToken);
    await returnCollateral(provider, marketMakerA, rfqId, 1, makerAAssetToken, makerAQuoteToken);
    await returnCollateral(provider, marketMakerB, rfqId, 2, makerBAssetToken, makerBQuoteToken);
    await returnCollateral(provider, marketMakerC, rfqId, 3, makerCAssetToken, makerCQuoteToken);

    const takerAassetBalance = await getBalance(provider, taker, assetMint.publicKey);
    const takerAquoteBalance = await getBalance(provider, taker, quoteMint.publicKey);
    console.log('taker asset collateral balance:', takerAassetBalance);
    console.log('taker quote collateral balance:', takerAquoteBalance);

    const makerAassetBalance = await getBalance(provider, marketMakerA, assetMint.publicKey);
    const makerAquoteBalance = await getBalance(provider, marketMakerA, quoteMint.publicKey);
    console.log('maker A asset collateral balance:', makerAassetBalance);
    console.log('maker A quote collateral balance:', makerAquoteBalance);

    const makerBassetBalance = await getBalance(provider, marketMakerB, assetMint.publicKey);
    const makerBquoteBalance = await getBalance(provider, marketMakerB, quoteMint.publicKey);
    console.log('maker B asset collateral balance:', makerBassetBalance);
    console.log('maker B quote collateral balance:', makerBquoteBalance);

    const makerCassetBalance = await getBalance(provider, marketMakerC, assetMint.publicKey);
    const makerCquoteBalance = await getBalance(provider, marketMakerC, quoteMint.publicKey);
    console.log('maker C asset collateral balance:', makerCassetBalance);
    console.log('maker C quote collateral balance:', makerCquoteBalance);
  });

  it('Miner settles RFQ 2', async () => {
    const rfqId = 2;

    await settle(provider, taker, rfqId, 0, authorityAssetToken, authorityQuoteToken);
    await settle(provider, marketMakerA, rfqId, 1, makerAAssetToken, makerAQuoteToken);
    await settle(provider, marketMakerB, rfqId, 2, makerBAssetToken, makerBQuoteToken);

    const takerAssetBalance = await getBalance(provider, taker, assetMint.publicKey);
    const takerQuoteBalance = await getBalance(provider, taker, quoteMint.publicKey);

    const makerAAssetBalance = await getBalance(provider, marketMakerA, assetMint.publicKey);
    const makerAQuoteBalance = await getBalance(provider, marketMakerA, quoteMint.publicKey);
    const makerBAssetBalance = await getBalance(provider, marketMakerB, assetMint.publicKey);
    const makerBQuoteBalance = await getBalance(provider, marketMakerB, quoteMint.publicKey);
    const makerCAssetBalance = await getBalance(provider, marketMakerC, assetMint.publicKey);
    const makerCQuoteBalance = await getBalance(provider, marketMakerC, quoteMint.publicKey);

    assert.equal(makerAAssetBalance, MINT_AIRDROP);
    assert.equal(makerAQuoteBalance, MINT_AIRDROP);
    assert.equal(makerBAssetBalance, MINT_AIRDROP - TAKER_ORDER_AMOUNT.toNumber());
    assert.equal(makerBQuoteBalance, MINT_AIRDROP + MAKER_B_ASK_AMOUNT.toNumber());

    console.log('taker asset balance:', takerAssetBalance);
    console.log('taker quote balance:', takerQuoteBalance);
    console.log('maker A asset balance:', makerAAssetBalance);
    console.log('maker A quote balance:', makerAQuoteBalance);
    console.log('maker B asset balance:', makerBAssetBalance);
    console.log('maker B quote balance:', makerBQuoteBalance);
    console.log('maker C asset balance:', makerCAssetBalance);
    console.log('maker C quote balance:', makerCQuoteBalance);
  });

  it('View RFQs', async () => {
    const rfqs = await getRfqs(provider);
    assert.ok(rfqs.length === 2);
  });
});