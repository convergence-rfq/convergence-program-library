/** 
  * RFQ Specification
  * 
  * Step 1: Requests:
  * - Taker wants an asset quote for one or two-way market
  * 
  * Step 2: Responds:
  * - Maker submits one or two-way order and deposits collateral
  * 
  * Step 3: Confirms:
  * - Taker confirms response by depositing collateral
  * 
  * Optional: Last look:
  * - Set to false
  * 
  * Step 4: Returns collateral:
  * - Unconfirmed maker orders get collateral returned
  * 
  * Step 5: Settle:
  * - Taker receives quote
  * - Maker receives asset
  */

import * as anchor from '@project-serum/anchor'
import { Wallet } from '@project-serum/anchor'
import * as assert from 'assert'
import { Token, TOKEN_PROGRAM_ID } from "@solana/spl-token"
import { Keypair, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js"

import {
  Instrument,
  Order,
  Quote,
  Venue,
  confirm,
  getBalance,
  calcFee,
  getRFQs,
  getProgram,
  getResponses,
  initializeProtocol,
  lastLook,
  respond,
  returnCollateral,
  request,
  requestAirdrop,
  setFee,
  settle,
} from '../lib/helpers'
import { Program } from '@project-serum/anchor'

let assetToken: Token
let quoteToken: Token

const MINT_AIRDROP = 1_000_000

const ASSET_DECIMALS = 6
const QUOTE_DECIMALS = 2

const FEE_NUMERATOR = 1
const FEE_DENOMINATOR = 1_000

const TAKER_ORDER_AMOUNT1 = 1
const TAKER_ORDER_AMOUNT2 = 10
const TAKER_ORDER_AMOUNT3 = 2

const MAKER_A_ASK_AMOUNT1 = 41_000 * TAKER_ORDER_AMOUNT1
const MAKER_A_BID_AMOUNT1 = 39_100 * TAKER_ORDER_AMOUNT1
const MAKER_A_ASK_AMOUNT2 = 41_100 * TAKER_ORDER_AMOUNT1
const MAKER_A_BID_AMOUNT2 = 39_200 * TAKER_ORDER_AMOUNT1 // Sell winner
const MAKER_B_ASK_AMOUNT1 = null
const MAKER_B_BID_AMOUNT1 = 40_000 * TAKER_ORDER_AMOUNT2
const MAKER_B_ASK_AMOUNT2 = 42_000 * TAKER_ORDER_AMOUNT2
const MAKER_B_BID_AMOUNT2 = 41_000 * TAKER_ORDER_AMOUNT2 // Invalid
const MAKER_C_ASK_AMOUNT1 = null
const MAKER_C_BID_AMOUNT1 = 41_100 * TAKER_ORDER_AMOUNT2 // Sell winner
const MAKER_C_ASK_AMOUNT2 = null
const MAKER_C_BID_AMOUNT2 = 39_000 * TAKER_ORDER_AMOUNT2
const MAKER_D_ASK_AMOUNT1 = 39_500 * TAKER_ORDER_AMOUNT2
const MAKER_D_BID_AMOUNT1 = null
const MAKER_D_ASK_AMOUNT2 = 39_000 * TAKER_ORDER_AMOUNT3 // Buy winner
const MAKER_D_BID_AMOUNT2 = null

const FEE1 = calcFee(MAKER_A_BID_AMOUNT1, QUOTE_DECIMALS, FEE_NUMERATOR, FEE_DENOMINATOR)
const FEE2 = calcFee(MAKER_C_BID_AMOUNT1, QUOTE_DECIMALS, FEE_NUMERATOR, FEE_DENOMINATOR)
const FEE3 = calcFee(MAKER_D_ASK_AMOUNT2, ASSET_DECIMALS, FEE_NUMERATOR, FEE_DENOMINATOR)

let daoAssetATA: PublicKey
let daoQuoteATA: PublicKey
let takerAssetATA: PublicKey
let takerQuoteATA: PublicKey
let makerAAssetATA: PublicKey
let makerAQuoteATA: PublicKey
let makerBAssetATA: PublicKey
let makerBQuoteATA: PublicKey
let makerCAssetATA: PublicKey
let makerCQuoteATA: PublicKey
let makerDAssetATA: PublicKey
let makerDQuoteATA: PublicKey

let mintAuthority: Wallet
let dao: Wallet
let bot: Wallet
let taker: Wallet
let makerA: Wallet
let makerB: Wallet
let makerC: Wallet
let makerD: Wallet

anchor.setProvider(anchor.AnchorProvider.env())

const provider = anchor.getProvider()
let program: Program

const sleep = (ms: number) => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

describe('RFQ Specification', () => {
  before(async () => {
    program = await getProgram(provider)

    mintAuthority = new Wallet(Keypair.generate())
    dao = new Wallet(Keypair.generate())
    taker = new Wallet(Keypair.generate())
    bot = new Wallet(Keypair.generate())
    makerA = new Wallet(Keypair.generate())
    makerB = new Wallet(Keypair.generate())
    makerC = new Wallet(Keypair.generate())
    makerD = new Wallet(Keypair.generate())

    await requestAirdrop(provider, mintAuthority.publicKey, LAMPORTS_PER_SOL * 10)
    await requestAirdrop(provider, dao.publicKey, LAMPORTS_PER_SOL * 10)
    await requestAirdrop(provider, taker.publicKey, LAMPORTS_PER_SOL * 10)
    await requestAirdrop(provider, bot.publicKey, LAMPORTS_PER_SOL * 10)
    await requestAirdrop(provider, makerA.publicKey, LAMPORTS_PER_SOL * 10)
    await requestAirdrop(provider, makerB.publicKey, LAMPORTS_PER_SOL * 10)
    await requestAirdrop(provider, makerC.publicKey, LAMPORTS_PER_SOL * 10)
    await requestAirdrop(provider, makerD.publicKey, LAMPORTS_PER_SOL * 10)

    const takerBalance = await provider.connection.getBalance(taker.publicKey)
    console.log('Taker SOL balance:', takerBalance)

    const mintAuthorityBalance = await provider.connection.getBalance(mintAuthority.publicKey)
    console.log('Mint authority SOL balance:', mintAuthorityBalance)

    assetToken = await Token.createMint(program.provider.connection,
      mintAuthority.payer,
      mintAuthority.publicKey,
      mintAuthority.publicKey,
      ASSET_DECIMALS,
      TOKEN_PROGRAM_ID
    )
    quoteToken = await Token.createMint(program.provider.connection,
      mintAuthority.payer,
      mintAuthority.publicKey,
      mintAuthority.publicKey,
      QUOTE_DECIMALS,
      TOKEN_PROGRAM_ID
    )

    daoAssetATA = await assetToken.createAssociatedTokenAccount(dao.publicKey)
    takerAssetATA = await assetToken.createAssociatedTokenAccount(taker.publicKey)
    makerAAssetATA = await assetToken.createAssociatedTokenAccount(makerA.publicKey)
    makerBAssetATA = await assetToken.createAssociatedTokenAccount(makerB.publicKey)
    makerCAssetATA = await assetToken.createAssociatedTokenAccount(makerC.publicKey)
    makerDAssetATA = await assetToken.createAssociatedTokenAccount(makerD.publicKey)

    daoQuoteATA = await quoteToken.createAssociatedTokenAccount(dao.publicKey)
    takerQuoteATA = await quoteToken.createAssociatedTokenAccount(taker.publicKey)
    makerAQuoteATA = await quoteToken.createAssociatedTokenAccount(makerA.publicKey)
    makerBQuoteATA = await quoteToken.createAssociatedTokenAccount(makerB.publicKey)
    makerCQuoteATA = await quoteToken.createAssociatedTokenAccount(makerC.publicKey)
    makerDQuoteATA = await quoteToken.createAssociatedTokenAccount(makerD.publicKey)

    await assetToken.mintTo(takerAssetATA, mintAuthority.publicKey, [], MINT_AIRDROP)
    await assetToken.mintTo(makerAAssetATA, mintAuthority.publicKey, [], MINT_AIRDROP)
    await assetToken.mintTo(makerBAssetATA, mintAuthority.publicKey, [], MINT_AIRDROP)
    await assetToken.mintTo(makerCAssetATA, mintAuthority.publicKey, [], MINT_AIRDROP)
    await assetToken.mintTo(makerDAssetATA, mintAuthority.publicKey, [], MINT_AIRDROP)

    await quoteToken.mintTo(takerQuoteATA, mintAuthority.publicKey, [], MINT_AIRDROP)
    await quoteToken.mintTo(makerAQuoteATA, mintAuthority.publicKey, [], MINT_AIRDROP)
    await quoteToken.mintTo(makerBQuoteATA, mintAuthority.publicKey, [], MINT_AIRDROP)
    await quoteToken.mintTo(makerCQuoteATA, mintAuthority.publicKey, [], MINT_AIRDROP)
    await quoteToken.mintTo(makerDQuoteATA, mintAuthority.publicKey, [], MINT_AIRDROP)
  })

  it('DAO initializes protocol with 0bps fee', async () => {
    const { protocolState } = await initializeProtocol(provider, dao, FEE_DENOMINATOR, 0)
    assert.ok(protocolState.feeDenominator.eq(new anchor.BN(FEE_DENOMINATOR)))
    assert.ok(protocolState.feeNumerator.eq(new anchor.BN(0)))
    assert.ok(protocolState.rfqCount.eq(new anchor.BN(0)))
    assert.ok(protocolState.accessManagerCount.eq(new anchor.BN(0)))
  })

  it(`DAO sets ${FEE_NUMERATOR}bps protocol fee`, async () => {
    const { protocolState } = await setFee(provider, dao, FEE_DENOMINATOR, FEE_NUMERATOR)
    assert.ok(protocolState.feeDenominator.eq(new anchor.BN(FEE_DENOMINATOR)))
    assert.ok(protocolState.feeNumerator.eq(new anchor.BN(FEE_NUMERATOR)))
    assert.ok(protocolState.rfqCount.eq(new anchor.BN(0)))
    assert.ok(protocolState.accessManagerCount.eq(new anchor.BN(0)))
  })

  it(`RFQ 1: Taker requests two-way asset quote for ${TAKER_ORDER_AMOUNT1}`, async () => {
    const requestOrder = Order.TwoWay
    const now = (new Date()).getTime() / 1_000
    const expiry = now + 1.5 // Expires in 1.5 seconds
    const legs = [{
      amount: new anchor.BN(TAKER_ORDER_AMOUNT1),
      instrument: Instrument.Spot,
      venue: Venue.Convergence,
    }]

    const res = await request(assetToken.publicKey, taker, expiry, false, legs, TAKER_ORDER_AMOUNT1, provider, quoteToken.publicKey, requestOrder)
    assert.ok(res.rfqState.id.eq(new anchor.BN(1)))
    assert.ok(res.rfqState.authority.toString() === taker.publicKey.toString())
    assert.ok(res.protocolState.rfqCount.eq(new anchor.BN(1)))
  })

  it('RFQ 1: Maker A responds to two-way request then Taker confirms best bid', async () => {
    const rfqId = 1

    await respond(provider, makerA, rfqId, MAKER_A_BID_AMOUNT1, MAKER_A_ASK_AMOUNT1, makerAAssetATA, makerAQuoteATA)
    await respond(provider, makerA, rfqId, MAKER_A_BID_AMOUNT2, MAKER_A_ASK_AMOUNT2, makerAAssetATA, makerAQuoteATA)

    let assetBalance = await getBalance(provider, taker, assetToken.publicKey)
    let quoteBalance = await getBalance(provider, taker, quoteToken.publicKey)
    console.log('Taker asset balance:', assetBalance)
    console.log('Taker quote balance:', quoteBalance)

    try {
      await confirm(provider, rfqId, 1, taker, takerAssetATA, takerQuoteATA, Quote.Bid)
    } catch (err) {
      assert.strictEqual(err.error.errorCode.code, 'InvalidConfirm')
    }

    const { rfqState, orderState } = await confirm(provider, rfqId, 2, taker, takerAssetATA, takerQuoteATA, Quote.Bid)
    console.log('Order confirmed quote:', orderState.confirmedQuote)
    console.log('Best ask:', rfqState.bestAskAmount?.toNumber())
    console.log('Best bid:', rfqState.bestBidAmount?.toNumber())

    try {
      await confirm(provider, rfqId, 1, taker, takerAssetATA, takerQuoteATA, Quote.Bid)
      assert.ok(false)
    } catch (err) {
      assert.strictEqual(err.error.errorCode.code, 'RfqConfirmed')
    }

    console.log('Sleeping 1.5s...')
    await sleep(1_500)

    try {
      await respond(provider, makerA, rfqId, MAKER_A_BID_AMOUNT1, MAKER_A_ASK_AMOUNT1, makerAAssetATA, makerAQuoteATA)
      assert.ok(false)
    } catch (err) {
      assert.strictEqual(err.error.errorCode.code, 'RfqInactiveOrConfirmed')
    }

    assetBalance = await getBalance(provider, taker, assetToken.publicKey)
    quoteBalance = await getBalance(provider, taker, quoteToken.publicKey)
    console.log('Taker asset balance:', assetBalance)
    console.log('Taker quote balance:', quoteBalance)
    assert.equal(assetBalance, MINT_AIRDROP - TAKER_ORDER_AMOUNT1)
    assert.equal(quoteBalance, MINT_AIRDROP)

    assetBalance = await getBalance(provider, makerA, assetToken.publicKey)
    quoteBalance = await getBalance(provider, makerA, quoteToken.publicKey)
    console.log('Maker A asset balance:', assetBalance)
    console.log('Maker A quote balance:', quoteBalance)
    assert.equal(assetBalance, MINT_AIRDROP - TAKER_ORDER_AMOUNT1 - TAKER_ORDER_AMOUNT1)
    assert.equal(quoteBalance, MINT_AIRDROP - MAKER_A_BID_AMOUNT1 - MAKER_A_BID_AMOUNT2)

    assert.equal(rfqState.confirmed, true)
  })

  it('RFQ 1: Taker and Maker A return collateral then settle', async () => {
    const rfqId = 1

    await returnCollateral(provider, makerA, rfqId, 1, makerAAssetATA, makerAQuoteATA)
    await returnCollateral(provider, makerA, rfqId, 2, makerAAssetATA, makerAQuoteATA)
    let assetBalance = await getBalance(provider, makerA, assetToken.publicKey)
    let quoteBalance = await getBalance(provider, makerA, quoteToken.publicKey)
    console.log('Maker A asset balance:', assetBalance)
    console.log('Maker A quote balance:', quoteBalance)
    assert.equal(assetBalance, MINT_AIRDROP)
    assert.equal(quoteBalance, MINT_AIRDROP - MAKER_A_BID_AMOUNT2)

    await settle(provider, makerA, rfqId, 2, makerAAssetATA, makerAQuoteATA)
    assetBalance = await getBalance(provider, makerA, assetToken.publicKey)
    quoteBalance = await getBalance(provider, makerA, quoteToken.publicKey)
    console.log('Maker A asset balance:', assetBalance)
    console.log('Maker A quote balance:', quoteBalance)
    assert.equal(assetBalance, MINT_AIRDROP + TAKER_ORDER_AMOUNT1)
    assert.equal(quoteBalance, MINT_AIRDROP - MAKER_A_BID_AMOUNT2)

    await settle(provider, taker, rfqId, 2, takerAssetATA, takerQuoteATA)
    assetBalance = await getBalance(provider, taker, assetToken.publicKey)
    quoteBalance = await getBalance(provider, taker, quoteToken.publicKey)
    console.log('Taker asset balance:', assetBalance)
    console.log('Taker quote balance:', quoteBalance)
    assert.equal(assetBalance, MINT_AIRDROP - TAKER_ORDER_AMOUNT1)
    assert.equal(quoteBalance, MINT_AIRDROP + MAKER_A_BID_AMOUNT2 - FEE1)
  })

  it('RFQ 2: Taker initializes sell for 10', async () => {
    const orderType = Order.Sell
    const now = (new Date()).getTime() / 1_000
    const expiry = now + 15 // Expires in 15 seconds
    const orderAmount = TAKER_ORDER_AMOUNT2
    const legs = [{
      venue: Venue.Convergence,
      amount: new anchor.BN(TAKER_ORDER_AMOUNT2),
      instrument: Instrument.Spot,
    }]

    const { rfqState, protocolState } = await request(assetToken.publicKey, taker, expiry, true, legs, orderAmount, provider, quoteToken.publicKey, orderType)
    console.log('Order type:', rfqState.orderType)
    console.log('Order amount:', rfqState.orderAmount.toNumber())

    const assetBalance = await getBalance(provider, taker, assetToken.publicKey)
    const quoteBalance = await getBalance(provider, taker, quoteToken.publicKey)
    console.log('Taker asset balance:', assetBalance)
    console.log('Taker quote balance:', quoteBalance)

    assert.ok(rfqState.authority.toString() === taker.publicKey.toString())
    assert.deepEqual(rfqState.orderType, orderType)
    assert.equal(rfqState.orderAmount.toString(), TAKER_ORDER_AMOUNT2.toString())
    assert.equal(protocolState.rfqCount.toNumber(), 2)
    assert.equal(rfqState.expiry.toString(), Math.floor(expiry).toString())
  })

  it('RFQ 2: Maker B and C responds', async () => {
    const rfqId = 2

    const res1 = await respond(provider, makerB, rfqId, MAKER_B_BID_AMOUNT1, MAKER_B_ASK_AMOUNT1, makerBAssetATA, makerBQuoteATA)
    console.log('Response 1 best ask:', res1.rfqState.bestAskAmount?.toNumber())
    console.log('Response 1 best bid:', res1.rfqState.bestBidAmount?.toNumber())

    try {
      await respond(provider, makerB, rfqId, MAKER_B_BID_AMOUNT2, MAKER_B_ASK_AMOUNT2, makerBAssetATA, makerBQuoteATA)
      assert.ok(false)
    } catch (err) {
      assert.strictEqual(err.error.errorCode.code, 'InvalidQuote')
    }

    const res2 = await respond(provider, makerC, rfqId, MAKER_C_BID_AMOUNT1, MAKER_C_ASK_AMOUNT1, makerCAssetATA, makerCQuoteATA)
    console.log('Response 2 best ask:', res2.rfqState.bestAskAmount?.toNumber())
    console.log('Response 2 best bid:', res2.rfqState.bestBidAmount?.toNumber())

    const res3 = await respond(provider, makerC, rfqId, MAKER_C_BID_AMOUNT2, MAKER_C_ASK_AMOUNT2, makerCAssetATA, makerCQuoteATA)
    console.log('Response 3 best ask:', res3.rfqState.bestAskAmount?.toNumber())
    console.log('Response 3 best bid:', res3.rfqState.bestBidAmount?.toNumber())

    let assetBalance = await getBalance(provider, makerB, assetToken.publicKey)
    let quoteBalance = await getBalance(provider, makerB, quoteToken.publicKey)
    console.log('Maker B asset balance:', assetBalance)
    console.log('Maker B quote balance:', quoteBalance)

    assetBalance = await getBalance(provider, makerC, assetToken.publicKey)
    quoteBalance = await getBalance(provider, makerC, quoteToken.publicKey)
    console.log('Maker C asset balance:', assetBalance)
    console.log('Maker C quote balance:', quoteBalance)

    assert.equal(res1.rfqState.bestBidAmount?.toString(), MAKER_B_BID_AMOUNT1.toString())
    assert.equal(res2.rfqState.bestBidAmount?.toString(), MAKER_C_BID_AMOUNT1.toString())
    assert.equal(res3.rfqState.bestBidAmount?.toString(), MAKER_C_BID_AMOUNT1.toString())
  })

  it('RFQ 2: Taker confirms Maker B bid for 410,000', async () => {
    const rfqId = 2

    try {
      await confirm(provider, rfqId, 1, taker, takerAssetATA, takerQuoteATA, Quote.Bid)
      assert.ok(false)
    } catch (err) {
      assert.strictEqual(err.error.errorCode.code, 'InvalidConfirm')
    }

    try {
      await confirm(provider, rfqId, 2, taker, takerAssetATA, takerQuoteATA, Quote.Ask)
      assert.ok(false)
    } catch (err) {
      assert.strictEqual(err.error.errorCode.code, 'InvalidConfirm')
    }

    const { rfqState } = await confirm(provider, rfqId, 2, taker, takerAssetATA, takerQuoteATA, Quote.Bid)
    console.log('Best ask:', rfqState.bestAskAmount?.toNumber())
    console.log('Best bid:', rfqState.bestBidAmount?.toNumber())

    let assetBalance = await getBalance(provider, taker, assetToken.publicKey)
    let quoteBalance = await getBalance(provider, taker, quoteToken.publicKey)
    console.log('Taker asset balance:', assetBalance)
    console.log('Taker quote balance:', quoteBalance)

    assert.equal(assetBalance, MINT_AIRDROP - TAKER_ORDER_AMOUNT2 - TAKER_ORDER_AMOUNT1)
    assert.equal(quoteBalance, MINT_AIRDROP + MAKER_A_BID_AMOUNT2 - FEE1)
    assert.equal(rfqState.confirmed, true)
  })

  it('RFQ 2: Maker B and C last looks', async () => {
    const rfqId = 2

    const res1 = await lastLook(provider, makerB, rfqId, 1)
    const res2 = await lastLook(provider, makerC, rfqId, 2)
    const res3 = await lastLook(provider, makerC, rfqId, 3)

    console.log('Order type:', res2.rfqState.orderType)
    console.log('Last look:', res3.rfqState.lastLook)

    assert.equal(res1.rfqState.approved, true)
  })

  it('RFQ 2: Maker B and C return collateral', async () => {
    const rfqId = 2

    await returnCollateral(provider, makerB, rfqId, 1, makerBAssetATA, makerBQuoteATA)
    await returnCollateral(provider, makerC, rfqId, 3, makerCAssetATA, makerCQuoteATA)

    try {
      await returnCollateral(provider, makerC, rfqId, 2, makerCAssetATA, makerCQuoteATA)
      assert.ok(false)
    } catch (err) {
      assert.strictEqual(err.error.errorCode.code, 'OrderConfirmed')
    }

    try {
      await returnCollateral(provider, makerC, rfqId, 3, makerCAssetATA, makerCQuoteATA)
      assert.ok(false)
    } catch (err) {
      assert.strictEqual(err.error.errorCode.code, 'CollateralReturned')
    }

    let assetBalance = await getBalance(provider, taker, assetToken.publicKey)
    let quoteBalance = await getBalance(provider, taker, quoteToken.publicKey)
    console.log('Taker asset balance:', assetBalance)
    console.log('Taker quote balance:', quoteBalance)

    assetBalance = await getBalance(provider, makerA, assetToken.publicKey)
    quoteBalance = await getBalance(provider, makerA, quoteToken.publicKey)
    console.log('Maker A asset balance:', assetBalance)
    console.log('Maker A quote balance:', quoteBalance)

    assetBalance = await getBalance(provider, makerB, assetToken.publicKey)
    quoteBalance = await getBalance(provider, makerB, quoteToken.publicKey)
    console.log('Maker B asset balance:', assetBalance)
    console.log('Maker B quote balance:', quoteBalance)

    assetBalance = await getBalance(provider, makerC, assetToken.publicKey)
    quoteBalance = await getBalance(provider, makerC, quoteToken.publicKey)
    console.log('Maker C asset balance:', assetBalance)
    console.log('Maker C quote balance:', quoteBalance)
  })

  it('RFQ 2: Taker and Maker B settle', async () => {
    const rfqId = 2

    await settle(provider, taker, rfqId, 2, takerAssetATA, takerQuoteATA)

    try {
      await settle(provider, makerB, rfqId, 2, makerBAssetATA, makerBQuoteATA)
      assert.ok(false)
    } catch (err) {
      assert.strictEqual(err.error.errorCode.code, 'InvalidAuthority')
    }

    await settle(provider, makerC, rfqId, 2, makerCAssetATA, makerCQuoteATA)

    try {
      await settle(provider, makerC, rfqId, 2, makerCAssetATA, makerCQuoteATA)
      assert.ok(false)
    } catch (err) {
      assert.strictEqual(err.error.errorCode.code, 'OrderSettled')
    }

    try {
      await settle(provider, taker, rfqId, 2, takerAssetATA, takerQuoteATA)
      assert.ok(false)
    } catch (err) {
      assert.strictEqual(err.error.errorCode.code, 'RfqSettled')
    }

    let assetBalance = await getBalance(provider, taker, assetToken.publicKey)
    let quoteBalance = await getBalance(provider, taker, quoteToken.publicKey)
    console.log('Taker asset balance:', assetBalance)
    console.log('Taker quote balance:', quoteBalance)
    assert.equal(assetBalance, MINT_AIRDROP - TAKER_ORDER_AMOUNT2 - TAKER_ORDER_AMOUNT1)
    assert.equal(quoteBalance, MINT_AIRDROP + MAKER_A_BID_AMOUNT2 - FEE1 + MAKER_C_BID_AMOUNT1 - FEE2)

    assetBalance = await getBalance(provider, makerB, assetToken.publicKey)
    quoteBalance = await getBalance(provider, makerB, quoteToken.publicKey)
    console.log('Maker B asset balance:', assetBalance)
    console.log('Maker B quote balance:', quoteBalance)
    assert.equal(assetBalance, MINT_AIRDROP)
    assert.equal(quoteBalance, MINT_AIRDROP)

    assetBalance = await getBalance(provider, makerC, assetToken.publicKey)
    quoteBalance = await getBalance(provider, makerC, quoteToken.publicKey)
    console.log('Maker C asset balance:', assetBalance)
    console.log('Maker C quote balance:', quoteBalance)
    assert.equal(assetBalance, MINT_AIRDROP + TAKER_ORDER_AMOUNT2)
    assert.equal(quoteBalance, MINT_AIRDROP - MAKER_C_BID_AMOUNT1)
  })

  it(`RFQ 3: Taker requests sell for ${TAKER_ORDER_AMOUNT3}`, async () => {
    const rfqId = 3

    const requestOrder = Order.Buy
    const now = (new Date()).getTime() / 1_000
    const expiry = now + 1.5
    const legs = [{
      amount: new anchor.BN(TAKER_ORDER_AMOUNT3),
      instrument: Instrument.Spot,
      venue: Venue.Convergence
    }]

    await request(assetToken.publicKey, taker, expiry, false, legs, TAKER_ORDER_AMOUNT3, provider, quoteToken.publicKey, requestOrder)
    await respond(provider, makerD, rfqId, MAKER_D_BID_AMOUNT1, MAKER_D_ASK_AMOUNT1, makerDAssetATA, makerDQuoteATA)
    await respond(provider, makerD, rfqId, MAKER_D_BID_AMOUNT2, MAKER_D_ASK_AMOUNT2, makerDAssetATA, makerDQuoteATA)
    await confirm(provider, rfqId, 2, taker, takerAssetATA, takerQuoteATA, Quote.Ask)
    await returnCollateral(provider, makerD, rfqId, 1, makerDAssetATA, makerDQuoteATA)
    await settle(provider, taker, rfqId, 2, takerAssetATA, takerQuoteATA)
    await settle(provider, makerD, rfqId, 2, makerDAssetATA, makerDQuoteATA)

    let assetBalance = await getBalance(provider, taker, assetToken.publicKey)
    let quoteBalance = await getBalance(provider, taker, quoteToken.publicKey)
    console.log('Taker asset balance:', assetBalance)
    console.log('Taker quote balance:', quoteBalance)
    // TODO: Fee?
    assert.equal(assetBalance, MINT_AIRDROP - TAKER_ORDER_AMOUNT2 - TAKER_ORDER_AMOUNT1 + TAKER_ORDER_AMOUNT3)
    assert.equal(quoteBalance, MINT_AIRDROP + MAKER_A_BID_AMOUNT2 - FEE1 + MAKER_C_BID_AMOUNT1 - FEE2 - MAKER_D_ASK_AMOUNT2)

    assetBalance = await getBalance(provider, makerD, assetToken.publicKey)
    quoteBalance = await getBalance(provider, makerD, quoteToken.publicKey)
    console.log('Maker C asset balance:', assetBalance)
    console.log('Maker C quote balance:', quoteBalance)
    assert.equal(assetBalance, MINT_AIRDROP - TAKER_ORDER_AMOUNT3)
    assert.equal(quoteBalance, MINT_AIRDROP + MAKER_D_ASK_AMOUNT2)
  })

  it('DAO views all RFQs and responses', async () => {
    const rfqs = await getRFQs(provider, 1, 10)
    const responses = await getResponses(provider, rfqs)
    assert.equal(rfqs.length, 3)
    assert.equal(responses.length, 7)
  })
})