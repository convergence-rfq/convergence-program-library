import * as anchor from '@project-serum/anchor';
import { Idl, Program, Provider } from '@project-serum/anchor';
import { Token, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Keypair, PublicKey } from "@solana/web3.js";

import { Rfq } from '../target/types/rfq';
import * as idl from '../target/idl/rfq.json';

export const program = anchor.workspace.Rfq as Program<Rfq>;

export const RFQ_SEED = 'rfq';
export const ORDER_SEED = 'order';
export const PROTOCOL_SEED = 'protocol';
export const ASSET_ESCROW_SEED = 'asset_escrow';
export const QUOTE_ESCROW_SEED = 'quote_escrow';

export const Order = {
  Buy: {
    buy: {}
  },
  Sell: {
    sell: {}
  },
  TwoWay: {
    twoWay: {}
  }
};

export const Instrument = {
  Spot: {
    spot: {}
  },
  Call: {
    call: {}
  },
  Future: {
    future: {}
  },
  Put: {
    put: {}
  }
};

export async function getRfqs(provider: Provider): Promise<object[]> {
  const program = await getProgram(provider);
  const [protocolPda, _protocolBump] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from(PROTOCOL_SEED)],
    program.programId
  );

  const protocolState = await program.account.protocolState.fetch(protocolPda);
  const rfqCount = protocolState.rfqCount.toNumber();

  let rfqs = [];
  for (let i = 0; i < rfqCount; i++) {
    const [rfqPda, _rfqBump] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from(RFQ_SEED), Buffer.from((i + 1).toString())],
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
  orderId: number
): Promise<any> {
  const program = await getProgram(provider);

  const [rfqPda, _rfqBump] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from(RFQ_SEED), Buffer.from(rfqId.toString())],
    program.programId
  );
  const [orderPda, _orderBump] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from(ORDER_SEED), Buffer.from(rfqId.toString()), Buffer.from(orderId.toString())],
    program.programId
  );

  const tx = await program.rpc.lastLook(
    {
      accounts: {
        authority: authority.publicKey,
        order: orderPda,
        rfq: rfqPda,
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
  authority: Keypair,
  rfqId: number,
  orderId: number,
  assetToken: PublicKey,
  quoteToken: PublicKey,
): Promise<any> {
  const program = await getProgram(provider);

  const [rfqPda, _rfqBump] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from(RFQ_SEED), Buffer.from(rfqId.toString())],
    program.programId
  );

  let rfqState = await program.account.rfqState.fetch(rfqPda);
  const assetMint = new anchor.web3.PublicKey(rfqState.assetMint.toString());
  const quoteMint = new anchor.web3.PublicKey(rfqState.quoteMint.toString());

  const [assetEscrowPda, _assetEscrowBump] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from(ASSET_ESCROW_SEED), Buffer.from(rfqId.toString())],
    program.programId
  );
  const [quoteEscrowPda, _quoteEscrowPDA] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from(QUOTE_ESCROW_SEED), Buffer.from(rfqId.toString())],
    program.programId
  );
  const [orderPda, _orderBump] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from(ORDER_SEED), Buffer.from(rfqId.toString()), Buffer.from(orderId.toString())],
    program.programId
  );

  const tx = await program.rpc.returnCollateral(
    {
      accounts: {
        assetEscrow: assetEscrowPda,
        assetMint: assetMint,
        assetToken: assetToken,
        authority: authority.publicKey,
        order: orderPda,
        quoteEscrow: quoteEscrowPda,
        quoteToken: quoteToken,
        quoteMint: quoteMint,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        rfq: rfqPda,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID
      },
      signers: [authority]
    });

  rfqState = await program.account.rfqState.fetch(rfqPda);

  return {
    tx,
    rfqState
  }
}

export async function settle(
  provider: Provider,
  authority: Keypair,
  rfqId: number,
  orderId: number,
  assetToken: PublicKey,
  quoteToken: PublicKey,
): Promise<any> {
  const program = await getProgram(provider);

  const [rfqPda, _rfqBump] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from(RFQ_SEED), Buffer.from(rfqId.toString())],
    program.programId
  );

  let rfqState = await program.account.rfqState.fetch(rfqPda);
  const assetMint = new anchor.web3.PublicKey(rfqState.assetMint.toString());
  const quoteMint = new anchor.web3.PublicKey(rfqState.quoteMint.toString());

  const [assetEscrowPda, _assetEscrowBump] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from(ASSET_ESCROW_SEED), Buffer.from(rfqId.toString())],
    program.programId
  );
  const [quoteEscrowPda, _quoteEscrowPDA] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from(QUOTE_ESCROW_SEED), Buffer.from(rfqId.toString())],
    program.programId
  );
  const [orderPda, _orderBump] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from(ORDER_SEED), Buffer.from(rfqId.toString()), Buffer.from(orderId.toString())],
    program.programId
  );

  const tx = await program.rpc.settle(
    {
      accounts: {
        assetEscrow: assetEscrowPda,
        assetMint: assetMint,
        assetToken: assetToken,
        authority: authority.publicKey,
        order: orderPda,
        quoteEscrow: quoteEscrowPda,
        quoteMint: quoteMint,
        quoteToken: quoteToken,
        rfq: rfqPda,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      },
      signers: [authority]
    }
  );

  rfqState = await program.account.rfqState.fetch(rfqPda);

  return {
    tx,
    rfqState
  };
}

