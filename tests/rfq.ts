import * as anchor from '@project-serum/anchor';
import { Program, Provider } from '@project-serum/anchor';
import * as assert from 'assert';
import * as spl from "@solana/spl-token";
import { Keypair } from "@solana/web3.js";

import { Rfq } from '../target/types/rfq';
import * as idl from '../target/idl/rfq.json';

let assetMint: spl.Token;
let quoteMint: spl.Token;
let mintAuthority: any;
let authorityAssetToken: any;
let authorityQuoteToken: any;
let makerAassetToken: any;
let makerAquoteToken: any;
let makerBassetToken: any;
let makerBquoteToken: any;
let makerCassetToken: any;
let makerCquoteToken: any;
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
    console.log('taker wallet balance:', walletBalance);

    const mintAuthorityBalance = await provider.connection.getBalance(mintAuthority.publicKey);
    console.log('mint wallet balance:', mintAuthorityBalance);

    assetMint = await spl.Token.createMint(program.provider.connection,
      mintAuthority,
      mintAuthority.publicKey,
      mintAuthority.publicKey,
      0,
      spl.TOKEN_PROGRAM_ID
    );

    quoteMint = await spl.Token.createMint(program.provider.connection,
      mintAuthority,
      mintAuthority.publicKey,
      mintAuthority.publicKey,
      0,
      spl.TOKEN_PROGRAM_ID
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

  it('Initializes protocol', async () => {
    const feeDenominator = 1_000;
    const feeNumerator = 0;
    const { protocolState } = await initializeProtocol(provider, taker, feeDenominator, feeNumerator);
    assert.ok(protocolState.rfqCount.eq(new anchor.BN(0)));
  });

  it('Initializes RFQ 0', async () => {
    const requestOrderType = 1; // Buy
    const instrument = 1; // ?
    const expiry = new anchor.BN(-1);
    const amount = TAKER_ORDER_AMOUNT;
    const { protocolState } = await request(provider, taker, requestOrderType, instrument, expiry, amount);
    assert.ok(protocolState.rfqCount.eq(new anchor.BN(1)));
  });

  it('Responds to RFQ 0 and times out', async () => {
    setTimeout(() => {
      console.log('delay of 500ms');
    }, 500);

    const id = 0;

    try {
      const { rfqState } = await respond(provider, marketMakerA, id, new anchor.BN(0), MAKER_A_ASK_AMOUNT, makerAassetToken, makerAquoteToken);
      console.log('time delay:', rfqState.timeResponse - rfqState.timeBegin);
    } catch (err) {
      console.log('response timeout');
    }
  });

  it('Initializes RFQ 1', async () => {
    const requestOrderType = 1; // Buy
    const instrument = 1;
    const expiry = new anchor.BN(1_000);
    const amount = TAKER_ORDER_AMOUNT;

    const { rfqState } = await request(provider, taker, requestOrderType, instrument, expiry, amount);
    assert.equal(rfqState.expired, false);
    assert.equal(rfqState.requestOrderType, requestOrderType);
    assert.equal(rfqState.instrument, instrument);
    assert.equal(rfqState.expiry.toString(), expiry.toString());
    //assert.equal(rfqState.amount.toString(), TAKER_ORDER_AMOUNT.toString());

    const assetMintBalance = await getBalance(taker, assetMint.publicKey);
    const quoteMintBalance = await getBalance(taker, quoteMint.publicKey);

    console.log('taker order type:', rfqState.requestOrderType);
    console.log('taker amount:', rfqState.orderAmount.toString());
    console.log('taker asset balance:', assetMintBalance);
    console.log('taker quote balance:', quoteMintBalance);
  });

  it('Responds to RFQ 1', async () => {
    const id = 1;

    const response0 = await respond(provider, marketMakerA, id, MAKER_A_BID_AMOUNT, MAKER_A_ASK_AMOUNT, makerAassetToken, makerAquoteToken);
    console.log('response 0 two-way ask:', response0.rfqState.bestAskAmount.toString());
    console.log('response 0 two-way bid:', response0.rfqState.bestBidAmount.toString());

    const response1 = await respond(provider, marketMakerB, id, MAKER_B_BID_AMOUNT, MAKER_B_ASK_AMOUNT, makerBassetToken, makerBquoteToken);
    console.log('response 1 two-way ask:', response1.rfqState.bestAskAmount.toString());
    console.log('response 1 two-way bid:', response1.rfqState.bestBidAmount.toString());

    const response2 = await respond(provider, marketMakerC, id, MAKER_C_BID_AMOUNT, MAKER_C_ASK_AMOUNT, makerCassetToken, makerCquoteToken);
    console.log('response 2 two-way ask:', response2.rfqState.bestAskAmount.toString());
    console.log('response 2 two-way bid:', response2.rfqState.bestBidAmount.toString());

    const makerAassetBalance = await getBalance(marketMakerA, assetMint.publicKey);
    const makerAquoteBalance = await getBalance(marketMakerA, quoteMint.publicKey);
    console.log('maker A asset balance:', makerAassetBalance);
    console.log('maker A quote balance:', makerAquoteBalance);

    const makerBassetBalance = await getBalance(marketMakerB, assetMint.publicKey);
    const makerBquoteBalance = await getBalance(marketMakerB, quoteMint.publicKey);
    console.log('maker B asset balance:', makerBassetBalance);
    console.log('maker B quote balance:', makerBquoteBalance);

    const makerCassetBalance = await getBalance(marketMakerC, assetMint.publicKey);
    const makerCquoteBalance = await getBalance(marketMakerC, quoteMint.publicKey);
    console.log('maker C asset balance:', makerCassetBalance);
    console.log('maker C quote balance:', makerCquoteBalance);

    assert.equal(response0.rfqState.bestAskAmount.toString(), MAKER_A_ASK_AMOUNT.toString());
    assert.equal(response2.rfqState.bestAskAmount.toString(), MAKER_B_ASK_AMOUNT.toString());
    assert.equal(response2.rfqState.bestBidAmount.toString(), MAKER_B_BID_AMOUNT.toString());
  });

  it('Taker confirms RFQ price pre-settlement', async () => {
    const id = 1;
    const confirmOrderType = 1;

    const { rfqState } = await confirm(provider, id, confirmOrderType, taker, authorityAssetToken, authorityQuoteToken);
    console.log('best ask confirmation:', rfqState.bestAskAmount.toNumber());
    console.log('best bid confirmation:', rfqState.bestBidAmount.toNumber());

    const assetMintBalance = await getBalance(taker, assetMint.publicKey);
    const quoteMintBalance = await getBalance(taker, quoteMint.publicKey);

    console.log('taker asset balance confirmation:', assetMintBalance);
    console.log('taker quote balance confirmation:', quoteMintBalance);

    assert.equal(assetMintBalance, 0);
    assert.equal(quoteMintBalance, 100_000 - MAKER_B_ASK_AMOUNT.toNumber());
    assert.equal(rfqState.confirmed, true);
  });

  return

  it('maker last look', async () => {
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

  it('returns collateral', async () => {
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

  it('settles', async () => {
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

  it('view RFQ state', async () => {
    const title = 'test rfq';

    const titles = await getRfqs(provider);
    console.log('RFQ titles: ', titles);
  })

});

export async function getRfqs(provider: Provider): Promise<any[]> {
  const program = await getProgram(provider);
  const [protocolPda, _protocolBump] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from('protocol')],
    program.programId
  );

  const protocolState = await program.account.protocolState.fetch(protocolPda);
  const rfqCount = protocolState.rfqCount.toNumber();

  let rfqs = [];
  for (let i = 0; i < rfqCount; i++) {
    const [rfqPda, _rfqBump] = await anchor.web3.PublicKey.findProgramAddress(
      [toBuffer('rfq'), toBuffer(i)],
      program.programId
    );
    const rfq = await program.account.rfqState.fetch(rfqPda);
    rfqs.push(rfq);
  }

  return rfqs;
}

export async function lastLook(
  provider: Provider,
  authority: Keypair,
  rfqId: number,
): Promise<any> {
  const program = await getProgram(provider);

  const [rfqPda, _rfqBump] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from('rfq'), toBuffer(rfqId)],
    program.programId
  );
  const [orderPda, _orderBump] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from('order'), authority.publicKey.toBytes()],
    program.programId
  );

  const tx = await program.rpc.lastLook(
    {
      accounts: {
        authority: authority.publicKey,
        orderState: orderPda,
        rfqState: rfqPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      },
      signers: [authority],
    });

  const rfqState = await program.account.rfqState.fetch(rfqPda);
  const orderState = await program.account.orderState.fetch(orderPda);

  return {
    tx,
    rfqState,
    orderState
  }
}

