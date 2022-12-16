import { BN } from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";
import {
  sleep,
  toAbsolutePrice,
  TokenChangeMeasurer,
  toLegMultiplier,
  withTokenDecimals,
} from "../../utilities/helpers";
import * as anchor from "@project-serum/anchor";
import { Context, getContext } from "../../utilities/wrappers";
import { AuthoritySide, Quote, Side } from "../../utilities/types";
import { PsyoptionsAmericanInstrumentClass } from "../../utilities/instruments/psyoptionsAmericanInstrument";
import { createProgram, getOptionByKey, instructions } from "@mithraic-labs/psy-american";
import { Mint } from "../../utilities/wrappers";
import { CONTRACT_DECIMALS_BN } from "../../dependencies/tokenized-euros/src";

import { Token, TOKEN_PROGRAM_ID } from "@solana/spl-token";
// let quoteMint = new anchor.web3.PublicKey("7KbkkqJApyaJALasVfBFXWdk8nMvrESVbujrd4pJ7RLg");
let optionMarketPubkey = new anchor.web3.PublicKey("AyzPCuomzEbpG8CTPz9XdNYoz6r2VWkgjSSCRYYkxzAR");
let optionMintPubkey = new anchor.web3.PublicKey("HJSmAyXehyims3jhCTuEs9yssGo7sTCV5Ry71hhTC4HV");
let quoteAssetPoolPubkey = new anchor.web3.PublicKey("FP4kHtWQF7EkzsYn53osMefienTKm4GD16eS2rnqSXZs");
let underlyingAssetPoolPubkey = new anchor.web3.PublicKey("HauNUUKeVyRMDpS3WC8z68AmcAfEdnvv9w8cjS4kHD6j");
let writerMintPubkey = new anchor.web3.PublicKey("9ne84dRDEsbjWoSMiZhPCZ3jmU82EjdzcE28d8pzxRzH");
// let underlyingMintPubkey = new anchor.web3.PublicKey("AfgNuodtdeefjFR7RHpnnmXbkg51L2C9Wmya1h3gMH7u");
let optionTokenAccountPubkey = new anchor.web3.PublicKey("GTrno4K5YMnWFsCVSontvQXF1gDmBdFRbSzF9AS1Hj3d");
let underlyingTokenAccountPubkey = new anchor.web3.PublicKey("4eHzPJytmSvcn2LJ3zwwsa5Fq3LSxkhxmQBu9owsQRHJ");
let writerTokenAccountPubkey = new anchor.web3.PublicKey("CLkcThqk2sHyaXJgeKTw9npNjajgkSJsqRV4LvBAXSsj");
let rpc = new anchor.web3.Connection("http://localhost:8899");
let payer = anchor.AnchorProvider.env().wallet as anchor.Wallet;
let AnchorProvider = new anchor.AnchorProvider(rpc, payer, anchor.AnchorProvider.defaultOptions());
let PsyOptionsAmericanProgramId = new anchor.web3.PublicKey("R2y9ip6mxmWUj4pt54jP2hz2dgvMozy9VTSwMWE7evs");
let psyOptionsAmericanLocalNetProgramId = new anchor.web3.PublicKey("77i2wXGdwV5MkV9W6X2T3bXwZwK7tFSDqBdL7XMz5yBF");

async function createPsyAmericanProgram(programId = psyOptionsAmericanLocalNetProgramId, provider = AnchorProvider) {
  let program = createProgram(programId, provider);
  return program;
}

async function initializeOptionMarket(
  expiration: anchor.BN,
  quoteAmount: anchor.BN,
  quoteMint: PublicKey,
  underlyingAmount: anchor.BN,
  underlyingMint: PublicKey
) {
  let program = await createPsyAmericanProgram();
  let psyAmerican = await instructions.initializeMarket(program, {
    expirationUnixTimestamp: expiration,
    quoteAmountPerContract: quoteAmount,
    underlyingAmountPerContract: underlyingAmount,
    underlyingMint: underlyingMint,
    quoteMint: quoteMint,
  });

  return psyAmerican;
}

async function getOptionMarkeyWithKey(key: PublicKey) {
  let program = await createPsyAmericanProgram();

  let optionMarkeyWithKey = await getOptionByKey(program, key);
  return optionMarkeyWithKey;
}

async function mintPsyOPtions(
  optionMarketKey: PublicKey,
  receiverOptionTokenAcc: PublicKey,
  receiverWriterTokenAcc: PublicKey,
  receiverUnderlyingTokenAcc: PublicKey,
  noOfOptions: number
) {
  let program = await createPsyAmericanProgram();
  let optionMarketWithKey = await getOptionMarkeyWithKey(optionMarketKey);

  let ix = await instructions.mintOptionV2Instruction(
    program,
    receiverOptionTokenAcc,
    receiverWriterTokenAcc,
    receiverUnderlyingTokenAcc,
    noOfOptions,
    optionMarketWithKey
  );

  let tx = new anchor.web3.Transaction();
  ix.signers.push(payer.payer);
  tx.add(ix.ix);

  let signature = anchor.web3.sendAndConfirmTransaction(rpc, tx, ix.signers);
  console.log(signature);
}

