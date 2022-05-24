
/** 
  * PsyAmerican Specification
  */

import * as anchor from '@project-serum/anchor'
import { Wallet, BN } from '@project-serum/anchor'
import * as assert from 'assert'
import { Token, TOKEN_PROGRAM_ID } from "@solana/spl-token"
import { Keypair, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js"

import {
    PROTOCOL_SEED,
    Contract,
    Instrument,
    Order,
    Quote,
    Venue,
    calcFee,
    confirm,
    getBalance,
    getProgram,
    mintPsyAmericanOptions,
    respond,
    request,
    requestAirdrop,
    settle,
} from '../lib/helpers'
import { Program } from '@project-serum/anchor'

let assetToken: Token
let quoteToken: Token

const ASSET_DECIMALS = 6
const QUOTE_DECIMALS = 2

const MINT_AIRDROP_ASSET = 1_000_000 * (10 ** ASSET_DECIMALS)
const MINT_AIRDROP_QUOTE = 10_000_000_000_000 * (10 ** QUOTE_DECIMALS)

const FEE_NUMERATOR = 1
const FEE_DENOMINATOR = 1_000

const TAKER_ORDER_AMOUNT1 = 5 * (10 ** ASSET_DECIMALS)
const TAKER_ORDER_AMOUNT2 = 32 * (10 ** ASSET_DECIMALS)

const MAKER_A_ASK_AMOUNT1 = 41_000 * (10 ** QUOTE_DECIMALS) * TAKER_ORDER_AMOUNT1
const MAKER_A_BID_AMOUNT1 = 39_100 * (10 ** QUOTE_DECIMALS) * TAKER_ORDER_AMOUNT1

const FEE1 = calcFee(MAKER_A_BID_AMOUNT1, FEE_NUMERATOR, FEE_DENOMINATOR)

let takerAssetATA: PublicKey
let takerQuoteATA: PublicKey
let makerAAssetATA: PublicKey
let makerAQuoteATA: PublicKey

let mintAuthority: Wallet
let taker: Wallet
let makerA: Wallet

let rfqCount: number

anchor.setProvider(anchor.AnchorProvider.env())

const provider = anchor.getProvider()
let program: Program

describe('RFQ Specification', () => {
    before(async () => {
        program = await getProgram(provider)

        mintAuthority = new Wallet(Keypair.generate())
        taker = new Wallet(Keypair.generate())
        makerA = new Wallet(Keypair.generate())

        await requestAirdrop(provider, mintAuthority.publicKey, LAMPORTS_PER_SOL * 10)
        await requestAirdrop(provider, taker.publicKey, LAMPORTS_PER_SOL * 10)
        await requestAirdrop(provider, makerA.publicKey, LAMPORTS_PER_SOL * 10)

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

        takerAssetATA = await assetToken.createAssociatedTokenAccount(taker.publicKey)
        makerAAssetATA = await assetToken.createAssociatedTokenAccount(makerA.publicKey)

        takerQuoteATA = await quoteToken.createAssociatedTokenAccount(taker.publicKey)
        makerAQuoteATA = await quoteToken.createAssociatedTokenAccount(makerA.publicKey)

        await assetToken.mintTo(takerAssetATA, mintAuthority.publicKey, [], MINT_AIRDROP_ASSET)
        await assetToken.mintTo(makerAAssetATA, mintAuthority.publicKey, [], MINT_AIRDROP_ASSET)

        await quoteToken.mintTo(takerQuoteATA, mintAuthority.publicKey, [], MINT_AIRDROP_QUOTE)
        await quoteToken.mintTo(makerAQuoteATA, mintAuthority.publicKey, [], MINT_AIRDROP_QUOTE)

        const [protocolPda, _protocolBump] = await PublicKey.findProgramAddress(
            [Buffer.from(PROTOCOL_SEED)],
            program.programId
        )
        const protocolState: any = await program.account.protocolState.fetch(protocolPda)
        rfqCount = protocolState.rfqCount.toNumber()
    })

    it(`RFQ 1: Taker requests sell for PsyOptions American multi-leg strategy`, async () => {
        const rfqId = rfqCount + 1
        const requestOrder = Order.Sell
        const now = (new Date()).getTime() / 1_000
        const expiry = now + 2
        const legs = [{
            amount: new anchor.BN(10 * (10 ** ASSET_DECIMALS)),
            contract: Contract.Call,
            contractAssetAmount: new BN(1 * (10 ** ASSET_DECIMALS)),
            contractQuoteAmount: new BN(1 * (10 ** QUOTE_DECIMALS)),
            expiry: new BN(now + 30),
            instrument: Instrument.Option,
            venue: Venue.PsyOptions
        }, {
            amount: new BN(5 * (10 ** ASSET_DECIMALS)),
            contract: null,
            contractAssetAmount: null,
            contractQuoteAmount: null,
            expiry: null,
            instrument: Instrument.Spot,
            venue: Venue.Convergence
        }]

        const res1 = await request(null, assetToken.publicKey, taker, expiry, false, legs, TAKER_ORDER_AMOUNT2, provider, quoteToken.publicKey, requestOrder)
        assert.equal(legs.toString(), res1.rfqState.legs.toString())

        //await respond(provider, makerB, rfqId, MAKER_B_BID_AMOUNT1, MAKER_B_ASK_AMOUNT1, makerBAssetATA, makerBQuoteATA)
        //await confirm(provider, rfqId, 1, taker, takerAssetATA, takerQuoteATA, Quote.Bid)
        //await settle(provider, taker, rfqId, 1, takerAssetATA, takerQuoteATA)
        //await settle(provider, makerB, rfqId, 1, makerBAssetATA, makerBQuoteATA)

        await mintPsyAmericanOptions(provider, rfqId, taker)

        // 🦆: Verify all legs have been executed
    })
})