export async function returnCollateral(
  provider: Provider,
  authority: any,
  title: string,
  assetToken: spl.Token,
  quoteToken: spl.Token,
): Promise<any> {
  const program = await getProgram(provider);

  const [rfqPda, _rfqBump] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from('rfq'), Buffer.from(title.slice(0, 32))],
    program.programId
  );
  const [assetEscrowPda, _assetEscrowBump] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from('asset-escrow'), Buffer.from(title.slice(0, 32))],
    program.programId
  );
  const [quoteEscrowPda, _quoteEscrowPDA] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from('quote-escrow'), Buffer.from(title.slice(0, 32))],
    program.programId
  );
  const [orderPda, _orderBump] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from('order'), authority.publicKey.toBytes()],
    program.programId
  );

  const tx = await program.rpc.returnCollateral(
    title,
    {
      accounts: {
        authority: authority.publicKey,
        orderState: orderPda,
        rfqState: rfqPda,
        assetToken: assetToken,
        quoteToken: quoteToken,
        assetMint: assetMint.publicKey,
        quoteMint: quoteMint.publicKey,
        assetEscrow: assetEscrowPda,
        quoteEscrow: quoteEscrowPda,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: spl.TOKEN_PROGRAM_ID,
        associatedTokenProgram: spl.ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      },
      signers: [authority],
    });

  const rfqState = await program.account.rfqState.fetch(rfqPda);

  return {
    tx,
    rfqState
  }
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
    [Buffer.from('rfq'), Buffer.from(title.slice(0, 32))],
    program.programId
  );

  const [assetEscrowPDA, _assetEscrowBump] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from('asset-escrow'), Buffer.from(title.slice(0, 32))],
    program.programId
  );
  const [quoteEscrowPDA, _quoteEscrowPDA] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from('quote-escrow'), Buffer.from(title.slice(0, 32))],
    program.programId
  );
  const [orderPDA, _orderBump] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from('order'), authority.publicKey.toBytes()],
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
        assetEscrow: assetEscrowPDA,
        quoteEscrow: quoteEscrowPDA,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: spl.TOKEN_PROGRAM_ID,
        associatedTokenProgram: spl.ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      },
      signers: [authority],
    });

  const rfqState = await program.account.rfqState.fetch(rfqPDA);

  return {
    tx,
    rfqState
  };
}