async function exerciseOption(
  noOfOptions: number,
  optionMarketKey: PublicKey,
  exerciserOptionTokenAcc: PublicKey,
  underlyingDestTokenAcc: PublicKey,
  quoteAssetSrcTokenAcc: PublicKey
) {
  let program = await createPsyAmericanProgram();
  let optionMarketWithKey = await getOptionMarkeyWithKey(optionMarketKey);
  let ix = instructions.exerciseOptionsV2Instruction(
    program,
    noOfOptions,
    optionMarketWithKey,
    exerciserOptionTokenAcc,
    underlyingDestTokenAcc,
    quoteAssetSrcTokenAcc
  );
  let tx = new anchor.web3.Transaction();
  tx.add(ix);

  let signature = anchor.web3.sendAndConfirmTransaction(rpc, tx, [payer.payer]);
  console.log(signature);
}

async function getOptionMint(ctx: Context, optionMint: PublicKey) {
  let opMint = await Mint.wrap(ctx, optionMint);
  return opMint;
}

// console.log(VALUE);
// let program = createProgram(psyOptionsAmericanLocalNetProgramId, AnchorProvider);
// console.log(program.programId.toBase58());
// let underlyingAmountPerContract = new anchor.BN("10000000000");
// let quoteAmountPerContract = new anchor.BN("50000000000");
// let expiration = new anchor.BN(new Date().getTime() / 1000 + 3600);
// let sig = await instructions.initializeMarket(program, {
//   expirationUnixTimestamp: expiration,
//   quoteAmountPerContract: quoteAmountPerContract,
//   quoteMint: context.quoteToken.publicKey,
//   underlyingAmountPerContract: underlyingAmountPerContract,
//   underlyingMint: context.assetToken.publicKey,
// });
// console.log(sig.optionMarketKey.toBase58());
// console.log(sig.optionMintKey.toBase58());
// console.log(sig.quoteAssetPoolKey.toBase58());
// console.log(sig.underlyingAssetPoolKey.toBase58());
// console.log(sig.writerMintKey.toBase58());
// let token1 = new Token(rpc, optionMintPubkey, TOKEN_PROGRAM_ID, payer.payer);
// let token2 = new Token(rpc, writerMintPubkey, TOKEN_PROGRAM_ID, payer.payer);
// console.log(await token1.createAssociatedTokenAccount(context.maker.publicKey));
// console.log(await token1.createAssociatedTokenAccount(context.taker.publicKey));
// console.log(await token2.createAssociatedTokenAccount(context.maker.publicKey));
// console.log(await token2.createAssociatedTokenAccount(context.taker.publicKey));
// console.log(await context.quoteToken.createAssociatedAccountWithTokens(context.maker.publicKey));
// console.log(await context.quoteToken.createAssociatedAccountWithTokens(context.taker.publicKey));
// console.log(await context.assetToken.createAssociatedAccountWithTokens(context.taker.publicKey));
// console.log(await context.assetToken.createAssociatedAccountWithTokens(context.taker.publicKey));
// let program = createProgram(PsyOptionsAmericanProgramId, AnchorProvider);
// let size = new anchor.BN(2);
// let optionMarkeyWithKey = await getOptionByKey(program, optionMarketPubkey);
// let optionsix = await instructions.mintOptionV2Instruction(
//   program,
//   optionTokenAccountPubkey,
//   writerTokenAccountPubkey,
//   underlyingTokenAccountPubkey,
//   size,
//   optionMarkeyWithKey
// );
// let tx = new anchor.web3.Transaction();
// tx.add(optionsix.ix);
// optionsix.signers.push(payer.payer);
// let sig = await anchor.web3.sendAndConfirmTransaction(rpc, tx, optionsix.signers);
// console.log("Transaction signature:", sig);
// let options = await getOptionMint(context, optionMintPubkey);
// let tokenMeasurer = await TokenChangeMeasurer.takeSnapshot(context, ["quote", "asset"], [taker, maker]);
// // create a two way RFQ specifying 1 option call as a leg
// const rfq = await context.createRfq({
//   legs: [
//     PsyoptionsAmericanInstrument.create(context, options, optionMarkeyWithKey.key, {
//       amount: new BN(1).mul(CONTRACT_DECIMALS_BN),
//       side: Side.Bid,
//     }),
//   ],
// });
// // response with agreeing to sell 1 options for 500$ or buy 1 for 450$
// const response = await rfq.respond({
//   bid: Quote.getStandart(toAbsolutePrice(withTokenDecimals(450)), toLegMultiplier(1)),
//   ask: Quote.getStandart(toAbsolutePrice(withTokenDecimals(500)), toLegMultiplier(1)),
// });
// // taker confirms to buy 1 option
// await response.confirm({ side: Side.Ask, legMultiplierBps: toLegMultiplier(1) });
// await response.prepareSettlement(AuthoritySide.Taker);
// await response.prepareSettlement(AuthoritySide.Maker);
// // taker should receive 1 option, maker should receive 500$ and lose 1 bitcoin as option collateral
// await response.settle(maker, [taker]);
// await tokenMeasurer.expectChange([
//   { token: options, user: taker, delta: new BN(1).mul(CONTRACT_DECIMALS_BN) },
//   { token: "quote", user: taker, delta: withTokenDecimals(-500) },
//   { token: "quote", user: maker, delta: withTokenDecimals(500) },
//   { token: "asset", user: maker, delta: withTokenDecimals(-1) },
//   { token: options, user: maker, delta: new BN(0) },
// ]);
// await response.unlockResponseCollateral();
// await response.cleanUp();
// console.log("done...");
