import * as anchor from '@project-serum/anchor'
import { Idl, Program, Provider, Wallet } from '@project-serum/anchor'
import { ASSOCIATED_TOKEN_PROGRAM_ID, Token, TOKEN_PROGRAM_ID } from "@solana/spl-token"
import { PublicKey } from "@solana/web3.js"

import { default as idl } from '../target/idl/rfq.json'

export const RFQ_SEED = 'rfq'
export const ORDER_SEED = 'order'
export const PROTOCOL_SEED = 'protocol'
export const ASSET_ESCROW_SEED = 'asset_escrow'
export const QUOTE_ESCROW_SEED = 'quote_escrow'

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
}

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
}

export const Side = {
  Buy: {
    buy: {}
  },
  Sell: {
    sell: {}
  }
}

export const Venue = {
  Convergence: {
    convergence: {}
  },
  PsyOptions: {
    psyOptions: {}
  }
}

// Instrument from from Paradigm: BTC-25JUN21-20000-C

export const Leg = {
  Instrument: {
    instrument: {}
  },
  Venue: {
    venue: {}
  },
  Side: {
    side: {}
  },
  Amount: {
    amount: {}
  }
}

export async function getRFQs(
  provider: Provider,
  page: number | undefined,
  pageSize: number | undefined
): Promise<object[]> {
  const program = await getProgram(provider)
  const [protocolPda, _protocolBump] = await PublicKey.findProgramAddress(
    [Buffer.from(PROTOCOL_SEED)],
    program.programId
  )
  const protocolState = await program.account.protocolState.fetch(protocolPda)
  const range = Array.from({
    // @ts-ignore
    length: protocolState.rfqCount.toNumber()
  }, (_, i) => 1 + i)

  const rfqs = await Promise.all(range.map(async (i) => {
    const [rfqPda, _rfqBump] = await PublicKey.findProgramAddress(
      [Buffer.from(RFQ_SEED), Buffer.from(i.toString())],
      program.programId
    )
    return await program.account.rfqState.fetch(rfqPda)
  }))

  return rfqs
}

export async function getResponses(provider: Provider, rfqs: any[]): Promise<object[]> {
  let orderPdas = []

  const program = await getProgram(provider)

  for (let i = 0; i < rfqs.length; i++) {
    for (let j = 0; j < rfqs[i].responseCount.toNumber(); j++) {
      const [orderPda, _orderBump] = await PublicKey.findProgramAddress(
        [Buffer.from(ORDER_SEED), Buffer.from(rfqs[i].id.toString()), Buffer.from((j + 1).toString())],
        program.programId
      )
      orderPdas.push([orderPda, rfqs[i]])
    }
  }

  const orders = await Promise.all(orderPdas.map(async ([orderPda, rfqState]) => {
    return [await program.account.orderState.fetch(orderPda), rfqState]
  }))

  return orders
}

export async function lastLook(
  provider: Provider,
  authority: Wallet,
  rfqId: number,
  orderId: number
): Promise<any> {
  const program = await getProgram(provider)

  const [rfqPda, _rfqBump] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from(RFQ_SEED), Buffer.from(rfqId.toString())],
    program.programId
  )
  const [orderPda, _orderBump] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from(ORDER_SEED), Buffer.from(rfqId.toString()), Buffer.from(orderId.toString())],
    program.programId
  )

  const tx = await program.rpc.lastLook(
    {
      accounts: {
        authority: authority.publicKey,
        order: orderPda,
        rfq: rfqPda,
      },
      signers: [authority.payer],
    })

  const rfqState = await program.account.rfqState.fetch(rfqPda)
  const orderState = await program.account.orderState.fetch(orderPda)

  return {
    tx,
    rfqState,
    orderState
  }
}

export async function returnCollateral(
  provider: Provider,
  authority: Wallet,
  rfqId: number,
  orderId: number,
  assetWallet: PublicKey,
  quoteWallet: PublicKey,
): Promise<any> {
  const program = await getProgram(provider)

  const [rfqPda, _rfqBump] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from(RFQ_SEED), Buffer.from(rfqId.toString())],
    program.programId
  )

  let rfqState = await program.account.rfqState.fetch(rfqPda)

  // @ts-ignore
  const assetMint = new anchor.web3.PublicKey(rfqState.assetMint.toString())
  // @ts-ignore
  const quoteMint = new anchor.web3.PublicKey(rfqState.quoteMint.toString())

  const [assetEscrowPda, _assetEscrowBump] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from(ASSET_ESCROW_SEED), Buffer.from(rfqId.toString())],
    program.programId
  )
  const [quoteEscrowPda, _quoteEscrowPDA] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from(QUOTE_ESCROW_SEED), Buffer.from(rfqId.toString())],
    program.programId
  )
  const [orderPda, _orderBump] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from(ORDER_SEED), Buffer.from(rfqId.toString()), Buffer.from(orderId.toString())],
    program.programId
  )

  const tx = await program.rpc.returnCollateral(
    {
      accounts: {
        assetEscrow: assetEscrowPda,
        assetMint,
        assetWallet,
        authority: authority.publicKey,
        order: orderPda,
        quoteEscrow: quoteEscrowPda,
        quoteWallet,
        quoteMint,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        rfq: rfqPda,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID
      },
      signers: [authority.payer]
    })

  rfqState = await program.account.rfqState.fetch(rfqPda)

  return {
    tx,
    rfqState
  }
}

