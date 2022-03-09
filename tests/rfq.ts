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
let marketMakerA : Keypair;
let marketMakerB : Keypair;
let taker : Keypair;

// Configure the client to use the local cluster.
anchor.setProvider(anchor.Provider.env());
const provider = anchor.getProvider();
const program = anchor.workspace.Rfq as Program<Rfq>;


describe('rfq', () => {
  before(async () => {
    mintAuthority = anchor.web3.Keypair.generate();
    marketMakerA = anchor.web3.Keypair.generate();
    marketMakerB = anchor.web3.Keypair.generate();
    taker = anchor.web3.Keypair.generate();

    await requestAirdrop(provider, taker.publicKey, 10_000_000_000);
    await requestAirdrop(provider, mintAuthority.publicKey, 10_000_000_000);
    await requestAirdrop(provider, marketMakerA.publicKey, 10_000_000_000);
    await requestAirdrop(provider, marketMakerB.publicKey, 10_000_000_000);
      
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

    await assetMint.mintTo(authorityAssetToken, mintAuthority.publicKey, [], 10_000_000_000);
    await quoteMint.mintTo(authorityQuoteToken, mintAuthority.publicKey, [], 10_000_000_000);
    await assetMint.mintTo(makerAassetToken, mintAuthority.publicKey, [], 10_000_000_000);
    await quoteMint.mintTo(makerAquoteToken, mintAuthority.publicKey, [], 10_000_000_000);
    await assetMint.mintTo(makerBassetToken, mintAuthority.publicKey, [], 10_000_000_000);
    await quoteMint.mintTo(makerBquoteToken, mintAuthority.publicKey, [], 10_000_000_000);
  });

  it('Initializes', async () => {
    const feeDenominator = 1_000;
    const feeNumerator = 3;
    const { tx, state } = await initializeProtocol(provider, taker, feeDenominator, feeNumerator);
    assert.ok(state.rfqCount.eq(new anchor.BN(0)));
  });

  it('Initializes new RFQ', async () => {  
    const title = "test rfq";
    const takerOrderType = 1; // buy
    const instrument = 1;
    const expiry = new anchor.BN(10_000);
    const ratio = 1;
    const nOfLegs = 1;
    const amount = new anchor.BN(10_000);

    const {tx, state} = await request(provider, taker, title, takerOrderType, instrument, expiry, ratio, nOfLegs, amount);
    assert.equal(state.expired, false);
    assert.equal(state.ratio, ratio);
    assert.equal(state.takerOrderType, takerOrderType);
    assert.equal(state.instrument, instrument);
    assert.equal(state.expiry.toString(), expiry.toString());
    assert.equal(state.nOfLegs, nOfLegs);

    const assetMintBalance = await getBalance(taker, assetMint.publicKey);
    const quoteMintBalance = await getBalance(taker, quoteMint.publicKey);
    
    console.log('taker asset balance(init): ', assetMintBalance);
    console.log('taker quote balance(init): ', quoteMintBalance);
  });

  it('responds to RFQ', async() => {
    const title = "test rfq";
    const orderType = 1;
    const price = new anchor.BN(100);
    const price2 = new anchor.BN(110);
    const amount = new anchor.BN(10_000);

    const state = await respond(provider, marketMakerA, title, orderType, price, amount, makerAassetToken, makerAquoteToken);
    assert.equal(state.orderCount, 1);
    assert.equal(state.bestBid.toString(), price.toString());
    assert.equal(state.bestAsk.toString(), (new anchor.BN(0).toString()));

    const state2 = await respond(provider, marketMakerB, title, orderType, price2, amount, makerBassetToken, makerBquoteToken);
    assert.equal(state2.orderCount, 2);
    assert.equal(state2.bestBid.toString(), price2.toString());
    assert.equal(state2.bestAsk.toString(), (new anchor.BN(0).toString()));

    const mmAssetBalance = await getBalance(marketMakerB, assetMint.publicKey);
    const mmQuoteBalance = await getBalance(marketMakerB, quoteMint.publicKey);
    console.log('mm asset: ', mmAssetBalance);
    console.log('mm quote: ', mmQuoteBalance);
  })

  it('confirms -> taker confirms RFQ price (pre-settlement)', async() => {
    const title = "test rfq";
    const orderType = 2;

    const state = await confirm(provider, title, taker, authorityAssetToken, authorityQuoteToken);

    const assetMintBalance = await getBalance(taker, assetMint.publicKey);
    const quoteMintBalance = await getBalance(taker, quoteMint.publicKey);
    
    console.log('taker asset balance(confirm): ', assetMintBalance);
    console.log('taker quote balance(confirm): ', quoteMintBalance);
    
    assert.equal(assetMintBalance, 10000000000);
    assert.equal(quoteMintBalance, 9999990000);
    assert.equal(state.orderCount, 2);
    assert.equal(state.confirmed, true);
  })

  it('settles', async() => {
    const title = "test rfq";
    
    const state = await settle(provider, taker, title, authorityAssetToken, authorityQuoteToken);
    //const state1 = await settle(provider, marketMakerA, title, makerAassetToken, makerAquoteToken);
    //const state2 = await settle(provider, marketMakerB, title, makerBassetToken, makerBquoteToken);

    const takerAssetBalance = await getBalance(taker, assetMint.publicKey);
    const takerQuoteBalance = await getBalance(taker, quoteMint.publicKey);
    
    console.log('taker asset balance(settle): ', takerAssetBalance);
    console.log('taker quote balance(settle): ', takerQuoteBalance);
  })

  /*
  it('place limit orders', async () => {
    const action = true; // buy
    const price = new anchor.BN(1000);
    const price2 = new anchor.BN(200);
    const amount = new anchor.BN(10);
    const title = "test rfq";
    //const { _assetToken, assetMint } = await getNewTokenAndMint(program, provider.wallet);
    //const balanceBeforeCancel = await getBalance(provider.wallet, assetMint.publicKey);
    const state = await placeLimitOrder(provider, title, true, price, amount, assetMint, authorityAssetToken);
    
    assert.equal(state.bids[0].toString(), price.toString());
    const state2 = await placeLimitOrder(provider, title, true, price2, amount, assetMint, authorityAssetToken);
    assert.equal(state2.bids[0].toString(), price2.toString());
    assert.equal(state2.bids[1].toString(), price.toString());
    
    const balanceAfterCancel = await getBalance(provider.wallet, assetMint.publicKey);
    console.log('balance before cancel: ', balanceBeforeCancel);
    console.log('balance after cancel: ', balanceAfterCancel);
    assert.equal(balanceAfterCancel, 9_999_999_980)
  });
  */
  
});