export async function confirm(
  provider: Provider,
  id: number,
  confirmOrderType: number,
  authority: Keypair,
  assetToken: spl.Token,
  quoteToken: spl.Token,
): Promise<any> {
  const program = await getProgram(provider);

  const [rfqPda, _rfqBump] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from('rfq'), toBuffer(id)],
    program.programId
  );
  const [assetEscrowPDA, _assetEscrowBump] = await anchor.web3.PublicKey.findProgramAddress(
    [toBuffer('asset-escrow'), toBuffer(id)],
    program.programId
  );
  const [quoteEscrowPDA, _quoteEscrowPDA] = await anchor.web3.PublicKey.findProgramAddress(
    [toBuffer('quote-escrow'), toBuffer(id)],
    program.programId
  );

  const tx = await program.rpc.confirm(
    confirmOrderType,
    {
      accounts: {
        assetMint: assetMint.publicKey,
        assetToken: assetToken,
        associatedTokenProgram: spl.ASSOCIATED_TOKEN_PROGRAM_ID,
        authority: authority.publicKey,
        assetEscrow: assetEscrowPDA,
        quoteToken: quoteToken,
        quoteEscrow: quoteEscrowPDA,
        quoteMint: quoteMint.publicKey,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        rfq: rfqPda,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: spl.TOKEN_PROGRAM_ID
      },
      signers: [authority]
    });

  const rfqState = await program.account.rfqState.fetch(rfqPda);

  return {
    tx,
    rfqState
  };
}

