import * as anchor from '@project-serum/anchor';
import { Program, Provider } from '@project-serum/anchor';
import { Rfq } from '../target/types/rfq';
import * as assert from 'assert';
import * as spl from "@solana/spl-token";
import * as idl from '../target/idl/rfq.json';
import { Token } from "@solana/spl-token";
import {
  Connection,
  Keypair,
  PublicKey,
  Signer,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import NodeWallet from '@project-serum/anchor/dist/cjs/nodewallet';


let assetMint : spl.Token;
let quoteMint : spl.Token;
let mintAuthority : any;
let authorityAssetToken : any;
let authorityQuoteToken : any;
let makerAassetToken : any;
let makerAquoteToken : any;
let makerBassetToken : any;
let makerBquoteToken : any;
let makerCassetToken : any;
let makerCquoteToken : any;
let marketMakerA : Keypair;
let marketMakerB : Keypair;
let marketMakerC : Keypair;
let taker : Keypair;
const TAKER_ORDER_AMOUNT = new anchor.BN(10); // order to buy 10 asset tokens for XX? quote tokens
const MAKER_A_ASK_AMOUNT = new anchor.BN(120);
const MAKER_B_ASK_AMOUNT = new anchor.BN(110); // winning maker
const MAKER_B_BID_AMOUNT = new anchor.BN(105);
const MAKER_C_ASK_AMOUNT = new anchor.BN(120);
const MAKER_C_BID_AMOUNT = new anchor.BN(90);
const MINT_AIRDROP = 100000;

anchor.setProvider(anchor.Provider.env());
const provider = anchor.getProvider();
const program = anchor.workspace.Rfq as Program<Rfq>;


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
    console.log('main wallet balance: ', walletBalance);
    const mintAuthorityBalance = await provider.connection.getBalance(mintAuthority.publicKey);
    console.log('mint wallet balance: ', mintAuthorityBalance);

    assetMint = await spl.Token.createMint(program.provider.connection,
      mintAuthority,
      mintAuthority.publicKey,
      mintAuthority.publicKey,
      0,
      spl.TOKEN_PROGRAM_ID);

    quoteMint = await spl.Token.createMint(program.provider.connection,
      mintAuthority,
      mintAuthority.publicKey,
      mintAuthority.publicKey,
      0,
      spl.TOKEN_PROGRAM_ID)

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

  it('Initializes protocol', async () => {
    const feeDenominator = 1_000;
    const feeNumerator = 0;
    const { tx, state } = await initializeProtocol(provider, taker, feeDenominator, feeNumerator);
    assert.ok(state.rfqCount.eq(new anchor.BN(0)));
    assert.ok(state.titles.length === 0);
  });

  it('Initializes one RFQ', async () => {  
    const title = "rfq with timeout";
    const requestOrderType = 1; // buy
    const instrument = 1;
    const expiry = new anchor.BN(-1);
    const amount = TAKER_ORDER_AMOUNT;

    const {tx, state} = await request(provider, taker, title, requestOrderType, instrument, expiry, amount);

    const [protocolPda, _protocolBump] = await getPda(provider, 'convergence_rfq');
    const protocol = await program.account.protocol.fetch(protocolPda);
  });

  it('responds to RFQ and times out', async() => {
    const title = "rfq with timeout";
    const zero = new anchor.BN(0);

    setTimeout(() => {
      console.log('delay of 500ms');
    }, 500);

    try {
      const state = await respond(provider, marketMakerA, title, zero, MAKER_A_ASK_AMOUNT, makerAassetToken, makerAquoteToken);
      const timeBegin = state.timeBegin;
      const timeResponse = state.timeResponse;
      console.log('time delay: ', timeResponse - timeBegin);
    } catch (err) {
      console.log(err);
    }
    
  })

  it('Initializes new RFQ', async () => {  
    const title = "test rfq";
    const requestOrderType = 1; // buy
    const instrument = 1;
    const expiry = new anchor.BN(1000);
    const amount = TAKER_ORDER_AMOUNT;

    const {tx, state} = await request(provider, taker, title, requestOrderType, instrument, expiry, amount);
    assert.equal(state.expired, false);
    assert.equal(state.requestOrderType, requestOrderType);
    assert.equal(state.instrument, instrument);
    assert.equal(state.expiry.toString(), expiry.toString());

    const assetMintBalance = await getBalance(taker, assetMint.publicKey);
    const quoteMintBalance = await getBalance(taker, quoteMint.publicKey);
    
    console.log('taker order type: ', state.requestOrderType);
    console.log('taker amount: ', state.orderAmount.toString());
    console.log('taker asset balance(init): ', assetMintBalance);
    console.log('taker quote balance(init): ', quoteMintBalance);
  });
  
  it('responds to RFQ', async() => {
    const title = "test rfq";
    const zero = new anchor.BN(0);

    const state = await respond(provider, marketMakerA, title, zero, MAKER_A_ASK_AMOUNT, makerAassetToken, makerAquoteToken);
    console.log('response two-way ask: ', state.bestAskAmount.toString());
    console.log('response two-way bid: ', state.bestBidAmount.toString());

    const state2 = await respond(provider, marketMakerB, title, MAKER_B_BID_AMOUNT, MAKER_B_ASK_AMOUNT, makerBassetToken, makerBquoteToken);
    console.log('response two-way ask: ', state2.bestAskAmount.toString());
    console.log('response two-way bid: ', state2.bestBidAmount.toString());

    let state3 = await respond(provider, marketMakerC, title, MAKER_C_BID_AMOUNT, MAKER_C_ASK_AMOUNT, makerCassetToken, makerCquoteToken);

    assert.equal(state.bestAskAmount.toString(), MAKER_A_ASK_AMOUNT.toString());
    assert.equal(state3.bestAskAmount.toString(), MAKER_B_ASK_AMOUNT.toString());
    assert.equal(state3.bestBidAmount.toString(), MAKER_B_BID_AMOUNT.toString());

    const makerAassetBalance = await getBalance(marketMakerA, assetMint.publicKey);
    const makerAquoteBalance = await getBalance(marketMakerA, quoteMint.publicKey);
    console.log('maker A asset (response): ', makerAassetBalance);
    console.log('maker A quote (response): ', makerAquoteBalance);

    const makerBassetBalance = await getBalance(marketMakerB, assetMint.publicKey);
    const makerBquoteBalance = await getBalance(marketMakerB, quoteMint.publicKey);
    console.log('maker B asset (response): ', makerBassetBalance);
    console.log('maker B quote (response): ', makerBquoteBalance);
  })

  
  it('confirms -> taker confirms RFQ price (pre-settlement)', async() => {
    const title = "test rfq";
    const confirmOrderType = 1;

    const state = await confirm(provider, title, confirmOrderType, taker, authorityAssetToken, authorityQuoteToken);
    console.log('best ask(confirm): ', state.bestAskAmount.toNumber());
    console.log('best bid(confirm): ', state.bestBidAmount.toNumber());

    const assetMintBalance = await getBalance(taker, assetMint.publicKey);
    const quoteMintBalance = await getBalance(taker, quoteMint.publicKey);
    
    console.log('taker asset balance(confirm): ', assetMintBalance);
    console.log('taker quote balance(confirm): ', quoteMintBalance);
    
    assert.equal(assetMintBalance, 0);
    assert.equal(quoteMintBalance, 100_000 - MAKER_B_ASK_AMOUNT.toNumber());
    assert.equal(state.confirmed, true);
  })

  it('maker last look', async() => {
    const title = "test rfq";

    const rfqState1 = await lastLook(provider, marketMakerA, title);
    const rfqState2 = await lastLook(provider, marketMakerB, title);
    const rfqState3 = await lastLook(provider, marketMakerC, title);

    console.log('bestAsk (approve): ', rfqState2.bestAskAmount.toString());
    console.log('bestBid (approve): ', rfqState2.bestBidAmount.toString());
    console.log('confirm order type: ', rfqState2.confirmOrderType.toString());

    assert.equal(rfqState1.approved, false);
    assert.equal(rfqState2.approved, true);
    assert.equal(rfqState3.approved, true);
  })

  it('returns collateral', async() => {
    const title = "test rfq";
    
    const state = await returnCollateral(provider, taker, title, authorityAssetToken, authorityQuoteToken);
    const state1 = await returnCollateral(provider, marketMakerA, title, makerAassetToken, makerAquoteToken);
    const state2 = await returnCollateral(provider, marketMakerB, title, makerBassetToken, makerBquoteToken);
    const state3 = await returnCollateral(provider, marketMakerC, title, makerCassetToken, makerCquoteToken);

    const takerAassetBalance = await getBalance(taker, assetMint.publicKey);
    const takerAquoteBalance = await getBalance(taker, quoteMint.publicKey);
    console.log('taker asset balance(collateral): ', takerAassetBalance);
    console.log('taker quote balance(collateral): ', takerAquoteBalance);

    const makerAassetBalance = await getBalance(marketMakerA, assetMint.publicKey);
    const makerAquoteBalance = await getBalance(marketMakerA, quoteMint.publicKey);
    console.log('maker A asset balance(collateral): ', makerAassetBalance);
    console.log('maker A quote balance(collateral): ', makerAquoteBalance);

    const makerBassetBalance = await getBalance(marketMakerB, assetMint.publicKey);
    const makerBquoteBalance = await getBalance(marketMakerB, quoteMint.publicKey);
    console.log('maker B asset balance(collateral): ', makerBassetBalance);
    console.log('maker B quote balance(collateral): ', makerBquoteBalance);

    const makerCassetBalance = await getBalance(marketMakerC, assetMint.publicKey);
    const makerCquoteBalance = await getBalance(marketMakerC, quoteMint.publicKey);
    console.log('maker C asset balance(collateral): ', makerCassetBalance);
    console.log('maker C quote balance(collateral): ', makerCquoteBalance);
  })

  it('settles', async() => {
    const title = "test rfq";
    
    const state = await settle(provider, taker, title, authorityAssetToken, authorityQuoteToken);
    const state1 = await settle(provider, marketMakerA, title, makerAassetToken, makerAquoteToken);
    const state2 = await settle(provider, marketMakerB, title, makerBassetToken, makerBquoteToken);

    const takerAssetBalance = await getBalance(taker, assetMint.publicKey);
    const takerQuoteBalance = await getBalance(taker, quoteMint.publicKey);

    const makerAassetBalance = await getBalance(marketMakerA, assetMint.publicKey);
    const makerAquoteBalance = await getBalance(marketMakerA, quoteMint.publicKey);
    const makerBassetBalance = await getBalance(marketMakerB, assetMint.publicKey);
    const makerBquoteBalance = await getBalance(marketMakerB, quoteMint.publicKey);
    const makerCassetBalance = await getBalance(marketMakerC, assetMint.publicKey);
    const makerCquoteBalance = await getBalance(marketMakerC, quoteMint.publicKey);
    
    assert.equal(makerAassetBalance, MINT_AIRDROP);
    assert.equal(makerAquoteBalance, MINT_AIRDROP);
    assert.equal(makerBassetBalance, MINT_AIRDROP - TAKER_ORDER_AMOUNT.toNumber());
    assert.equal(makerBquoteBalance, MINT_AIRDROP + MAKER_B_ASK_AMOUNT.toNumber());

    console.log('taker asset balance(settle): ', takerAssetBalance);
    console.log('taker quote balance(settle): ', takerQuoteBalance);
    console.log('maker A asset balance(settle): ', makerAassetBalance);
    console.log('maker A quote balance(settle): ', makerAquoteBalance);
    console.log('maker B asset balance(settle): ', makerBassetBalance);
    console.log('maker B quote balance(settle): ', makerBquoteBalance);
    console.log('maker C asset balance(settle): ', makerCassetBalance);
    console.log('maker C quote balance(settle): ', makerCquoteBalance);
  })

  it('view RFQ state', async() => {
    const title = 'test rfq';

    const titles = await getLiveRFQs(provider);
    console.log('RFQ titles: ', titles);
  })

});






