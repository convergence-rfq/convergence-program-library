import * as anchor from '@project-serum/anchor'
import { Idl, Program, Provider, Wallet } from '@project-serum/anchor'
import { ASSOCIATED_TOKEN_PROGRAM_ID, Token, TOKEN_PROGRAM_ID } from "@solana/spl-token"
import { PublicKey, SystemProgram, Signer, SYSVAR_RENT_PUBKEY } from "@solana/web3.js"

import { default as idl } from '../target/idl/rfq.json'

export const RFQ_SEED = 'rfq'
export const ORDER_SEED = 'order'
export const PROTOCOL_SEED = 'protocol'
export const ASSET_ESCROW_SEED = 'asset_escrow'
export const QUOTE_ESCROW_SEED = 'quote_escrow'

/// TODO: Import types and constants from Anchor
///
/// The following creates the correct types.
///
/// ```ts
/// import { Rfq } from '../target/types/rfq'
/// export type Instrument = IdlAccounts<Rfq>['instrument']
/// ```

/// Types

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
  Option: {
    option: {}
  },
}

export const Quote = {
  Bid: {
    bid: {}
  },
  Ask: {
    ask: {}
  }
}

export const Venue = {
  Convergence: {
    convergence: {}
  },
  PsyOptions: {
    psyOptions: {}
  },
  Sollar: {
    sollar: {}
  }
}

export const Contract = {
  Call: {
    call: {}
  },
  Put: {
    put: {}
  },
  Long: {
    long: {}
  },
  Short: {
    short: {}
  }
}

export const Leg = {
  Amount: {
    amount: {}
  },
  Contract: null,
  ContractQuoteAmount: null,
  ContractAssetAmount: null,
  Expiry: null,
  Instrument: {
    instrument: {}
  },
  Venue: {
    venue: {}
  },
}

export async function getProgram(provider: Provider): Promise<Program> {
  const programId = new PublicKey(idl.metadata.address)
  return new anchor.Program(idl as Idl, programId, provider)
}

/// Protocol methods

export async function initializeProtocol(
  provider: Provider,
  signer: Wallet,
  feeDenominator: number,
  feeNumerator: number
): Promise<any> {
  const program = await getProgram(provider)
  const [protocolPda, _protocolBump] = await PublicKey.findProgramAddress(
    [Buffer.from(PROTOCOL_SEED)],
    program.programId
  )

  let signers = []
  if (signer.payer) {
    signers.push(signer.payer)
  }

  const tx = await program.methods.initialize(new anchor.BN(feeDenominator), new anchor.BN(feeNumerator))
    .accounts({
      signer: signer.publicKey,
      protocol: protocolPda,
      systemProgram: SystemProgram.programId
    })
    .signers(signers)
    .rpc()
  const protocolState = await program.account.protocolState.fetch(protocolPda)
  return { tx, protocolState }
}

export async function setFee(
  provider: Provider,
  signer: Wallet,
  feeDenominator: number,
  feeNumerator: number
): Promise<any> {
  const program = await getProgram(provider)
  const [protocolPda, _protocolBump] = await PublicKey.findProgramAddress(
    [Buffer.from(PROTOCOL_SEED)],
    program.programId
  )
  let signers = []
  if (signer.payer) {
    signers.push(signer.payer)
  }
  const tx = await program.methods.setFee(new anchor.BN(feeDenominator), new anchor.BN(feeNumerator))
    .accounts({
      signer: signer.publicKey,
      protocol: protocolPda,
      systemProgram: SystemProgram.programId
    })
    .signers(signers)
    .rpc()
  const protocolState = await program.account.protocolState.fetch(protocolPda)
  return { tx, protocolState }
}

