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
let makerAassetToken: PublicKey;
let makerAquoteToken: PublicKey;
let makerBassetToken: PublicKey;
let makerBquoteToken: PublicKey;
let makerCassetToken: PublicKey;
let makerCquoteToken: PublicKey;
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
    mintAuthority = anchor.web3.Keypair.generate();
    marketMakerA = anchor.web3.Keypair.generate();
    marketMakerB = anchor.web3.Keypair.generate();
    marketMakerC = anchor.web3.Keypair.generate();
    taker = anchor.web3.Keypair.generate();

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
    )

    authorityAssetToken = await assetMint.createAssociatedTokenAccount(
      taker.publicKey,
    );
    authorityQuoteToken = await quoteMint.createAssociatedTokenAccount(
      taker.publicKey,
    );
    makerAassetToken = await assetMint.createAssociatedTokenAccount(
      marketMakerA.publicKey,
    );
    makerAquoteToken = await quoteMint.createAssociatedTokenAccount(
      marketMakerA.publicKey,
    );
    makerBassetToken = await assetMint.createAssociatedTokenAccount(
      marketMakerB.publicKey,
    );
    makerBquoteToken = await quoteMint.createAssociatedTokenAccount(
      marketMakerB.publicKey,
    );
    makerCassetToken = await assetMint.createAssociatedTokenAccount(
      marketMakerC.publicKey,
    );
    makerCquoteToken = await quoteMint.createAssociatedTokenAccount(
      marketMakerC.publicKey,
    );

    await quoteMint.mintTo(authorityQuoteToken, mintAuthority.publicKey, [], MINT_AIRDROP);
    await assetMint.mintTo(makerAassetToken, mintAuthority.publicKey, [], MINT_AIRDROP);
    await quoteMint.mintTo(makerAquoteToken, mintAuthority.publicKey, [], MINT_AIRDROP);
    await assetMint.mintTo(makerBassetToken, mintAuthority.publicKey, [], MINT_AIRDROP);
    await quoteMint.mintTo(makerBquoteToken, mintAuthority.publicKey, [], MINT_AIRDROP);
    await assetMint.mintTo(makerCassetToken, mintAuthority.publicKey, [], MINT_AIRDROP);
    await quoteMint.mintTo(makerCquoteToken, mintAuthority.publicKey, [], MINT_AIRDROP);
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
      const { rfqState } = await respond(
        provider,
        marketMakerA,
        rfqId,
        new anchor.BN(0),
        MAKER_A_ASK_AMOUNT,
        makerAassetToken,
        makerAquoteToken
      );
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

    const response1 = await respond(provider, marketMakerA, rfqId, MAKER_A_BID_AMOUNT, MAKER_A_ASK_AMOUNT, makerAassetToken, makerAquoteToken);
    console.log('response 1 two-way ask:', response1.rfqState.bestAskAmount.toString());
    console.log('response 1 two-way bid:', response1.rfqState.bestBidAmount.toString());

    const response2 = await respond(provider, marketMakerB, rfqId, MAKER_B_BID_AMOUNT, MAKER_B_ASK_AMOUNT, makerBassetToken, makerBquoteToken);
    console.log('response 2 two-way ask:', response2.rfqState.bestAskAmount.toString());
    console.log('response 2 two-way bid:', response2.rfqState.bestBidAmount.toString());

    const response3 = await respond(provider, marketMakerC, rfqId, MAKER_C_BID_AMOUNT, MAKER_C_ASK_AMOUNT, makerCassetToken, makerCquoteToken);
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

    await returnCollateral(provider, taker, rfqId, 0, makerAassetToken, authorityQuoteToken);
    await returnCollateral(provider, marketMakerA, rfqId, 1, makerAassetToken, makerAquoteToken);
    await returnCollateral(provider, marketMakerB, rfqId, 2, makerBassetToken, makerBquoteToken);
    await returnCollateral(provider, marketMakerC, rfqId, 3, makerCassetToken, makerCquoteToken);

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
    await settle(provider, marketMakerA, rfqId, 1, makerAassetToken, makerAquoteToken);
    await settle(provider, marketMakerB, rfqId, 2, makerBassetToken, makerBquoteToken);

    const takerAssetBalance = await getBalance(provider, taker, assetMint.publicKey);
    const takerQuoteBalance = await getBalance(provider, taker, quoteMint.publicKey);

    const makerAassetBalance = await getBalance(provider, marketMakerA, assetMint.publicKey);
    const makerAquoteBalance = await getBalance(provider, marketMakerA, quoteMint.publicKey);
    const makerBassetBalance = await getBalance(provider, marketMakerB, assetMint.publicKey);
    const makerBquoteBalance = await getBalance(provider, marketMakerB, quoteMint.publicKey);
    const makerCassetBalance = await getBalance(provider, marketMakerC, assetMint.publicKey);
    const makerCquoteBalance = await getBalance(provider, marketMakerC, quoteMint.publicKey);

    assert.equal(makerAassetBalance, MINT_AIRDROP);
    assert.equal(makerAquoteBalance, MINT_AIRDROP);
    assert.equal(makerBassetBalance, MINT_AIRDROP - TAKER_ORDER_AMOUNT.toNumber());
    assert.equal(makerBquoteBalance, MINT_AIRDROP + MAKER_B_ASK_AMOUNT.toNumber());

    console.log('taker asset balance:', takerAssetBalance);
    console.log('taker quote balance:', takerQuoteBalance);
    console.log('maker A asset balance:', makerAassetBalance);
    console.log('maker A quote balance:', makerAquoteBalance);
    console.log('maker B asset balance:', makerBassetBalance);
    console.log('maker B quote balance:', makerBquoteBalance);
    console.log('maker C asset balance:', makerCassetBalance);
    console.log('maker C quote balance:', makerCquoteBalance);
  });

  it('View RFQs', async () => {
    const rfqs = await getRfqs(provider);
    assert.ok(rfqs.length === 2);
  });
});