export async function getLiveRFQs(provider: Provider): Promise<any> {
  const program = await getProgram(provider);
  const [protocolPda, _protocolBump] = await getPda(provider, 'convergence_rfq');
  const protocol = await program.account.protocol.fetch(protocolPda);
  return protocol.titles;
}


export async function lastLook(
  provider: Provider,
  authority: any,
  title: string,
): Promise<any> {

  const program = await getProgram(provider);

  const [rfqPDA, _rfqBump] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from("rfq_state"), Buffer.from(title.slice(0, 32))],
    program.programId
  );
  
  const [orderPDA, _orderBump] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from("order_state"), authority.publicKey.toBytes()],
    program.programId
  );
  
  const tx = await program.rpc.lastLook(
    title,
  {
    accounts: {
      authority: authority.publicKey,
      orderState: orderPDA,
      rfqState: rfqPDA,
      systemProgram: anchor.web3.SystemProgram.programId,
    },
    signers: [authority],
  });

  const rfqState = await program.account.rfqState.fetch(rfqPDA);
  const orderState = await program.account.orderState.fetch(orderPDA);
  return rfqState;
}


export async function returnCollateral(
  provider: Provider,
  authority: any,
  title: string,
  assetToken: spl.Token,
  quoteToken: spl.Token,
): Promise<any> {

  const program = await getProgram(provider);

  const [rfqPDA, _rfqBump] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from("rfq_state"), Buffer.from(title.slice(0, 32))],
    program.programId
  );
  
  const [escrowAssetTokenPDA, _escrowAssetTokenBump] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from("escrow_asset"), Buffer.from(title.slice(0, 32))],
    program.programId
  );
  const [escrowQuoteTokenPDA, _escrowQuoteTokenPDA] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from("escrow_quote"), Buffer.from(title.slice(0, 32))],
    program.programId
  );
  const [orderPDA, _orderBump] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from("order_state"), authority.publicKey.toBytes()],
    program.programId
  );
  
  const tx = await program.rpc.returnCollateral(
    title,
  {
    accounts: {
      authority: authority.publicKey,
      orderState: orderPDA,
      rfqState: rfqPDA,
      assetToken: assetToken,
      quoteToken: quoteToken,
      assetMint: assetMint.publicKey,
      quoteMint: quoteMint.publicKey,
      escrowAssetToken: escrowAssetTokenPDA,
      escrowQuoteToken: escrowQuoteTokenPDA,
      systemProgram: anchor.web3.SystemProgram.programId,
      tokenProgram: spl.TOKEN_PROGRAM_ID,
      associatedTokenProgram: spl.ASSOCIATED_TOKEN_PROGRAM_ID,
      rent: anchor.web3.SYSVAR_RENT_PUBKEY,
    },
    signers: [authority],
  });

  const state = await program.account.rfqState.fetch(rfqPDA);
  return state;
}