export async function settle(
  provider: Provider,
  authority: Wallet,
  rfqId: number,
  orderId: number,
  assetWallet: PublicKey,
  quoteWallet: PublicKey
): Promise<any> {
  const program = await getProgram(provider)

  const [protocolPda, _protocolBump] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from(PROTOCOL_SEED)],
    program.programId
  )
  const [rfqPda, _rfqBump] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from(RFQ_SEED), Buffer.from(rfqId.toString())],
    program.programId
  )

  const protocolState = await program.account.protocolState.fetch(protocolPda)
  let rfqState = await program.account.rfqState.fetch(rfqPda)

  // @ts-ignore
  const assetMint = new anchor.web3.PublicKey(rfqState.assetMint.toString())
  // @ts-ignore
  const quoteMint = new anchor.web3.PublicKey(rfqState.quoteMint.toString())

  const [assetEscrowPda, _assetEscrowBump] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from(ASSET_ESCROW_SEED), Buffer.from(rfqId.toString())],
    program.programId
  )
  const [quoteEscrowPda, _quoteEscrowPDA] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from(QUOTE_ESCROW_SEED), Buffer.from(rfqId.toString())],
    program.programId
  )
  const [orderPda, _orderBump] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from(ORDER_SEED), Buffer.from(rfqId.toString()), Buffer.from(orderId.toString())],
    program.programId
  )

  const orderState = await program.account.orderState.fetch(orderPda)
  let treasuryWallet: PublicKey
  if (orderState.confirmedSide == Side.Buy) {
    treasuryWallet = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      assetMint,
      protocolState.authority
    )
  } else {
    treasuryWallet = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      quoteMint,
      protocolState.authority
    )
  }

  const tx = await program.rpc.settle(
    {
      accounts: {
        assetEscrow: assetEscrowPda,
        assetMint,
        assetWallet,
        authority: authority.publicKey,
        order: orderPda,
        quoteEscrow: quoteEscrowPda,
        quoteMint,
        quoteWallet,
        rfq: rfqPda,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        protocol: protocolPda,
        treasuryWallet,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      },
      signers: [authority.payer]
    }
  )

  rfqState = await program.account.rfqState.fetch(rfqPda)

  return {
    tx,
    rfqState
  }
}

export async function confirm(
  provider: Provider,
  rfqId: number,
  responseId: number,
  authority: Wallet,
  assetWallet: PublicKey,
  quoteWallet: PublicKey,
  side: object
): Promise<any> {
  const program = await getProgram(provider)

  const [rfqPda, _rfqBump] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from(RFQ_SEED), Buffer.from(rfqId.toString())],
    program.programId
  )

  let rfqState = await program.account.rfqState.fetch(rfqPda)
  // @ts-ignore
  const assetMint = new anchor.web3.PublicKey(rfqState.assetMint.toString())
  // @ts-ignore
  const quoteMint = new anchor.web3.PublicKey(rfqState.quoteMint.toString())

  const [assetEscrowPda, _assetEscrowBump] = await PublicKey.findProgramAddress(
    [Buffer.from(ASSET_ESCROW_SEED), Buffer.from(rfqId.toString())],
    program.programId
  )
  const [quoteEscrowPda, _quoteEscrowPda] = await PublicKey.findProgramAddress(
    [Buffer.from(QUOTE_ESCROW_SEED), Buffer.from(rfqId.toString())],
    program.programId
  )
  const [orderPda, _orderPda] = await PublicKey.findProgramAddress(
    [Buffer.from(ORDER_SEED), Buffer.from(rfqId.toString()), Buffer.from(responseId.toString())],
    program.programId
  )

  const tx = await program.rpc.confirm(
    side,
    {
      accounts: {
        assetMint,
        assetWallet,
        authority: authority.publicKey,
        assetEscrow: assetEscrowPda,
        order: orderPda,
        quoteWallet,
        quoteEscrow: quoteEscrowPda,
        quoteMint,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        rfq: rfqPda,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID
      },
      signers: [authority.payer]
    })

  rfqState = await program.account.rfqState.fetch(rfqPda)

  return {
    tx,
    rfqState
  }
}