export async function request(
  accessManager: number | null,
  assetMint: PublicKey,
  signer: Wallet,
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

  let protocolState: any = await program.account.protocolState.fetch(protocolPda)
  const rfqId = protocolState.rfqCount.toNumber() + 1

  const [rfqPda, _rfqBump] = await PublicKey.findProgramAddress(
    [Buffer.from(RFQ_SEED), Buffer.from(rfqId.toString())],
    program.programId
  )
  const [assetEscrowPda, _assetEscrowBump] = await PublicKey.findProgramAddress(
    [Buffer.from(ASSET_ESCROW_SEED), Buffer.from(rfqId.toString())],
    program.programId
  )
  const [quoteEscrowPda, _quoteEscrowPda] = await PublicKey.findProgramAddress(
    [Buffer.from(QUOTE_ESCROW_SEED), Buffer.from(rfqId.toString())],
    program.programId
  )
  let signers = []
  if (signer.payer) {
    signers.push(signer.payer)
  }
  const tx = await program.methods.request(accessManager, new anchor.BN(expiry), lastLook, legs, new anchor.BN(orderAmount), requestOrder)
    .accounts({
      assetEscrow: assetEscrowPda,
      assetMint,
      signer: signer.publicKey,
      protocol: protocolPda,
      quoteEscrow: quoteEscrowPda,
      quoteMint,
      rent: SYSVAR_RENT_PUBKEY,
      rfq: rfqPda,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .signers(signers)
    .rpc()

  protocolState = await program.account.protocolState.fetch(protocolPda)
  const rfqState = await program.account.rfqState.fetch(rfqPda)

  return {
    tx,
    protocolState,
    rfqState
  }
}

export async function cancel(
  provider: Provider,
  signer: Wallet,
  rfqId: number
): Promise<any> {
  const program = await getProgram(provider)
  const [protocolPda, _protocolBump] = await PublicKey.findProgramAddress(
    [Buffer.from(PROTOCOL_SEED)],
    program.programId
  )
  const [rfqPda, _rfqBump] = await PublicKey.findProgramAddress(
    [Buffer.from(RFQ_SEED), Buffer.from(rfqId.toString())],
    program.programId
  )
  let signers = []
  if (signer.payer) {
    signers.push(signer.payer)
  }
  const tx = await program.methods.cancel()
    .accounts({
      signer: signer.publicKey,
      protocol: protocolPda,
      rfq: rfqPda
    })
    .signers(signers)
    .rpc()
  const rfqState = await program.account.rfqState.fetch(rfqPda)
  return { tx, rfqState }
}

export async function respond(
  provider: Provider,
  signer: Wallet,
  rfqId: number,
  bid: number | null,
  ask: number | null,
  assetWallet: PublicKey,
  quoteWallet: PublicKey
): Promise<any> {
  const program = await getProgram(provider)

  const [rfqPda, _rfqBump] = await PublicKey.findProgramAddress(
    [Buffer.from(RFQ_SEED), Buffer.from(rfqId.toString())],
    program.programId
  )

  let rfqState: any = await program.account.rfqState.fetch(rfqPda)
  const responseId = rfqState.responseCount.toNumber() + 1

  const assetMint = new PublicKey(rfqState.assetMint.toString())
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

  let signers = []
  if (signer.payer) {
    signers.push(signer.payer)
  }

  const tx = await program.methods.respond(bid ? new anchor.BN(bid) : null, ask ? new anchor.BN(ask) : null)
    .accounts({
      assetMint,
      assetWallet,
      signer: signer.publicKey,
      assetEscrow: assetEscrowPda,
      quoteEscrow: quoteEscrowPda,
      order: orderPda,
      quoteMint,
      quoteWallet,
      rent: SYSVAR_RENT_PUBKEY,
      rfq: rfqPda,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .signers(signers)
    .rpc()

  rfqState = await program.account.rfqState.fetch(rfqPda)
  const orderState = await program.account.orderState.fetch(orderPda)

  return {
    orderState,
    rfqState,
    tx
  }
}

export async function confirm(
  provider: Provider,
  rfqId: number,
  responseId: number,
  signer: Wallet,
  assetWallet: PublicKey,
  quoteWallet: PublicKey,
  side: object
): Promise<any> {
  const program = await getProgram(provider)

  const [rfqPda, _rfqBump] = await PublicKey.findProgramAddress(
    [Buffer.from(RFQ_SEED), Buffer.from(rfqId.toString())],
    program.programId
  )

  let rfqState: any = await program.account.rfqState.fetch(rfqPda)
  const assetMint = new PublicKey(rfqState.assetMint.toString())
  const quoteMint = new PublicKey(rfqState.quoteMint.toString())

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

  let signers = []
  if (signer.payer) {
    signers.push(signer.payer)
  }

  const tx = await program.methods.confirm(side)
    .accounts({
      assetMint,
      assetWallet,
      signer: signer.publicKey,
      assetEscrow: assetEscrowPda,
      order: orderPda,
      quoteWallet,
      quoteEscrow: quoteEscrowPda,
      quoteMint,
      rent: SYSVAR_RENT_PUBKEY,
      rfq: rfqPda,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID
    })
    .signers(signers)
    .rpc()

  rfqState = await program.account.rfqState.fetch(rfqPda)
  const orderState = await program.account.orderState.fetch(orderPda)

  return {
    tx,
    orderState,
    rfqState
  }
}

export async function lastLook(
  provider: Provider,
  signer: Wallet,
  rfqId: number,
  orderId: number
): Promise<any> {
  const program = await getProgram(provider)

  const [rfqPda, _rfqBump] = await PublicKey.findProgramAddress(
    [Buffer.from(RFQ_SEED), Buffer.from(rfqId.toString())],
    program.programId
  )
  const [orderPda, _orderBump] = await PublicKey.findProgramAddress(
    [Buffer.from(ORDER_SEED), Buffer.from(rfqId.toString()), Buffer.from(orderId.toString())],
    program.programId
  )

  let signers = []
  if (signer.payer) {
    signers.push(signer.payer)
  }

  const tx = await program.methods.lastLook()
    .accounts({
      signer: signer.publicKey,
      order: orderPda,
      rfq: rfqPda,
    })
    .signers(signers)
    .rpc()

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
  signer: Wallet,
  rfqId: number,
  orderId: number,
  assetWallet: PublicKey,
  quoteWallet: PublicKey,
): Promise<any> {
  const program = await getProgram(provider)

  const [rfqPda, _rfqBump] = await PublicKey.findProgramAddress(
    [Buffer.from(RFQ_SEED), Buffer.from(rfqId.toString())],
    program.programId
  )

  let rfqState: any = await program.account.rfqState.fetch(rfqPda)

  const assetMint = new PublicKey(rfqState.assetMint.toString())
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
    [Buffer.from(ORDER_SEED), Buffer.from(rfqId.toString()), Buffer.from(orderId.toString())],
    program.programId
  )

  let signers = []
  if (signer.payer) {
    signers.push(signer.payer)
  }

  const tx = await program.methods.returnCollateral()
    .accounts({
      assetEscrow: assetEscrowPda,
      assetMint,
      assetWallet,
      signer: signer.publicKey,
      order: orderPda,
      quoteEscrow: quoteEscrowPda,
      quoteWallet,
      quoteMint,
      rent: SYSVAR_RENT_PUBKEY,
      rfq: rfqPda,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID
    })
    .signers(signers)
    .rpc()

  rfqState = await program.account.rfqState.fetch(rfqPda)
  const orderState = await program.account.orderState.fetch(orderPda)

  return {
    orderState,
    rfqState,
    tx
  }
}

export async function settle(
  provider: Provider,
  signer: Wallet,
  rfqId: number,
  orderId: number,
  assetWallet: PublicKey,
  quoteWallet: PublicKey
): Promise<any> {
  const program = await getProgram(provider)

  const [protocolPda, _protocolBump] = await PublicKey.findProgramAddress(
    [Buffer.from(PROTOCOL_SEED)],
    program.programId
  )
  const [rfqPda, _rfqBump] = await PublicKey.findProgramAddress(
    [Buffer.from(RFQ_SEED), Buffer.from(rfqId.toString())],
    program.programId
  )

  const protocolState: any = await program.account.protocolState.fetch(protocolPda)
  let rfqState: any = await program.account.rfqState.fetch(rfqPda)

  const assetMint = new PublicKey(rfqState.assetMint.toString())
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
    [Buffer.from(ORDER_SEED), Buffer.from(rfqId.toString()), Buffer.from(orderId.toString())],
    program.programId
  )

  const orderState: any = await program.account.orderState.fetch(orderPda)
  let treasuryWallet: PublicKey
  let treasuryMint: PublicKey

  if (orderState?.confirmedQuote?.hasOwnProperty('ask')) {
    treasuryMint = assetMint
    treasuryWallet = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      assetMint,
      protocolState.authority
    )
  } else {
    treasuryMint = quoteMint
    treasuryWallet = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      quoteMint,
      protocolState.authority
    )
  }

  const token = new Token(
    provider.connection,
    treasuryMint,
    TOKEN_PROGRAM_ID,
    signer as unknown as Signer
  );

  let instructions = []
  try {
    const account = await token.getAccountInfo(treasuryWallet)
    if (account.amount.toNumber() < 0) {
      throw new Error('Account does not exist')
    }
  } catch {
    // ATA might not exist so create it
    instructions.push(Token.createAssociatedTokenAccountInstruction(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      treasuryMint,
      treasuryWallet,
      protocolState.authority,
      signer.publicKey
    ))
  }

  const accounts = {
    assetEscrow: assetEscrowPda,
    assetMint,
    assetWallet,
    signer: signer.publicKey,
    order: orderPda,
    quoteEscrow: quoteEscrowPda,
    quoteMint,
    quoteWallet,
    rfq: rfqPda,
    systemProgram: SystemProgram.programId,
    tokenProgram: TOKEN_PROGRAM_ID,
    protocol: protocolPda,
    treasuryWallet,
    rent: SYSVAR_RENT_PUBKEY,
  }

  let signers = []
  if (signer.payer) {
    signers.push(signer.payer)
  }

  let tx: string
  if (instructions.length > 0) {
    tx = await program.methods.settle()
      .accounts(accounts)
      .preInstructions(instructions)
      .signers(signers)
      .rpc()
  } else {
    tx = await program.methods.settle()
      .accounts(accounts)
      .signers(signers)
      .rpc()
  }

  rfqState = await program.account.rfqState.fetch(rfqPda)

  return {
    tx,
    rfqState
  }
}