export async function settle(
  provider: Provider,
  authority: any,
  title: string,
  assetToken: spl.Token,
  quoteToken: spl.Token,
): Promise<any> {

  const program = await getProgram(provider);

  const [protocolPda, _protocolBump] = await getPda(provider, 'convergence_rfq');
  const [rfqPDA, _rfqBump] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from("rfq_state"), Buffer.from(title.slice(0, 32))],
    program.programId
  );
  
  const [escrowAssetTokenPDA, _escrowAssetTokenBump] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from("escrow_asset"), Buffer.from(title.slice(0, 32))],
    program.programId
  );
  const [escrowQuoteTokenPDA, _escrowQuoteTokenPDA] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from("escrow_quote"), Buffer.from(title.slice(0, 32))],
    program.programId
  );
  const [orderPDA, _orderBump] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from("order_state"), authority.publicKey.toBytes()],
    program.programId
  );
  
  const tx = await program.rpc.settle(
    title,
  {
    accounts: {
      authority: authority.publicKey,
      orderState: orderPDA,
      rfqState: rfqPDA,
      protocol: protocolPda,
      assetToken: assetToken,
      quoteToken: quoteToken,
      assetMint: assetMint.publicKey,
      quoteMint: quoteMint.publicKey,
      escrowAssetToken: escrowAssetTokenPDA,
      escrowQuoteToken: escrowQuoteTokenPDA,
      systemProgram: anchor.web3.SystemProgram.programId,
      tokenProgram: spl.TOKEN_PROGRAM_ID,
      associatedTokenProgram: spl.ASSOCIATED_TOKEN_PROGRAM_ID,
      rent: anchor.web3.SYSVAR_RENT_PUBKEY,
    },
    signers: [authority],
  });

  const state = await program.account.rfqState.fetch(rfqPDA);
  return state;
}

