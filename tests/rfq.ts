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

let assetMint : spl.Token;
let quoteMint : spl.Token;
const mintAuthority = anchor.web3.Keypair.generate();

// Configure the client to use the local cluster.
anchor.setProvider(anchor.Provider.env());
const provider = anchor.getProvider();
const program = anchor.workspace.Rfq as Program<Rfq>;

describe('rfq', () => {
  before(async () => {
    
  });

  it('Initializes', async () => {
    const feeDenominator = 1_000;
    const feeNumerator = 3;
    const { tx, state } = await initializeProtocol(provider, feeDenominator, feeNumerator);
    console.log(state.rfqCount);
    assert.ok(state.rfqCount.eq(new anchor.BN(0)));
    console.log("Your transaction signature");
    console.log('asssetMint: ', assetMint);
  });

  it('Initializes new RFQ', async () => {
    const action = true;
    const instrument = 1;
    const rfqExpiry = new anchor.BN(1000);
    const strike = new anchor.BN(100);
    const ratio = 1;
    const nOfLegs = 1;

    const {tx, state} = await initializeRfq(provider, action, instrument, rfqExpiry, strike, ratio, nOfLegs); 
    assert.equal(state.action, action);
    assert.equal(state.ratio, ratio);
  });

  it('place limit orders', async () => {
    const action = true; // buy
    const price = new anchor.BN(1000);
    const price2 = new anchor.BN(200);
    const amount = new anchor.BN(10);

    console.log('assetMint: ', assetMint);
    console.log('quoteMint: ', quoteMint);

    const state = await placeLimitOrder(provider, true, price, amount, assetMint, quoteMint);
    
    assert.equal(state.bids[0].toString(), price.toString());
    //const state2 = await placeLimitOrder(provider, true, price2);
    //assert.equal(state2.bids[0].toString(), price2.toString());
    //assert.equal(state2.bids[1].toString(), price.toString());

  });


  
});

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

export async function placeLimitOrder(
  provider: Provider,
  action: boolean,
  price: anchor.BN,
  amount: anchor.BN,
  assetMint,
  quoteMint,
): Promise<any> {

  const program = await getProgram(provider);
  console.log("program", program.programId);
  const [rfqPDA, _rfqBump] = await getPda(provider, 'rfq_state');
  const [orderBookPDA, _orderBookBump] = await getPda(provider, 'order_book_state');
  //const [escrowTokenPDA, _escrowTokenBump] = await getPda(provider, 'escrow_token');

  //const { _assetToken, assetMint } = await getNewTokenAndMint(program, provider.wallet);
  
  await requestAirdrop(provider, mintAuthority.publicKey, 10_000_000_000);
    
  const walletBalance = await provider.connection.getBalance(provider.wallet.publicKey);
  console.log('main wallet balance: ', walletBalance);
  const mintAuthorityBalance = await provider.connection.getBalance(mintAuthority.publicKey);
  console.log('mint wallet balance: ', mintAuthorityBalance);

  assetMint = await spl.Token.createMint(program.provider.connection,
    mintAuthority,
    mintAuthority.publicKey,
    mintAuthority.publicKey,
    0,
    spl.TOKEN_PROGRAM_ID);

  const authorityAssetToken = await assetMint.createAssociatedTokenAccount(
    provider.wallet.publicKey,
  );

  await assetMint.mintTo(authorityAssetToken, mintAuthority.publicKey, [], 10_000_000);

  const escrow_seed = Buffer.from(anchor.utils.bytes.utf8.encode("escrow_token"));
  const [escrowTokenPDA, _escrowTokenBump] = await anchor.web3.PublicKey.findProgramAddress(
      [escrow_seed],
      program.programId);

  const tx = await program.rpc.placeLimitOrder(
    action,
    price,
    amount,
  {
    accounts: {
      authority: provider.wallet.publicKey,
      rfqState: rfqPDA,
      orderBookState: orderBookPDA,
      assetToken: authorityAssetToken,
      escrowToken: escrowTokenPDA,
      assetMint: assetMint.publicKey,
      
      systemProgram: anchor.web3.SystemProgram.programId,
      tokenProgram: spl.TOKEN_PROGRAM_ID,
      associatedTokenProgram: spl.ASSOCIATED_TOKEN_PROGRAM_ID,
      rent: anchor.web3.SYSVAR_RENT_PUBKEY,
    },
  });

  const state = await program.account.orderBookState.fetch(orderBookPDA);
  return state;
}


export async function initializeRfq(
  provider: Provider,
  action: boolean,
  instrument: number,
  rfqExpiry: anchor.BN,
  strike: anchor.BN,
  ratio: number,
  nOfLegs: number,
): Promise<any> {

  const program = await getProgram(provider);
  console.log("program", program.programId);
  const [rfqPDA, _rfqBump] = await getPda(provider, 'rfq_state');
  const [orderBookPDA, _orderBookBump] = await getPda(provider, 'order_book_state');

  const tx = await program.rpc.initializeRfq(
    action,
    instrument,
    rfqExpiry,
    strike,
    ratio,
    nOfLegs,
  {
    accounts: {
      authority: provider.wallet.publicKey,
      rfqState: rfqPDA,
      orderBookState: orderBookPDA,
      systemProgram: anchor.web3.SystemProgram.programId,
      tokenProgram: spl.TOKEN_PROGRAM_ID,
      associatedTokenProgram: spl.ASSOCIATED_TOKEN_PROGRAM_ID,
      rent: anchor.web3.SYSVAR_RENT_PUBKEY,
    },
  });

  const state = await program.account.rfqState.fetch(rfqPDA);
  return { tx, state };
}

export async function initializeProtocol(
  provider: Provider,
  feeDenominator: number,
  feeNumerator: number
): Promise<any> {

  const program = await getProgram(provider);
  console.log("program", program.programId);
  const [protocolPda, _protocolBump] = await getPda(provider, 'convergence_rfq');
  const tx = await program.rpc.initialize(new anchor.BN(feeDenominator), new anchor.BN(feeNumerator), {
    accounts: {
      authority: provider.wallet.publicKey,
      protocol: protocolPda,
      systemProgram: anchor.web3.SystemProgram.programId
    }
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

export async function getBalance(payer, mint) {
  try {
    const parsedAccount = await program.provider.connection.getParsedTokenAccountsByOwner(payer.publicKey, { mint, });
    return parsedAccount.value[0].account.data.parsed.info.tokenAmount.uiAmount;
  } catch (error) {
    console.log("No mints found for wallet");
  }
}

 // 1. initialize new RFQ ecosystem
  // 2. create a new RFQ 
  // 3. wallet A posts a new limit order in the created RFQ
  // 4. wallet B posts a new limit order in the created RFQ
  // 5. wallet C places a market order in the created RFQ 
  // 6. wallet A settles
  // 7. wallet B settles
  // 8. wallet C settles
