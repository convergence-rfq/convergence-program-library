/** 
  * RFQ Specification
  * 
  * Request:
  * - Taker wants an asset quote for one or two-way market
  * 
  * Respond:
  * - Maker submits one or two-way order and deposits collateral
  * 
  * Confirm:
  * - Taker confirms response by depositing collateral
  * 
  * Last look:
  * - Set to false
  * 
  * Return collateral:
  * - Unconfirmed maker orders get collateral returned
  * 
  * Settle:
  * - Taker gets 41K USDC
  * - Maker B gets 10 BTC
  * 
  * TODO:
  * - [ ] Fees
  */

import * as anchor from '@project-serum/anchor'
import { Wallet } from '@project-serum/anchor'
import * as assert from 'assert'
import { Token, TOKEN_PROGRAM_ID } from "@solana/spl-token"
import { Keypair, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js"

import {
  Instrument,
  Order,
  confirm,
  getBalance,
  getRFQs,
  initializeProtocol,
  lastLook,
  respond,
  returnCollateral,
  request,
  requestAirdrop,
  settle,
  Venue,
  Side,
  getProgram,
  getResponses,
} from '../lib/helpers'
import { Program } from '@project-serum/anchor'

let assetMint: Token
let quoteMint: Token

const ASSET_DECIMALS = 6;
const QUOTE_DECIMALS = 6;

const FEE_NUMERATOR = 5;
const FEE_DENOMINATOR = 100

let daoAssetWallet: PublicKey
let daoQuoteWallet: PublicKey
let takerAssetWallet: PublicKey
let takerQuoteWallet: PublicKey
let makerAAssetWallet: PublicKey
let makerAQuoteWallet: PublicKey
let makerBAssetWallet: PublicKey
let makerBQuoteWallet: PublicKey
let makerCAssetWallet: PublicKey
let makerCQuoteWallet: PublicKey
let makerDAssetWallet: PublicKey
let makerDQuoteWallet: PublicKey

let dao: Wallet
let bot: Wallet
let taker: Wallet
let makerA: Wallet
let makerB: Wallet
let makerC: Wallet
let makerD: Wallet

const TAKER_ORDER_AMOUNT1 = 1
const TAKER_ORDER_AMOUNT2 = 10
const TAKER_ORDER_AMOUNT3 = 3
const MAKER_A_ASK_AMOUNT1 = 41_000 // Winner
const MAKER_A_BID_AMOUNT1 = 39_100
const MAKER_A_ASK_AMOUNT2 = 41_100
const MAKER_A_BID_AMOUNT2 = 39_200 // Winner
const MAKER_B_ASK_AMOUNT1 = null
const MAKER_B_BID_AMOUNT1 = 400_000
const MAKER_B_ASK_AMOUNT2 = 420_000
const MAKER_B_BID_AMOUNT2 = 410_000 // Invalid
const MAKER_C_ASK_AMOUNT1 = null
const MAKER_C_BID_AMOUNT1 = 411_000 // Winner
const MAKER_C_ASK_AMOUNT2 = null
const MAKER_C_BID_AMOUNT2 = 390_000
const MAKER_D_ASK_AMOUNT1 = 395_000
const MAKER_D_BID_AMOUNT1 = null
const MAKER_D_ASK_AMOUNT2 = 390_000 // Winner
const MAKER_D_BID_AMOUNT2 = null
const MINT_AIRDROP = 1_000_000

anchor.setProvider(anchor.Provider.env())

const provider = anchor.getProvider()
let program: Program

const sleep = (ms: number) => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

const calcFee = (amount: number, decimals: number): number => {
  let uiAmount = amount / (10 ** decimals)
  let uiFeeAmount = uiAmount * (FEE_NUMERATOR / FEE_DENOMINATOR)
  let feeAmount = uiFeeAmount * (10 ** decimals)
  return parseInt(feeAmount.toString(), 10)
}

describe('RFQ Specification', () => {
  before(async () => {
    program = await getProgram(provider)

    dao = new Wallet(Keypair.generate())
    taker = new Wallet(Keypair.generate())
    bot = new Wallet(Keypair.generate())
    makerA = new Wallet(Keypair.generate())
    makerB = new Wallet(Keypair.generate())
    makerC = new Wallet(Keypair.generate())
    makerD = new Wallet(Keypair.generate())

    await requestAirdrop(provider, dao.publicKey, LAMPORTS_PER_SOL * 10)
    await requestAirdrop(provider, taker.publicKey, LAMPORTS_PER_SOL * 10)
    await requestAirdrop(provider, bot.publicKey, LAMPORTS_PER_SOL * 10)
    await requestAirdrop(provider, makerA.publicKey, LAMPORTS_PER_SOL * 10)
    await requestAirdrop(provider, makerB.publicKey, LAMPORTS_PER_SOL * 10)
    await requestAirdrop(provider, makerC.publicKey, LAMPORTS_PER_SOL * 10)
    await requestAirdrop(provider, makerD.publicKey, LAMPORTS_PER_SOL * 10)

    const walletBalance = await provider.connection.getBalance(taker.publicKey)
    console.log('Taker wallet balance:', walletBalance)

    const mintAuthorityBalance = await provider.connection.getBalance(dao.publicKey)
    console.log('Mint wallet balance:', mintAuthorityBalance)

    assetMint = await Token.createMint(program.provider.connection,
      dao.payer,
      dao.publicKey,
      dao.publicKey,
      ASSET_DECIMALS,
      TOKEN_PROGRAM_ID
    )
    quoteMint = await Token.createMint(program.provider.connection,
      dao.payer,
      dao.publicKey,
      dao.publicKey,
      QUOTE_DECIMALS,
      TOKEN_PROGRAM_ID
    )

    daoAssetWallet = await assetMint.createAssociatedTokenAccount(dao.publicKey)
    daoQuoteWallet = await quoteMint.createAssociatedTokenAccount(dao.publicKey)
    takerAssetWallet = await assetMint.createAssociatedTokenAccount(taker.publicKey)
    takerQuoteWallet = await quoteMint.createAssociatedTokenAccount(taker.publicKey)
    makerAAssetWallet = await assetMint.createAssociatedTokenAccount(makerA.publicKey)
    makerAQuoteWallet = await quoteMint.createAssociatedTokenAccount(makerA.publicKey)
    makerBAssetWallet = await assetMint.createAssociatedTokenAccount(makerB.publicKey)
    makerBQuoteWallet = await quoteMint.createAssociatedTokenAccount(makerB.publicKey)
    makerCAssetWallet = await assetMint.createAssociatedTokenAccount(makerC.publicKey)
    makerCQuoteWallet = await quoteMint.createAssociatedTokenAccount(makerC.publicKey)
    makerDAssetWallet = await assetMint.createAssociatedTokenAccount(makerD.publicKey)
    makerDQuoteWallet = await quoteMint.createAssociatedTokenAccount(makerD.publicKey)

    await assetMint.mintTo(takerAssetWallet, dao.publicKey, [], MINT_AIRDROP)
    await quoteMint.mintTo(takerQuoteWallet, dao.publicKey, [], MINT_AIRDROP)
    await assetMint.mintTo(makerAAssetWallet, dao.publicKey, [], MINT_AIRDROP)
    await quoteMint.mintTo(makerAQuoteWallet, dao.publicKey, [], MINT_AIRDROP)
    await assetMint.mintTo(makerBAssetWallet, dao.publicKey, [], MINT_AIRDROP)
    await quoteMint.mintTo(makerBQuoteWallet, dao.publicKey, [], MINT_AIRDROP)
    await assetMint.mintTo(makerCAssetWallet, dao.publicKey, [], MINT_AIRDROP)
    await quoteMint.mintTo(makerCQuoteWallet, dao.publicKey, [], MINT_AIRDROP)
    await assetMint.mintTo(makerDAssetWallet, dao.publicKey, [], MINT_AIRDROP)
    await quoteMint.mintTo(makerDQuoteWallet, dao.publicKey, [], MINT_AIRDROP)
  })

  it('DAO initializes protocol with a 1bps fee', async () => {
    const { protocolState } = await initializeProtocol(provider, dao, FEE_DENOMINATOR, FEE_NUMERATOR)
    assert.ok(protocolState.feeDenominator.eq(new anchor.BN(FEE_DENOMINATOR)))
    assert.ok(protocolState.feeNumerator.eq(new anchor.BN(FEE_NUMERATOR)))
    assert.ok(protocolState.rfqCount.eq(new anchor.BN(0)))
    assert.ok(protocolState.accessManagerCount.eq(new anchor.BN(0)))
  })

  it('RFQ 1: Taker initializes two-way for 1', async () => {
    const requestOrder = Order.TwoWay
    const now = (new Date()).getTime() / 1_000
    const expiry = now + 1.5 // Expires in 1.5 seconds
    const legs = [{
      amount: new anchor.BN(TAKER_ORDER_AMOUNT1),
      instrument: Instrument.Spot,
      side: Side.Sell,
      venue: Venue.Convergence,
    }]
    const { rfqState, protocolState } = await request(assetMint, taker, expiry, false, legs, TAKER_ORDER_AMOUNT1, provider, quoteMint, requestOrder)
    assert.ok(rfqState.id.eq(new anchor.BN(1)))
    assert.ok(rfqState.authority.toString() === taker.publicKey.toString())
    assert.ok(protocolState.rfqCount.eq(new anchor.BN(1)))
  })

  it('RFQ 1: Maker A responds to two-way and taker confirms sell with best bid at 39,500', async () => {
    const rfqId = 1
    await respond(provider, makerA, rfqId, MAKER_A_BID_AMOUNT1, MAKER_A_ASK_AMOUNT1, makerAAssetWallet, makerAQuoteWallet)
    await respond(provider, makerA, rfqId, MAKER_A_BID_AMOUNT2, MAKER_A_ASK_AMOUNT2, makerAAssetWallet, makerAQuoteWallet)

    let assetMintBalance = await getBalance(provider, taker, assetMint.publicKey)
    let quoteMintBalance = await getBalance(provider, taker, quoteMint.publicKey)
    console.log('Taker asset balance:', assetMintBalance)
    console.log('Taker quote balance:', quoteMintBalance)

    const { rfqState } = await confirm(provider, rfqId, 1, taker, takerAssetWallet, takerQuoteWallet, Side.Sell)
    console.log('Best ask:', rfqState.bestAskAmount?.toNumber())
    console.log('Best bid:', rfqState.bestBidAmount?.toNumber())

    try {
      await confirm(provider, rfqId, 2, taker, takerAssetWallet, takerQuoteWallet, Side.Sell)
      assert.ok(false)
    } catch (err) {
      assert.strictEqual(err.error.errorCode.code, 'RfqConfirmed')
    }

    console.log('Sleeping 1.5s...')
    await sleep(1_500)

    try {
      await respond(provider, makerA, rfqId, MAKER_A_BID_AMOUNT1, MAKER_A_ASK_AMOUNT1, makerAAssetWallet, makerAQuoteWallet)
      assert.ok(false)
    } catch (err) {
      assert.strictEqual(err.error.errorCode.code, 'Expired')
    }

    assetMintBalance = await getBalance(provider, taker, assetMint.publicKey)
    quoteMintBalance = await getBalance(provider, taker, quoteMint.publicKey)
    console.log('Taker asset balance:', assetMintBalance)
    console.log('Taker quote balance:', quoteMintBalance)
    assert.equal(assetMintBalance, MINT_AIRDROP - TAKER_ORDER_AMOUNT1)
    assert.equal(quoteMintBalance, MINT_AIRDROP)
    assert.equal(rfqState.confirmed, true)

    // TODO: Return collateral and settle
  })

  it('RFQ 2: Taker initializes sell for 10', async () => {
    const orderSide = Order.Sell
    const now = (new Date()).getTime() / 1_000
    // Expires in 15 seconds
    const expiry = now + 15
    const orderAmount = TAKER_ORDER_AMOUNT2
    const legs = [{
      venue: Venue.Convergence,
      side: Side.Sell,
      amount: new anchor.BN(TAKER_ORDER_AMOUNT2),
      instrument: Instrument.Spot,
    }]
    const { rfqState, protocolState } = await request(assetMint, taker, expiry, true, legs, orderAmount, provider, quoteMint, orderSide)
    assert.ok(rfqState.authority.toString() === taker.publicKey.toString())
    assert.deepEqual(rfqState.orderSide, orderSide)
    //assert.equal(rfqState.expiry.toString(), expiry.toString())
    assert.equal(rfqState.orderAmount.toString(), TAKER_ORDER_AMOUNT2.toString())
    assert.equal(protocolState.rfqCount.toNumber(), 2)

    const assetMintBalance = await getBalance(provider, taker, assetMint.publicKey)
    const quoteMintBalance = await getBalance(provider, taker, quoteMint.publicKey)

    console.log('Taker order:', rfqState.orderSide)
    console.log('Taker amount:', rfqState.orderAmount.toNumber())
    console.log('Taker asset balance:', assetMintBalance)
    console.log('Taker quote balance:', quoteMintBalance)
  })

  it('RFQ 2: Maker B and C respond', async () => {
    const rfqId = 2
    const response1 = await respond(provider, makerB, rfqId, MAKER_B_BID_AMOUNT1, MAKER_B_ASK_AMOUNT1, makerBAssetWallet, makerBQuoteWallet)
    console.log('Response 1 best ask:', response1.rfqState.bestAskAmount?.toNumber())
    console.log('Response 1 best bid:', response1.rfqState.bestBidAmount?.toNumber())

    try {
      await respond(provider, makerB, rfqId, MAKER_B_BID_AMOUNT2, MAKER_B_ASK_AMOUNT2, makerBAssetWallet, makerBQuoteWallet)
      assert.ok(false)
    } catch (err) {
      assert.strictEqual(err.error.errorCode.code, 'InvalidQuote')
    }

    const response2 = await respond(provider, makerC, rfqId, MAKER_C_BID_AMOUNT1, MAKER_C_ASK_AMOUNT1, makerCAssetWallet, makerCQuoteWallet)
    console.log('Response 2 best ask:', response2.rfqState.bestAskAmount?.toNumber())
    console.log('Response 2 best bid:', response2.rfqState.bestBidAmount?.toNumber())

    const response3 = await respond(provider, makerC, rfqId, MAKER_C_BID_AMOUNT2, MAKER_C_ASK_AMOUNT2, makerCAssetWallet, makerCQuoteWallet)
    console.log('Response 3 best ask:', response3.rfqState.bestAskAmount?.toNumber())
    console.log('Response 3 best bid:', response3.rfqState.bestBidAmount?.toNumber())

    const makerBassetBalance = await getBalance(provider, makerB, assetMint.publicKey)
    const makerBquoteBalance = await getBalance(provider, makerB, quoteMint.publicKey)
    console.log('Maker B asset balance:', makerBassetBalance)
    console.log('Maker B quote balance:', makerBquoteBalance)

    const makerCassetBalance = await getBalance(provider, makerC, assetMint.publicKey)
    const makerCquoteBalance = await getBalance(provider, makerC, quoteMint.publicKey)
    console.log('Maker C asset balance:', makerCassetBalance)
    console.log('Maker C quote balance:', makerCquoteBalance)

    assert.equal(response1.rfqState.bestBidAmount?.toString(), MAKER_B_BID_AMOUNT1.toString())
    assert.equal(response2.rfqState.bestBidAmount?.toString(), MAKER_C_BID_AMOUNT1.toString())
    assert.equal(response3.rfqState.bestBidAmount?.toString(), MAKER_C_BID_AMOUNT1.toString())
  })

  it('RFQ 2: Confirm sell for 410,000', async () => {
    const rfqId = 2

    try {
      await confirm(provider, rfqId, 1, taker, takerAssetWallet, takerQuoteWallet, Side.Sell)
      assert.ok(false)
    } catch (err) {
      assert.strictEqual(err.error.errorCode.code, 'InvalidConfirm')
    }

    try {
      await confirm(provider, rfqId, 2, taker, takerAssetWallet, takerQuoteWallet, Side.Buy)
      assert.ok(false)
    } catch (err) {
      assert.strictEqual(err.error.errorCode.code, 'InvalidConfirm')
    }

    const { rfqState } = await confirm(provider, rfqId, 2, taker, takerAssetWallet, takerQuoteWallet, Side.Sell)
    console.log('Best ask:', rfqState.bestAskAmount?.toNumber())
    console.log('Best bid:', rfqState.bestBidAmount?.toNumber())

    const assetMintBalance = await getBalance(provider, taker, assetMint.publicKey)
    const quoteMintBalance = await getBalance(provider, taker, quoteMint.publicKey)
    console.log('Taker asset balance:', assetMintBalance)
    console.log('Taker quote balance:', quoteMintBalance)

    assert.equal(assetMintBalance, MINT_AIRDROP - TAKER_ORDER_AMOUNT2 - TAKER_ORDER_AMOUNT1)
    assert.equal(quoteMintBalance, MINT_AIRDROP)
    assert.equal(rfqState.confirmed, true)
  })

  it('RFQ 2: Maker B and C last look', async () => {
    const rfqId = 2

    const response1 = await lastLook(provider, makerB, rfqId, 1)
    const response2 = await lastLook(provider, makerC, rfqId, 2)
    const response3 = await lastLook(provider, makerC, rfqId, 3)

    console.log('Best ask approved:', response1.rfqState.bestAskAmount?.toNumber())
    console.log('Best bid approved:', response2.rfqState.bestBidAmount?.toNumber())
    console.log('Order side:', response3.rfqState.orderSide)
    console.log('Last look:', response3.rfqState.lastLook)

    assert.equal(response1.rfqState.approved, true)
    assert.equal(response2.rfqState.approved, true)
    assert.equal(response3.rfqState.approved, true)
  })

  it('RFQ 2: Return maker B and C collateral', async () => {
    const rfqId = 2

    await returnCollateral(provider, makerB, rfqId, 1, makerBAssetWallet, makerBQuoteWallet)
    await returnCollateral(provider, makerC, rfqId, 3, makerCAssetWallet, makerCQuoteWallet)

    try {
      await returnCollateral(provider, makerC, rfqId, 2, makerCAssetWallet, makerCQuoteWallet)
      assert.ok(false)
    } catch (err) {
      assert.strictEqual(err.error.errorCode.code, 'OrderConfirmed')
    }

    try {
      await returnCollateral(provider, makerC, rfqId, 3, makerCAssetWallet, makerCQuoteWallet)
      assert.ok(false)
    } catch (err) {
      assert.strictEqual(err.error.errorCode.code, 'CollateralReturned')
    }

    const takerAassetBalance = await getBalance(provider, taker, assetMint.publicKey)
    const takerAquoteBalance = await getBalance(provider, taker, quoteMint.publicKey)
    console.log('Taker asset balance:', takerAassetBalance)
    console.log('Taker quote balance:', takerAquoteBalance)

    const makerAassetBalance = await getBalance(provider, makerA, assetMint.publicKey)
    const makerAquoteBalance = await getBalance(provider, makerA, quoteMint.publicKey)
    console.log('Maker A asset balance:', makerAassetBalance)
    console.log('Maker A quote balance:', makerAquoteBalance)

    const makerBassetBalance = await getBalance(provider, makerB, assetMint.publicKey)
    const makerBquoteBalance = await getBalance(provider, makerB, quoteMint.publicKey)
    console.log('Maker B asset balance:', makerBassetBalance)
    console.log('Maker B quote balance:', makerBquoteBalance)

    const makerCassetBalance = await getBalance(provider, makerC, assetMint.publicKey)
    const makerCquoteBalance = await getBalance(provider, makerC, quoteMint.publicKey)
    console.log('Maker C asset balance:', makerCassetBalance)
    console.log('Maker C quote balance:', makerCquoteBalance)
  })

  it('RFQ 2: Settle', async () => {
    const rfqId = 2

    await settle(provider, taker, rfqId, 2, takerAssetWallet, takerQuoteWallet, daoQuoteWallet)
    await settle(provider, makerB, rfqId, 2, makerBAssetWallet, makerBQuoteWallet, daoQuoteWallet)

    try {
      await settle(provider, makerB, rfqId, 1, makerBAssetWallet, makerBQuoteWallet, daoQuoteWallet)
      assert.ok(false)
    } catch (err) {
      assert.strictEqual(err.error.errorCode.code, 'OrderSettled')
    }

    try {
      await settle(provider, taker, rfqId, 2, takerAssetWallet, takerQuoteWallet, daoQuoteWallet)
      assert.ok(false)
    } catch (err) {
      assert.strictEqual(err.error.errorCode.code, 'RfqSettled')
    }

    const takerAssetBalance = await getBalance(provider, taker, assetMint.publicKey)
    const takerQuoteBalance = await getBalance(provider, taker, quoteMint.publicKey)
    const makerBAssetBalance = await getBalance(provider, makerB, assetMint.publicKey)
    const makerBQuoteBalance = await getBalance(provider, makerB, quoteMint.publicKey)
    const makerCAssetBalance = await getBalance(provider, makerC, assetMint.publicKey)
    const makerCQuoteBalance = await getBalance(provider, makerC, quoteMint.publicKey)

    console.log('Taker asset balance:', takerAssetBalance)
    console.log('Taker quote balance:', takerQuoteBalance)
    console.log('Maker B asset balance:', makerBAssetBalance)
    console.log('Maker B quote balance:', makerBQuoteBalance)
    console.log('Maker C asset balance:', makerCAssetBalance)
    console.log('Maker C quote balance:', makerCQuoteBalance)

    assert.equal(takerAssetBalance, MINT_AIRDROP - TAKER_ORDER_AMOUNT2 - TAKER_ORDER_AMOUNT1)
    assert.equal(takerQuoteBalance, MINT_AIRDROP + MAKER_C_BID_AMOUNT1 - calcFee(MAKER_C_BID_AMOUNT1, QUOTE_DECIMALS))
    assert.equal(makerBAssetBalance, MINT_AIRDROP + TAKER_ORDER_AMOUNT2)
    assert.equal(makerBQuoteBalance, MINT_AIRDROP)
    assert.equal(makerCAssetBalance, MINT_AIRDROP)
    assert.equal(makerCQuoteBalance, MINT_AIRDROP - MAKER_C_BID_AMOUNT1)
  })

  it('RFQ 3: Sell 10', async () => {
    const rfqId = 3
    const requestOrder = Order.Buy
    const now = (new Date()).getTime() / 1_000
    const expiry = now + 1.5
    const legs = [{
      amount: new anchor.BN(TAKER_ORDER_AMOUNT3),
      instrument: Instrument.Spot,
      side: Side.Buy,
      venue: Venue.Convergence,
    }]

    await request(assetMint, taker, expiry, false, legs, TAKER_ORDER_AMOUNT3, provider, quoteMint, requestOrder)
    await respond(provider, makerD, rfqId, MAKER_D_BID_AMOUNT1, MAKER_D_ASK_AMOUNT1, makerDAssetWallet, makerDQuoteWallet)
    await respond(provider, makerD, rfqId, MAKER_D_BID_AMOUNT2, MAKER_D_ASK_AMOUNT2, makerDAssetWallet, makerDQuoteWallet)
    await confirm(provider, rfqId, 2, taker, takerAssetWallet, takerQuoteWallet, requestOrder)
    await returnCollateral(provider, makerD, rfqId, 1, makerDAssetWallet, makerDQuoteWallet)
    await settle(provider, taker, rfqId, 2, takerAssetWallet, takerQuoteWallet, daoAssetWallet)
    await settle(provider, makerD, rfqId, 2, makerDAssetWallet, makerDQuoteWallet, daoAssetWallet)

    let assetBalance = await getBalance(provider, taker, assetMint.publicKey)
    let quoteBalance = await getBalance(provider, taker, quoteMint.publicKey)
    console.log('Taker asset balance:', assetBalance)
    console.log('Taker quote balance:', quoteBalance)

    const FEE1 = calcFee(MAKER_C_BID_AMOUNT1, QUOTE_DECIMALS)
    const FEE2 = calcFee(MAKER_D_ASK_AMOUNT2, QUOTE_DECIMALS)
    assert.equal(assetBalance, MINT_AIRDROP - TAKER_ORDER_AMOUNT2 - TAKER_ORDER_AMOUNT1 + TAKER_ORDER_AMOUNT3)
    assert.equal(quoteBalance, MINT_AIRDROP + MAKER_C_BID_AMOUNT1 - FEE1 - MAKER_D_ASK_AMOUNT2)

    assetBalance = await getBalance(provider, makerD, assetMint.publicKey)
    quoteBalance = await getBalance(provider, makerD, quoteMint.publicKey)
    console.log('Maker C asset balance confirmation:', assetBalance)
    console.log('Maker C quote balance confirmation:', quoteBalance)

    assert.equal(assetBalance, MINT_AIRDROP - TAKER_ORDER_AMOUNT3)
    assert.equal(quoteBalance, MINT_AIRDROP + MAKER_D_ASK_AMOUNT2)
  })

  it('View all RFQs and responses', async () => {
    const rfqs = await getRFQs(provider, 1, 10)
    const responses = await getResponses(provider, rfqs)
    assert.equal(rfqs.length, 3)
    assert.equal(responses.length, 7)
  })
})