export async function confirm(
  provider: Provider,
  title: String,
  confirmOrderType: number,
  authority: Keypair,
  assetToken: spl.Token,
  quoteToken: spl.Token,
): Promise<any> {

  const program = await getProgram(provider);

  const [rfqPDA, _rfqBump] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from("rfq_state"), Buffer.from(title.slice(0, 32))],
    program.programId
  );
  const [escrowAssetTokenPDA, _escrowAssetTokenBump] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from("escrow_asset"), Buffer.from(title.slice(0, 32))],
    program.programId
  );
  const [escrowQuoteTokenPDA, _escrowQuoteTokenPDA] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from("escrow_quote"), Buffer.from(title.slice(0, 32))],
    program.programId
  );
  
  const tx = await program.rpc.confirm(
    title,
    confirmOrderType,
  {
    accounts: {
      authority: authority.publicKey,
      rfqState: rfqPDA,
      assetToken: assetToken,
      quoteToken: quoteToken,
      escrowAssetToken: escrowAssetTokenPDA,
      escrowQuoteToken: escrowQuoteTokenPDA,
      assetMint: assetMint.publicKey,
      quoteMint: quoteMint.publicKey,
      
      systemProgram: anchor.web3.SystemProgram.programId,
      tokenProgram: spl.TOKEN_PROGRAM_ID,
      associatedTokenProgram: spl.ASSOCIATED_TOKEN_PROGRAM_ID,
      rent: anchor.web3.SYSVAR_RENT_PUBKEY,
    },
    signers: [authority],
  });

  const state = await program.account.rfqState.fetch(rfqPDA);
  return state;
}

