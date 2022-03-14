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
const TAKER_ORDER_AMOUNT = new anchor.BN(10);
const MAKER_A_QUOTE_AMOUNT = new anchor.BN(11000);
const MAKER_B_QUOTE_AMOUNT = new anchor.BN(10000);
const MINT_AIRDROP = 100000;

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

    //await assetMint.mintTo(authorityAssetToken, mintAuthority.publicKey, [], MINT_AIRDROP);
    await quoteMint.mintTo(authorityQuoteToken, mintAuthority.publicKey, [], MINT_AIRDROP);
    await assetMint.mintTo(makerAassetToken, mintAuthority.publicKey, [], MINT_AIRDROP);
    await quoteMint.mintTo(makerAquoteToken, mintAuthority.publicKey, [], MINT_AIRDROP);
    await assetMint.mintTo(makerBassetToken, mintAuthority.publicKey, [], MINT_AIRDROP);
    await quoteMint.mintTo(makerBquoteToken, mintAuthority.publicKey, [], MINT_AIRDROP);
  });

  it('Initializes', async () => {
    const feeDenominator = 1_000;
    const feeNumerator = 3;
    const { tx, state } = await initializeProtocol(provider, taker, feeDenominator, feeNumerator);
    assert.ok(state.rfqCount.eq(new anchor.BN(0)));
  });

  it('Initializes RFQ for timeout', async () => {  
    const title = "rfq with timeout";
    const requestOrderType = 1; // buy
    const instrument = 1;
    const expiry = new anchor.BN(-1);
    const amount = TAKER_ORDER_AMOUNT;

    const {tx, state} = await request(provider, taker, title, requestOrderType, instrument, expiry, amount);
  });

  it('responds to RFQ and times out', async() => {
    const title = "rfq with timeout";
    const amount = MAKER_A_QUOTE_AMOUNT;

    setTimeout(() => {
      console.log('delay of 500ms');
    }, 500);

    try {
      const state = await respond(provider, marketMakerA, title, amount, makerAassetToken, makerAquoteToken);
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
    const amount = MAKER_A_QUOTE_AMOUNT;
    const amount2 = MAKER_B_QUOTE_AMOUNT;

    const state = await respond(provider, marketMakerA, title, amount, makerAassetToken, makerAquoteToken);
    //assert.equal(state.bestAskAmount.toString(), amount.toString());

    const state2 = await respond(provider, marketMakerB, title, amount2, makerBassetToken, makerBquoteToken);
    assert.equal(state.bestAskAmount.toString(), amount.toString());
    assert.equal(state2.bestAskAmount.toString(), amount2.toString());

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

    const assetMintBalance = await getBalance(taker, assetMint.publicKey);
    const quoteMintBalance = await getBalance(taker, quoteMint.publicKey);
    
    console.log('taker asset balance(confirm): ', assetMintBalance);
    console.log('taker quote balance(confirm): ', quoteMintBalance);
    
    assert.equal(assetMintBalance, 0);
    assert.equal(quoteMintBalance, 100_000 - MAKER_B_QUOTE_AMOUNT.toNumber());
    assert.equal(state.confirmed, true);
  })

  it('approves -> maker approves (last look)', async() => {
    const title = "test rfq";

    const state = await approve(provider, marketMakerB, title);
    
    assert.equal(state.approved, true);
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
    
    assert.equal(makerAassetBalance, MINT_AIRDROP);
    assert.equal(makerAquoteBalance, MINT_AIRDROP);
    assert.equal(makerBassetBalance, MINT_AIRDROP - TAKER_ORDER_AMOUNT.toNumber());
    assert.equal(makerBquoteBalance, MINT_AIRDROP + MAKER_B_QUOTE_AMOUNT.toNumber());

    console.log('taker asset balance(settle): ', takerAssetBalance);
    console.log('taker quote balance(settle): ', takerQuoteBalance);
    console.log('maker A asset balance(settle): ', makerAassetBalance);
    console.log('maker A quote balance(settle): ', makerAquoteBalance);
    console.log('maker B asset balance(settle): ', makerBassetBalance);
    console.log('maker B quote balance(settle): ', makerBquoteBalance);
  })
  

});

export async function approve(
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
  
  const tx = await program.rpc.approve(
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
    amount,
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
  
  //const [orderBookPDA, _orderBookBump] = await getPda(provider, 'order_book_state');
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