export async function respond(
  provider: Provider,
  authority: Keypair,
  rfqId: number,
  bid: anchor.BN,
  ask: anchor.BN,
  assetToken: spl.Token,
  quoteToken: spl.Token
): Promise<any> {
  const program = await getProgram(provider);

  const [rfqPda, _rfqBump] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from('rfq'), toBuffer(rfqId)],
    program.programId
  );

  let rfqState = await program.account.rfqState.fetch(rfqPda);
  const responseId = rfqState.responseCount;

  const [assetEscrowPda, _assetEscrowBump] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from('asset-escrow'), toBuffer(rfqId), toBuffer(responseId)],
    program.programId
  );
  const [quoteEscrowPda, _quoteEscrowPDA] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from('quote-escrow'), toBuffer(rfqId), toBuffer(responseId)],
    program.programId
  );
  const [orderPda, _orderBump] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from('order'), toBuffer(rfqId), toBuffer(responseId)],
    program.programId
  );

  const tx = await program.rpc.respond(
    bid,
    ask,
    {
      accounts: {
        assetMint: assetMint.publicKey,
        assetToken: assetToken,
        associatedTokenProgram: spl.ASSOCIATED_TOKEN_PROGRAM_ID,
        authority: authority.publicKey,
        assetEscrow: assetEscrowPda,
        quoteEscrow: quoteEscrowPda,
        order: orderPda,
        quoteMint: quoteMint.publicKey,
        quoteToken: quoteToken,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        rfq: rfqPda,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: spl.TOKEN_PROGRAM_ID,
      },
      signers: [authority],
    });

  rfqState = await program.account.rfqState.fetch(rfqPda);

  return {
    tx,
    rfqState
  }
}

export async function request(
  provider: Provider,
  authority: Keypair,
  requestOrderType: number,
  instrument: number,
  expiry: anchor.BN,
  amount: anchor.BN
): Promise<any> {
  const program = await getProgram(provider);

  const [protocolPda, _protocolBump] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from('protocol')],
    program.programId
  );

  let protocolState = await program.account.protocolState.fetch(protocolPda);
  const rfqId = protocolState.rfqCount.toNumber();

  const [rfqPda, _rfqBump] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from('rfq'), toBuffer(rfqId)],
    program.programId
  );

  const tx = await program.rpc.request(
    requestOrderType,
    instrument,
    expiry,
    amount,
    {
      accounts: {
        authority: authority.publicKey,
        rfq: rfqPda,
        protocol: protocolPda,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      },
      signers: [authority],
    });

  protocolState = await program.account.protocolState.fetch(protocolPda);
  const rfqState = await program.account.rfqState.fetch(rfqPda);

  return {
    tx,
    protocolState,
    rfqState
  };
}

export async function initializeProtocol(
  provider: Provider,
  authority: Keypair,
  feeDenominator: number,
  feeNumerator: number
): Promise<any> {
  const program = await getProgram(provider);
  const [protocolPda, _protocolBump] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from('protocol')],
    program.programId
  );
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
  const protocolState = await program.account.protocolState.fetch(protocolPda)
  return { tx, protocolState };
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
  // @ts-ignore
  return new anchor.Program(idl, programId, provider);
}

export const toBuffer = (x: any) => {
  return Buffer.from(anchor.utils.bytes.utf8.encode(x));
}

export async function requestAirdrop(
  provider: anchor.Provider,
  publicKey: anchor.web3.PublicKey,
  lamports: number
): Promise<void> {
  await provider.connection.confirmTransaction(
    await provider.connection.requestAirdrop(publicKey, lamports),
    'confirmed'
  );
}

const getBalance = async (payer, mint) => {
  try {
    const parsedAccount = await program.provider.connection.getParsedTokenAccountsByOwner(payer.publicKey, { mint, });
    return parsedAccount.value[0].account.data.parsed.info.tokenAmount.uiAmount;
  } catch (error) {
    console.log('No mints found for wallet');
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
*/