export async function respond(
  provider: Provider,
  authority: Wallet,
  rfqId: number,
  bid: number | null,
  ask: number | null,
  assetWallet: PublicKey,
  quoteWallet: PublicKey
): Promise<any> {
  const program = await getProgram(provider)

  const [rfqPda, _rfqBump] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from(RFQ_SEED), Buffer.from(rfqId.toString())],
    program.programId
  )

  let rfqState = await program.account.rfqState.fetch(rfqPda)
  // @ts-ignore
  const responseId = rfqState.responseCount.toNumber() + 1

  // @ts-ignore
  const assetMint = new PublicKey(rfqState.assetMint.toString())
  // @ts-ignore
  const quoteMint = new PublicKey(rfqState.quoteMint.toString())

  const [assetEscrowPda, _assetEscrowBump] = await PublicKey.findProgramAddress(
    [Buffer.from(ASSET_ESCROW_SEED), Buffer.from(rfqId.toString())],
    program.programId
  )
  const [quoteEscrowPda, _quoteEscrowPDA] = await PublicKey.findProgramAddress(
    [Buffer.from(QUOTE_ESCROW_SEED), Buffer.from(rfqId.toString())],
    program.programId
  )
  const [orderPda, _orderBump] = await PublicKey.findProgramAddress(
    [Buffer.from(ORDER_SEED), Buffer.from(rfqId.toString()), Buffer.from(responseId.toString())],
    program.programId
  )

  const tx = await program.rpc.respond(
    bid ? new anchor.BN(bid) : null,
    ask ? new anchor.BN(ask) : null,
    {
      accounts: {
        assetMint,
        assetWallet,
        authority: authority.publicKey,
        assetEscrow: assetEscrowPda,
        quoteEscrow: quoteEscrowPda,
        order: orderPda,
        quoteMint,
        quoteWallet,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        rfq: rfqPda,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      },
      signers: [authority.payer],
    })

  rfqState = await program.account.rfqState.fetch(rfqPda)

  return {
    tx,
    rfqState
  }
}

export async function request(
  assetMint: PublicKey,
  authority: Wallet,
  expiry: number,
  lastLook: boolean,
  legs: object[],
  orderAmount: number,
  provider: Provider,
  quoteMint: PublicKey,
  requestOrder: object,
): Promise<any> {
  const program = await getProgram(provider)

  const [protocolPda, _protocolBump] = await PublicKey.findProgramAddress(
    [Buffer.from(PROTOCOL_SEED)],
    program.programId
  )

  let protocolState = await program.account.protocolState.fetch(protocolPda)
  // @ts-ignore
  const rfqId = protocolState.rfqCount.toNumber() + 1

  const [rfqPda, _rfqBump] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from(RFQ_SEED), Buffer.from(rfqId.toString())],
    program.programId
  )
  const [assetEscrowPda, _assetEscrowBump] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from(ASSET_ESCROW_SEED), Buffer.from(rfqId.toString())],
    program.programId
  )
  const [quoteEscrowPda, _quoteEscrowPda] = await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from(QUOTE_ESCROW_SEED), Buffer.from(rfqId.toString())],
    program.programId
  )

  const tx = await program.rpc.request(
    new anchor.BN(expiry),
    lastLook,
    legs,
    new anchor.BN(orderAmount),
    requestOrder,
    {
      accounts: {
        assetEscrow: assetEscrowPda,
        assetMint,
        authority: authority.publicKey,
        protocol: protocolPda,
        quoteEscrow: quoteEscrowPda,
        quoteMint,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        rfq: rfqPda,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      },
      signers: [authority.payer]
    })

  protocolState = await program.account.protocolState.fetch(protocolPda)
  const rfqState = await program.account.rfqState.fetch(rfqPda)

  return {
    tx,
    protocolState,
    rfqState
  }
}

export async function initializeProtocol(
  provider: Provider,
  authority: Wallet,
  feeDenominator: number,
  feeNumerator: number
): Promise<any> {
  const program = await getProgram(provider)
  const [protocolPda, _protocolBump] = await PublicKey.findProgramAddress(
    [Buffer.from(PROTOCOL_SEED)],
    program.programId
  )
  const tx = await program.rpc.initialize(
    new anchor.BN(feeDenominator),
    new anchor.BN(feeNumerator),
    {
      accounts: {
        authority: authority.publicKey,
        protocol: protocolPda,
        systemProgram: anchor.web3.SystemProgram.programId
      },
      signers: [authority.payer],
    })
  const protocolState = await program.account.protocolState.fetch(protocolPda)
  return { tx, protocolState }
}

export async function getProgram(provider: Provider): Promise<Program> {
  const programId = new anchor.web3.PublicKey(idl.metadata.address)
  return new anchor.Program(idl as Idl, programId, provider)
}

export async function requestAirdrop(
  provider: Provider,
  publicKey: PublicKey,
  lamports: number
): Promise<void> {
  await provider.connection.confirmTransaction(
    await provider.connection.requestAirdrop(publicKey, lamports),
    'confirmed'
  )
}

export async function getBalance(
  provider: Provider,
  payer: Wallet,
  mint: PublicKey
) {
  const program = await getProgram(provider)
  try {
    const parsedAccount = await program.provider.connection.getParsedTokenAccountsByOwner(payer.publicKey, { mint })
    return parseInt(parsedAccount.value[0].account.data.parsed.info.tokenAmount.amount, 10);
  } catch (error) {
    console.log('No mints found for wallet')
  }
}