export async function settle(
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
    [Buffer.from("escrow_asset"), authority.publicKey.toBytes(), Buffer.from(title.slice(0, 32))],
    program.programId
  );
  const [escrowQuoteTokenPDA, _escrowQuoteTokenPDA] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from("escrow_quote"), authority.publicKey.toBytes(), Buffer.from(title.slice(0, 32))],
    program.programId
  );
  
  
  const tx = await program.rpc.settle(
    title,
  {
    accounts: {
      authority: authority.publicKey,
      rfqState: rfqPDA,
      assetToken: assetToken,
      quoteToken: quoteToken,
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

export async function confirm(
  provider: Provider,
  title: String,
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
    [Buffer.from("escrow_asset"), authority.publicKey.toBytes(), Buffer.from(title.slice(0, 32))],
    program.programId
  );
  const [escrowQuoteTokenPDA, _escrowQuoteTokenPDA] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from("escrow_quote"), authority.publicKey.toBytes(), Buffer.from(title.slice(0, 32))],
    program.programId
  );
  
  const tx = await program.rpc.confirm(
    title,
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
  maker: Keypair,
  title: string,
  orderType: number,
  price: anchor.BN,
  amount: anchor.BN,
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
    [Buffer.from("escrow_asset"), maker.publicKey.toBytes(), Buffer.from(title.slice(0, 32))],
    program.programId
  );
  const [escrowQuoteTokenPDA, _escrowQuoteTokenPDA] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from("escrow_quote"), maker.publicKey.toBytes(), Buffer.from(title.slice(0, 32))],
    program.programId
  );
  
  const tx = await program.rpc.respond(
    title,
    orderType,
    price,
    amount,
  {
    accounts: {
      authority: maker.publicKey,
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
    signers: [maker],
  });

  const state = await program.account.rfqState.fetch(rfqPDA);
  return state;
}


export async function request(
  provider: Provider,
  authority: Keypair,
  title: string,
  takeOrderType: number,
  instrument: number,
  expiry: anchor.BN,
  ratio: number,
  nOfLegs: number,
  amount: anchor.BN
): Promise<any> {

  const program = await getProgram(provider);
  console.log("program", program.programId);
  
  const [orderBookPDA, _orderBookBump] = await getPda(provider, 'order_book_state');
  const [rfqPDA, _rfqBump] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from("rfq_state"), Buffer.from(title.slice(0, 32))],
    program.programId
  );

  const tx = await program.rpc.request(
    title,
    takeOrderType,
    instrument,
    expiry,
    ratio,
    nOfLegs,
    amount,
  {
    accounts: {
      authority: authority.publicKey,
      assetMint: assetMint.publicKey,
      quoteMint: quoteMint.publicKey,
      rfqState: rfqPDA,
      
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
  const tx = await program.rpc.initialize(new anchor.BN(feeDenominator), new anchor.BN(feeNumerator), {
    accounts: {
      authority: authority.publicKey,
      protocol: protocolPda,
      systemProgram: anchor.web3.SystemProgram.programId
    },
    signers: [authority],
  });
  const state = await program.account.globalState.fetch(protocolPda)
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
export async function getNewTokenAndMint(program, payer): Promise<any> {
  const assetMintAuthority = anchor.web3.Keypair.generate();
  await requestAirdrop(program.provider, assetMintAuthority.publicKey, 10_000_000_000);
  await requestAirdrop(program.provider, payer.publicKey, 10_000_000_000);

  const assetMint = await Token.createMint(program.provider.connection,
    assetMintAuthority,
    assetMintAuthority.publicKey,
    assetMintAuthority.publicKey,
    0,
    spl.TOKEN_PROGRAM_ID);

  const authorityAssetToken = await assetMint.createAssociatedTokenAccount(
      payer.publicKey,
  );
  return {authorityAssetToken, assetMint}
}
*/


/*
1. reqest:   taker requests to buy 1 AAPL.
2. respond:  maker 1 responds with price=110 USD, posts 1 AAPL collateral into common AAPL vault.
3. respond:  maker 2 responds with price=100 USD, posts 1 AAPL collateral into common AAPL vault. maker 2 is recorded as winner.
4. confirm:  taker confirms, posts 100 USD collateral into common USD vault.
5. approve:  maker approves, trade is recorded as approved.
5. settle:   taker gets 1 AAPL, maker 2 gets 100 USD. (the program knows taker's address, winner's address, taker amount, and winner's amount)
6. return:   maker 1 gets 1 AAPL. (everyone else that was part of the program, gets their collateral back)
  
  how do we know which makers participated and who's the winner? 
  1. record addresses in a vector, check those in settle/return funcs
  2. have unique PDAs for each maker, each PDA's authority is maker. 
      if winner, receive collateral and USD. ===> more elegant, secure?
      requires settle function to know the address of the winner
  


*/