export async function respond(
  provider: Provider,
  authority: Keypair,
  title: string,
  bid: anchor.BN,
  ask: anchor.BN,
  assetToken: spl.Token,
  quoteToken: spl.Token
): Promise<any> {

  const program = await getProgram(provider);

  const [rfqPDA, _rfqBump] = await anchor.web3.PublicKey.findProgramAddress(
    //[Buffer.from("rfq_state"), provider.wallet.publicKey.toBytes(), Buffer.from(title.slice(0, 32))],
    [Buffer.from("rfq_state"), Buffer.from(title.slice(0, 32))],
    program.programId
  );
  const [escrowAssetTokenPDA, _escrowAssetTokenBump] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from("escrow_asset"), Buffer.from(title.slice(0, 32))],
    program.programId
  );
  const [escrowQuoteTokenPDA, _escrowQuoteTokenPDA] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from("escrow_quote"), Buffer.from(title.slice(0, 32))],
    program.programId
  );
  const [orderPDA, _orderBump] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from("order_state"), authority.publicKey.toBytes()],
    program.programId
  );
  
  const tx = await program.rpc.respond(
    title,
    bid,
    ask,
  {
    accounts: {
      authority: authority.publicKey,
      orderState: orderPDA,
      rfqState: rfqPDA,
      assetToken: assetToken,
      quoteToken: quoteToken,
      escrowAssetToken: escrowAssetTokenPDA,
      escrowQuoteToken: escrowQuoteTokenPDA,
      assetMint: assetMint.publicKey,
      quoteMint: quoteMint.publicKey,
      
      systemProgram: anchor.web3.SystemProgram.programId,
      tokenProgram: spl.TOKEN_PROGRAM_ID,
      associatedTokenProgram: spl.ASSOCIATED_TOKEN_PROGRAM_ID,
      rent: anchor.web3.SYSVAR_RENT_PUBKEY,
    },
    signers: [authority],
  });

  const state = await program.account.rfqState.fetch(rfqPDA);
  return state;
}