export async function confirm(
  provider: Provider,
  rfqId: number,
  confirmOrder: object,
  authority: Keypair,
  assetToken: PublicKey,
  quoteToken: PublicKey,
): Promise<any> {
  const program = await getProgram(provider);

  const [rfqPda, _rfqBump] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from(RFQ_SEED), Buffer.from(rfqId.toString())],
    program.programId
  );

  let rfqState = await program.account.rfqState.fetch(rfqPda);
  const assetMint = new anchor.web3.PublicKey(rfqState.assetMint.toString());
  const quoteMint = new anchor.web3.PublicKey(rfqState.quoteMint.toString());

  const [assetEscrowPda, _assetEscrowBump] = await PublicKey.findProgramAddress(
    [Buffer.from(ASSET_ESCROW_SEED), Buffer.from(rfqId.toString())],
    program.programId
  );
  const [quoteEscrowPda, _quoteEscrowPda] = await PublicKey.findProgramAddress(
    [Buffer.from(QUOTE_ESCROW_SEED), Buffer.from(rfqId.toString())],
    program.programId
  );
  const [orderPda, _orderPda] = await PublicKey.findProgramAddress(
    [Buffer.from(ORDER_SEED), Buffer.from(rfqId.toString()), Buffer.from('0')],
    program.programId
  );

  const tx = await program.rpc.confirm(
    confirmOrder,
    {
      accounts: {
        assetMint: assetMint,
        assetToken: assetToken,
        authority: authority.publicKey,
        assetEscrow: assetEscrowPda,
        order: orderPda,
        quoteToken: quoteToken,
        quoteEscrow: quoteEscrowPda,
        quoteMint: quoteMint,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        rfq: rfqPda,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID
      },
      signers: [authority]
    });

  rfqState = await program.account.rfqState.fetch(rfqPda);

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
  assetToken: PublicKey,
  quoteToken: PublicKey
): Promise<any> {
  const program = await getProgram(provider);

  const [rfqPda, _rfqBump] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from(RFQ_SEED), Buffer.from(rfqId.toString())],
    program.programId
  );

  let rfqState = await program.account.rfqState.fetch(rfqPda);
  const responseId = rfqState.responseCount.toNumber() + 1;

  const assetMint = new PublicKey(rfqState.assetMint.toString());
  const quoteMint = new PublicKey(rfqState.quoteMint.toString());

  const [assetEscrowPda, _assetEscrowBump] = await PublicKey.findProgramAddress(
    [Buffer.from(ASSET_ESCROW_SEED), Buffer.from(rfqId.toString())],
    program.programId
  );
  const [quoteEscrowPda, _quoteEscrowPDA] = await PublicKey.findProgramAddress(
    [Buffer.from(QUOTE_ESCROW_SEED), Buffer.from(rfqId.toString())],
    program.programId
  );
  const [orderPda, _orderBump] = await PublicKey.findProgramAddress(
    [Buffer.from(ORDER_SEED), Buffer.from(rfqId.toString()), Buffer.from(responseId.toString())],
    program.programId
  );

  const tx = await program.rpc.respond(
    bid,
    ask,
    {
      accounts: {
        assetMint: assetMint,
        assetToken: assetToken,
        authority: authority.publicKey,
        assetEscrow: assetEscrowPda,
        quoteEscrow: quoteEscrowPda,
        order: orderPda,
        quoteMint: quoteMint,
        quoteToken: quoteToken,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        rfq: rfqPda,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
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
  amount: anchor.BN,
  assetMint: Token,
  authority: Keypair,
  expiry: anchor.BN,
  instrument: object,
  provider: Provider,
  quoteMint: Token,
  requestOrder: object,
): Promise<any> {
  const program = await getProgram(provider);

  const [protocolPda, _protocolBump] = await PublicKey.findProgramAddress(
    [Buffer.from(PROTOCOL_SEED)],
    program.programId
  );

  let protocolState = await program.account.protocolState.fetch(protocolPda);
  const rfqId = protocolState.rfqCount.toNumber() + 1;

  const [rfqPda, _rfqBump] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from(RFQ_SEED), Buffer.from(rfqId.toString())],
    program.programId
  );
  const [assetEscrowPda, _assetEscrowBump] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from(ASSET_ESCROW_SEED), Buffer.from(rfqId.toString())],
    program.programId
  );
  const [quoteEscrowPda, _quoteEscrowPDA] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from(QUOTE_ESCROW_SEED), Buffer.from(rfqId.toString())],
    program.programId
  );

  const tx = await program.rpc.request(
    requestOrder,
    instrument,
    expiry,
    amount,
    {
      accounts: {
        assetEscrow: assetEscrowPda,
        assetMint: assetMint.publicKey,
        authority: authority.publicKey,
        protocol: protocolPda,
        quoteEscrow: quoteEscrowPda,
        quoteMint: quoteMint.publicKey,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        rfq: rfqPda,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
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
  const [protocolPda, _protocolBump] = await PublicKey.findProgramAddress(
    [Buffer.from(PROTOCOL_SEED)],
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

export async function getProgram(provider: Provider): Promise<Program> {
  const programId = new anchor.web3.PublicKey(idl.metadata.address);
  return new anchor.Program(idl as Idl, programId, provider);
}

export async function requestAirdrop(
  provider: Provider,
  publicKey: PublicKey,
  lamports: number
): Promise<void> {
  await provider.connection.confirmTransaction(
    await provider.connection.requestAirdrop(publicKey, lamports),
    'confirmed'
  );
}

export async function getBalance(provider: Provider, payer: Keypair, mint: PublicKey) {
  const program = await getProgram(provider)
  try {
    const parsedAccount = await program.provider.connection.getParsedTokenAccountsByOwner(payer.publicKey, { mint });
    return parsedAccount.value[0].account.data.parsed.info.tokenAmount.uiAmount;
  } catch (error) {
    console.log('No mints found for wallet');
  }
}