// Helpers

export async function getRFQs(
  provider: Provider,
  page: number | null,
  pageSize: number | null
): Promise<object[]> {
  const program = await getProgram(provider)
  const [protocolPda, _protocolBump] = await PublicKey.findProgramAddress(
    [Buffer.from(PROTOCOL_SEED)],
    program.programId
  )
  const protocolState: any = await program.account.protocolState.fetch(protocolPda)
  const range = Array.from({
    length: protocolState.rfqCount.toNumber()
  }, (_, i) => 1 + i)

  const rfqPDAs = await Promise.all(range.map(async (i) => {
    const [rfqPda, _rfqBump] = await PublicKey.findProgramAddress(
      [Buffer.from(RFQ_SEED), Buffer.from(i.toString())],
      program.programId
    )
    return rfqPda
  }))

  const rfqs: any[] = await program.account.rfqState.fetchMultiple(rfqPDAs)

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

/// Integration

export async function mintPsyOptionsAmericanOptions(provider: Provider, rfqId: number) {
  const program = await getProgram(provider)
  const [rfqPda, _rfqBump] = await PublicKey.findProgramAddress(
    [Buffer.from(RFQ_SEED), Buffer.from(rfqId.toString())],
    program.programId
  )
  const rfqState: any = await program.account.rfqState.fetch(rfqPda)

  for (let i = 0; i < rfqState.legs.length; i++) {
    // 🦆
    // - Check if market exists for each leg
    // - Initialize market if does not exist
    // - Mint option
    console.log(rfqState.legs[i])
  }

  return { rfqState }
}

/// Utils

export async function getBalance(
  provider: Provider,
  signer: PublicKey,
  mint: PublicKey
) {
  const program = await getProgram(provider)
  try {
    const parsedAccount = await program.provider.connection.getParsedTokenAccountsByOwner(signer, { mint })
    return parseInt(parsedAccount.value[0].account.data.parsed.info.tokenAmount.amount, 10);
  } catch {
    return null
  }
}

/// Testing

export const calcFee = (amount: number, numerator: number, denominator: number): number => {
  return parseInt((amount * (numerator / denominator)).toString(), 10)
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