export async function request(
  provider: Provider,
  authority: Keypair,
  title: string,
  requestOrderType: number,
  instrument: number,
  expiry: anchor.BN,
  amount: anchor.BN
): Promise<any> {

  const program = await getProgram(provider);
  console.log("program", program.programId);
  
  const [protocolPda, _protocolBump] = await getPda(provider, 'convergence_rfq');
  const [rfqPDA, _rfqBump] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from("rfq_state"), Buffer.from(title.slice(0, 32))],
    program.programId
  );
  const [orderPDA, _orderBump] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from("order_state"), authority.publicKey.toBytes()],
    program.programId
  );

  const tx = await program.rpc.request(
    title,
    requestOrderType,
    instrument,
    expiry,
    amount,
  {
    accounts: {
      authority: authority.publicKey,
      orderState: orderPDA,
      rfqState: rfqPDA,
      protocol: protocolPda,
      systemProgram: anchor.web3.SystemProgram.programId,
      tokenProgram: spl.TOKEN_PROGRAM_ID,
      associatedTokenProgram: spl.ASSOCIATED_TOKEN_PROGRAM_ID,
      rent: anchor.web3.SYSVAR_RENT_PUBKEY,
    },
    signers: [authority],
  });

  const state = await program.account.rfqState.fetch(rfqPDA);
  return { tx, state };
}

export async function initializeProtocol(
  provider: Provider,
  authority: Keypair,
  feeDenominator: number,
  feeNumerator: number
): Promise<any> {

  const program = await getProgram(provider);
  console.log("program", program.programId);
  const [protocolPda, _protocolBump] = await getPda(provider, 'convergence_rfq');
  const tx = await program.rpc.initialize(
    new anchor.BN(feeDenominator), 
    new anchor.BN(feeNumerator), 
    {
    accounts: {
      authority: authority.publicKey,
      protocol: protocolPda,
      systemProgram: anchor.web3.SystemProgram.programId
    },
    signers: [authority],
  });
  const state = await program.account.protocol.fetch(protocolPda)
  return { tx, state };
}

export async function getPda(provider: any, seed: string): Promise<any> {
  const program = await getProgram(provider);
  const [protocolPda, protocolBump] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from(anchor.utils.bytes.utf8.encode(seed))],
    program.programId
  );
  return [protocolPda, protocolBump];
}

export async function getProgram(provider: Provider): Promise<any> {
  const programId = new anchor.web3.PublicKey(idl.metadata.address);
  // @ts-ignoreå
  return new anchor.Program(idl, programId, provider);
}

export const toBuffer = (x: any) => {
  console.log("boogie woogie: ", x);
  return Buffer.from(anchor.utils.bytes.utf8.encode(x));
}

export async function requestAirdrop(
  provider: anchor.Provider,
  publicKey: anchor.web3.PublicKey,
  lamports: number
): Promise<void> {
  await provider.connection.confirmTransaction(
    await provider.connection.requestAirdrop(publicKey, lamports),
    "confirmed"
  );
}

const getBalance = async (payer, mint) => {
  try {
    const parsedAccount = await program.provider.connection.getParsedTokenAccountsByOwner(payer.publicKey, { mint, });
  
    return parsedAccount.value[0].account.data.parsed.info.tokenAmount.uiAmount;
  } catch (error) {
    console.log("No mints found for wallet");
  }
}



/*
taker wants to quote 10 MNGO tokens in USDC

maker A makes one-way market, 10 MNGO at 100/* USDC, deposits 100 USDC as collateral
maker B makes two-way market, 10 MNGO at 105/110 USDC, deposits 105 USDC and 110 USDC as collateral
maker C makes two-way market, 10 MGNO at 90/120 USDC, deposits 90 USDC and 120 USDC as collateral

taker reveals he wants to buy 10 MNGO
maker B is winner at 110
taker deposits 110 USDC as collateral

return collateral:
- A gets 100 USDC back
- B gets 105 USDC back
- C gets 90 USDC and 120 USDC back

last look:
- set to true

settle:
taker gets 10 MNGO
maker B gets 110 USDC


TODO:
- Add direction of order in respond, right now assumes it knows direction of request
- fees
- view different RFQs by title
- 

*/