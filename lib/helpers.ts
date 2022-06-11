import * as anchor from '@project-serum/anchor'
import { ProgramAccount, BN, Idl, Program, Provider, Wallet } from '@project-serum/anchor'
import { ASSOCIATED_TOKEN_PROGRAM_ID, Token, TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { PublicKey, SystemProgram, SYSVAR_CLOCK_PUBKEY, AccountMeta, TransactionInstruction, Signer, SYSVAR_RENT_PUBKEY } from '@solana/web3.js'

import { default as idl } from '../target/idl/rfq.json'
import { Rfq } from '../target/types/rfq'

import { default as psyAmericanIdl } from '../lib/integrations/idl/psyAmerican.json'
import { PsyAmerican } from '../lib/integrations/types/psyAmerican'

export const RFQ_SEED = 'rfq'
export const ORDER_SEED = 'order'
export const PROTOCOL_SEED = 'protocol'
export const ASSET_ESCROW_SEED = 'asset_escrow'
export const QUOTE_ESCROW_SEED = 'quote_escrow'

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
  Future: {
    future: {}
  }
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
  Amount: null,
  Contract: null,
  ContractQuoteAmount: null,
  ContractAssetAmount: null,
  Processed: null,
  Expiry: null,
  Instrument: null,
  Venue: null,
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


  const [rfqPda, _rfqBump] = await PublicKey.findProgramAddress(
    [
      Buffer.from(RFQ_SEED),
      signer.publicKey.toBuffer(),
      assetMint.toBuffer(),
      quoteMint.toBuffer(),
      new BN(orderAmount).toArrayLike(Buffer, 'le', 8),
      new BN(expiry).toArrayLike(Buffer, 'le', 8)
    ],
    program.programId
  )
  const [assetEscrowPda, _assetEscrowBump] = await PublicKey.findProgramAddress(
    [Buffer.from(ASSET_ESCROW_SEED), rfqPda.toBuffer()],
    program.programId
  )
  const [quoteEscrowPda, _quoteEscrowPda] = await PublicKey.findProgramAddress(
    [Buffer.from(QUOTE_ESCROW_SEED), rfqPda.toBuffer()],
    program.programId
  )

  let signers = []
  if (signer.payer) {
    signers.push(signer.payer)
  }

  const tx = await program.methods.request(accessManager, new BN(expiry), lastLook, legs, new BN(orderAmount), requestOrder)
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

  const protocolState = await program.account.protocolState.fetch(protocolPda)
  const rfqState = await program.account.rfqState.fetch(rfqPda)

  return {
    tx,
    protocolState,
    rfqState,
    rfqPda
  }
}

export async function cancel(
  provider: Provider,
  signer: Wallet,
  rfqPda: PublicKey
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
  rfqPda: PublicKey,
  bid: number | null,
  ask: number | null,
  assetWallet: PublicKey,
  quoteWallet: PublicKey
): Promise<any> {
  const program = await getProgram(provider)

  let rfqState: any = await program.account.rfqState.fetch(rfqPda)

  const [assetEscrowPda, _assetEscrowBump] = await PublicKey.findProgramAddress(
    [Buffer.from(ASSET_ESCROW_SEED), rfqPda.toBuffer()],
    program.programId
  )
  const [quoteEscrowPda, _quoteEscrowPDA] = await PublicKey.findProgramAddress(
    [Buffer.from(QUOTE_ESCROW_SEED), rfqPda.toBuffer()],
    program.programId
  )
  const [orderPda, _orderBump] = await PublicKey.findProgramAddress(
    [
      Buffer.from(ORDER_SEED),
      rfqPda.toBuffer(),
      signer.publicKey.toBuffer(),
      new BN(bid ? bid : 0).toArrayLike(Buffer, 'le', 8),
      new BN(ask ? ask : 0).toArrayLike(Buffer, 'le', 8),
    ],
    program.programId
  )

  let signers = []
  if (signer.payer) {
    signers.push(signer.payer)
  }

  const tx = await program.methods.respond(bid ? new BN(bid) : null, ask ? new BN(ask) : null)
    .accounts({
      assetMint: rfqState.assetMint,
      assetWallet,
      signer: signer.publicKey,
      assetEscrow: assetEscrowPda,
      quoteEscrow: quoteEscrowPda,
      order: orderPda,
      quoteMint: rfqState.quoteMint,
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
    orderPda,
    tx
  }
}

export async function confirm(
  provider: Provider,
  rfqPda: PublicKey,
  orderPda: PublicKey,
  signer: Wallet,
  assetWallet: PublicKey,
  quoteWallet: PublicKey,
  side: object
): Promise<any> {
  const program = await getProgram(provider)

  let rfqState: any = await program.account.rfqState.fetch(rfqPda)

  const [assetEscrowPda, _assetEscrowBump] = await PublicKey.findProgramAddress(
    [Buffer.from(ASSET_ESCROW_SEED), rfqPda.toBuffer()],
    program.programId
  )
  const [quoteEscrowPda, _quoteEscrowPda] = await PublicKey.findProgramAddress(
    [Buffer.from(QUOTE_ESCROW_SEED), rfqPda.toBuffer()],
    program.programId
  )

  let signers = []
  if (signer.payer) {
    signers.push(signer.payer)
  }

  const tx = await program.methods.confirm(side)
    .accounts({
      assetMint: rfqState.assetMint,
      assetWallet,
      signer: signer.publicKey,
      assetEscrow: assetEscrowPda,
      order: orderPda,
      quoteWallet,
      quoteEscrow: quoteEscrowPda,
      quoteMint: rfqState.quoteMint,
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
  rfqPda: PublicKey,
  orderPda: PublicKey
): Promise<any> {
  const program = await getProgram(provider)

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
  rfqPda: PublicKey,
  orderPda: PublicKey,
  assetWallet: PublicKey,
  quoteWallet: PublicKey,
): Promise<any> {
  const program = await getProgram(provider)

  let rfqState: any = await program.account.rfqState.fetch(rfqPda)

  const [assetEscrowPda, _assetEscrowBump] = await PublicKey.findProgramAddress(
    [Buffer.from(ASSET_ESCROW_SEED), rfqPda.toBuffer()],
    program.programId
  )
  const [quoteEscrowPda, _quoteEscrowPDA] = await PublicKey.findProgramAddress(
    [Buffer.from(QUOTE_ESCROW_SEED), rfqPda.toBuffer()],
    program.programId
  )

  let signers = []
  if (signer.payer) {
    signers.push(signer.payer)
  }

  const tx = await program.methods.returnCollateral()
    .accounts({
      assetEscrow: assetEscrowPda,
      assetMint: rfqState.assetMint,
      assetWallet,
      signer: signer.publicKey,
      order: orderPda,
      quoteEscrow: quoteEscrowPda,
      quoteWallet,
      quoteMint: rfqState.quoteMint,
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
  rfqPda: PublicKey,
  orderPda: PublicKey,
  assetWallet: PublicKey,
  quoteWallet: PublicKey
): Promise<any> {
  const program = await getProgram(provider)

  const [protocolPda, _protocolBump] = await PublicKey.findProgramAddress(
    [Buffer.from(PROTOCOL_SEED)],
    program.programId
  )

  const protocolState: any = await program.account.protocolState.fetch(protocolPda)
  let rfqState: any = await program.account.rfqState.fetch(rfqPda)

  const [assetEscrowPda, _assetEscrowBump] = await PublicKey.findProgramAddress(
    [Buffer.from(ASSET_ESCROW_SEED), rfqPda.toBuffer()],
    program.programId
  )
  const [quoteEscrowPda, _quoteEscrowPDA] = await PublicKey.findProgramAddress(
    [Buffer.from(QUOTE_ESCROW_SEED), rfqPda.toBuffer()],
    program.programId
  )

  const orderState: any = await program.account.orderState.fetch(orderPda)

  let treasuryMint: PublicKey
  if (orderState?.confirmedQuote?.hasOwnProperty('ask')) {
    treasuryMint = rfqState.assetMint
  } else {
    treasuryMint = rfqState.quoteMint
  }

  const treasuryWallet = await Token.getAssociatedTokenAddress(
    ASSOCIATED_TOKEN_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
    treasuryMint,
    protocolState.authority
  )

  const token = new Token(
    provider.connection,
    treasuryMint,
    TOKEN_PROGRAM_ID,
    signer as unknown as Signer
  )

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
    assetMint: rfqState.assetMint,
    assetWallet,
    signer: signer.publicKey,
    order: orderPda,
    quoteEscrow: quoteEscrowPda,
    quoteMint: rfqState.quoteMint,
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
  const rfqs: any[] = await program.account.rfqState.all()
  return rfqs
}


export async function getMyOrders(provider: Provider, signer: PublicKey): Promise<object[]> {
  const programId = new PublicKey(idl.metadata.address)
  const program = new anchor.Program(idl as Idl, programId, provider) as Program<Rfq>
  const myOrders = await program.account.orderState.all([
    {
      memcmp: {
        offset: 8 + 10,
        bytes: signer.toBase58()
      }
    }
  ])
  return myOrders
}

export async function getRfqOrders(provider: Provider, rfq: PublicKey): Promise<object[]> {
  const programId = new PublicKey(idl.metadata.address)
  const program = new anchor.Program(idl as Idl, programId, provider) as Program<Rfq>
  const rfqOrders = await program.account.orderState.all([
    {
      memcmp: {
        offset: 8 + 55,
        bytes: rfq.toBase58()
      }
    }
  ])
  return rfqOrders
}

export async function getAllOrders(provider: Provider): Promise<object[]> {
  const program = await getProgram(provider)
  const allOrders = await program.account.orderState.all()
  return allOrders
}

/// Integrations

// PsyOptions market fee owner as hardcoded in contract code
const FEE_OWNER = new PublicKey('6c33US7ErPmLXZog9SyChQUYUrrJY51k4GmzdhrbhNnD')

// Option market structure
export type OptionMarket = {
  optionMint: PublicKey
  writerTokenMint: PublicKey
  underlyingAssetMint: PublicKey
  quoteAssetMint: PublicKey
  underlyingAssetPool: PublicKey
  quoteAssetPool: PublicKey
  mintFeeAccount: PublicKey
  exerciseFeeAccount: PublicKey
  underlyingAmountPerContract: BN
  quoteAmountPerContract: BN
  expirationUnixTimestamp: BN
  expired: boolean
  bumpSeed: number
}

/**
 * Gets PsyOptions American options program.
 * 
 * @param provider 
 * @returns Promise<Program>
 */
export async function getPsyAmericanProgram(provider: Provider): Promise<Program> {
  const programId = new PublicKey(psyAmericanIdl.metadata.address)
  return new anchor.Program(psyAmericanIdl as Idl, programId, provider)
}

/**
 * Initializes the PsyOptions American option market.
 * 
 * @param assetToken 
 * @param expirationUnixTimestamp 
 * @param provider 
 * @param quoteAmountPerContract 
 * @param quoteToken 
 * @param signer 
 * @param underlyingAmountPerContract 
 * @returns Promise<any> 
 */
export async function initializePsyAmericanOptionMarket(
  assetToken: Token,
  expirationUnixTimestamp: BN,
  provider: Provider,
  quoteAmountPerContract: BN,
  quoteToken: Token,
  signer: Wallet,
  underlyingAmountPerContract: BN
): Promise<any> {
  const psyAmericanProgram = await getPsyAmericanProgram(provider)

  let signers = []
  if (signer.payer) {
    signers.push(signer.payer)
  }

  const [optionMarket, optionMarketBumpSeed] = await PublicKey.findProgramAddress([
    assetToken.publicKey.toBuffer(),
    quoteToken.publicKey.toBuffer(),
    underlyingAmountPerContract.toArrayLike(Buffer, 'le', 8),
    quoteAmountPerContract.toArrayLike(Buffer, 'le', 8),
    expirationUnixTimestamp.toArrayLike(Buffer, 'le', 8)
  ],
    psyAmericanProgram.programId
  )
  const [optionMint, _optionMintBump] = await PublicKey.findProgramAddress(
    [optionMarket.toBuffer(), Buffer.from('optionToken')],
    psyAmericanProgram.programId
  )
  const [writerTokenMint, _writerTokenMintBump] = await PublicKey.findProgramAddress(
    [optionMarket.toBuffer(), Buffer.from('writerToken')],
    psyAmericanProgram.programId
  )
  const [quoteAssetPool, _quoteAssetPoolBump] = await PublicKey.findProgramAddress(
    [optionMarket.toBuffer(), Buffer.from('quoteAssetPool')],
    psyAmericanProgram.programId
  )
  const [underlyingAssetPool, _underlyingAssetPoolBump] = await PublicKey.findProgramAddress(
    [optionMarket.toBuffer(), Buffer.from('underlyingAssetPool')],
    psyAmericanProgram.programId
  )

  let remainingAccounts: AccountMeta[] = []
  let instructions: TransactionInstruction[] = []

  const mintFeeATA = await Token.getAssociatedTokenAddress(
    ASSOCIATED_TOKEN_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
    assetToken.publicKey,
    FEE_OWNER
  )
  const exerciseFeeATA = await Token.getAssociatedTokenAddress(
    ASSOCIATED_TOKEN_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
    quoteToken.publicKey,
    FEE_OWNER
  )

  try {
    await assetToken.getAccountInfo(mintFeeATA);
  } catch {
    // Mint fee ATA DNE
    remainingAccounts.push({
      pubkey: mintFeeATA,
      isWritable: true,
      isSigner: false
    })
    instructions.push(Token.createAssociatedTokenAccountInstruction(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      assetToken.publicKey,
      mintFeeATA,
      FEE_OWNER,
      signer.publicKey
    ))
  }

  try {
    await quoteToken.getAccountInfo(exerciseFeeATA);
  } catch {
    // Exercise fee ATA DNE
    remainingAccounts.push({
      pubkey: exerciseFeeATA,
      isWritable: false,
      isSigner: false
    })
    instructions.push(Token.createAssociatedTokenAccountInstruction(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      quoteToken.publicKey,
      exerciseFeeATA,
      FEE_OWNER,
      signer.publicKey
    ))
  }

  const accounts = {
    user: signer.payer.publicKey,
    underlyingAssetMint: assetToken.publicKey,
    quoteAssetMint: quoteToken.publicKey,
    psyAmericanProgram: psyAmericanProgram.programId,
    optionMint,
    writerTokenMint,
    quoteAssetPool,
    underlyingAssetPool,
    optionMarket,
    feeOwner: FEE_OWNER,
    tokenProgram: TOKEN_PROGRAM_ID,
    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    rent: SYSVAR_RENT_PUBKEY,
    systemProgram: SystemProgram.programId,
    clock: SYSVAR_CLOCK_PUBKEY
  }

  const rfqProgram = await getProgram(provider)
  await rfqProgram.methods.initializePsyOptionsAmericanOptionMarket(
    underlyingAmountPerContract,
    quoteAmountPerContract,
    expirationUnixTimestamp,
    optionMarketBumpSeed
  )
    .accounts(accounts)
    .preInstructions(instructions)
    .remainingAccounts(remainingAccounts)
    .signers(signers)
    .rpc()

  return {
    optionMarket: accounts,
    publicKey: optionMarket
  }
}

/**
 * Mints PsyOptions American option.
 * 
 * @param assetToken 
 * @param publicKey 
 * @param optionMarket 
 * @param provider 
 * @param signer 
 * @param size 
 * @returns 
 */
export async function mintPsyAmericanOption(
  assetToken: Token,
  legId: number,
  publicKey: PublicKey,
  optionMarket: OptionMarket,
  provider: Provider,
  rfqPda: PublicKey,
  signer: Wallet,
  size: BN
): Promise<any> {
  const psyAmericanProgram = await getPsyAmericanProgram(provider)
  const rfqProgram = await getProgram(provider)

  // TODO: Is this the correct program?
  const [vault, _vaultBump] = await PublicKey.findProgramAddress(
    [assetToken.publicKey.toBuffer(), Buffer.from('vault')],
    rfqProgram.programId
  )
  const [vaultAuthority, vaultAuthorityBump] = await PublicKey.findProgramAddress(
    [assetToken.publicKey.toBuffer(), Buffer.from('vaultAuthority')],
    rfqProgram.programId
  )

  // TODO: What if vault already exists?
  await rfqProgram.methods.initializePsyOptionsAmericanMintVault()
    .accounts({
      authority: signer.publicKey,
      underlyingAsset: assetToken.publicKey,
      vault,
      vaultAuthority,
      tokenProgram: TOKEN_PROGRAM_ID,
      rent: SYSVAR_RENT_PUBKEY,
      systemProgram: SystemProgram.programId,
    })
    .signers([signer.payer])
    .rpc()

  const optionToken = new Token(
    provider.connection,
    optionMarket.optionMint,
    TOKEN_PROGRAM_ID,
    signer as unknown as Signer
  )
  const writerToken = new Token(
    provider.connection,
    optionMarket.writerTokenMint,
    TOKEN_PROGRAM_ID,
    signer as unknown as Signer
  )

  let instructions = []

  const mintedOptionDest = await Token.getAssociatedTokenAddress(
    ASSOCIATED_TOKEN_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
    optionToken.publicKey,
    signer.publicKey
  )
  const mintedWriterTokenDest = await Token.getAssociatedTokenAddress(
    ASSOCIATED_TOKEN_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
    writerToken.publicKey,
    signer.publicKey
  )

  try {
    const account = await optionToken.getAccountInfo(signer.publicKey)
    if (account.amount.toNumber() < 0) {
      throw new Error('Account does not exist')
    }
  } catch {
    // ATA might not exist so create it
    instructions.push(Token.createAssociatedTokenAccountInstruction(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      optionToken.publicKey,
      mintedOptionDest,
      signer.publicKey,
      signer.publicKey
    ))
  }

  try {
    const account = await writerToken.getAccountInfo(signer.publicKey)
    if (account.amount.toNumber() < 0) {
      throw new Error('Account does not exist')
    }
  } catch {
    // ATA might not exist so create it
    instructions.push(Token.createAssociatedTokenAccountInstruction(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      writerToken.publicKey,
      mintedWriterTokenDest,
      signer.publicKey,
      signer.publicKey
    ))
  }

  const signerAssetATA = await Token.getAssociatedTokenAddress(
    ASSOCIATED_TOKEN_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
    assetToken.publicKey,
    signer.publicKey
  )

  const accounts = {
    authority: signer.publicKey,
    psyAmericanProgram: psyAmericanProgram.programId,
    // TODO: Is this correct?
    vault: signerAssetATA,
    // TODO: Is this correct?
    vaultAuthority: signer.publicKey,
    underlyingAssetMint: assetToken.publicKey,
    underlyingAssetPool: optionMarket.underlyingAssetPool,
    optionMint: optionMarket.optionMint,
    mintedOptionDest,
    writerTokenMint: optionMarket.writerTokenMint,
    mintedWriterTokenDest,
    optionMarket: publicKey,
    feeOwner: FEE_OWNER,
    tokenProgram: TOKEN_PROGRAM_ID,
    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    rfq: rfqPda,
    clock: SYSVAR_CLOCK_PUBKEY,
    rent: SYSVAR_RENT_PUBKEY,
    systemProgram: SystemProgram.programId,
  }

  const tx = await rfqProgram.methods.mintPsyOptionsAmericanOption(legId, size, vaultAuthorityBump)
    .accounts(accounts)
    .preInstructions(instructions)
    .signers([signer.payer])
    .rpc()

  return { tx }
}

/**
 * Mints PsyOptions American options for RFQ. Steps include the following.
 * 
 * - Fetches RFQ
 * - Iterates through legs
 *  - Initializes market if it does not exist
 *  - Initialized vault if it does not exist
 *  - Mints the leg option
 * 
 * @param provider 
 * @param rfqPda
 * @param signer 
 * @returns Promise<any>
 */
export async function processLegs(
  provider: Provider,
  rfqPda: PublicKey,
  signer: Wallet
): Promise<object> {
  const psyAmericanProgram = await getPsyAmericanProgram(provider)
  const optionMarkets = (await psyAmericanProgram.account.optionMarket.all()) as unknown as ProgramAccount<OptionMarket>[]

  const rfqProgram = await getProgram(provider)
  const rfqState: any = await rfqProgram.account.rfqState.fetch(rfqPda)

  const assetToken = new Token(
    provider.connection,
    rfqState.assetMint,
    TOKEN_PROGRAM_ID,
    signer as unknown as Signer
  )
  const quoteToken = new Token(
    provider.connection,
    rfqState.quoteMint,
    TOKEN_PROGRAM_ID,
    signer as unknown as Signer
  )

  // Check if market exists
  for (let i = 0; i < rfqState.legs.length; i++) {
    if (!('psyOptions' in rfqState.legs[i].venue)) {
      continue
    }

    let legOptionMarket: OptionMarket | null = null
    let legOptionMarketPublicKey: PublicKey | null = null

    const underlyingAmountPerContract = rfqState.legs[i].contractAssetAmount
    const quoteAmountPerContract = rfqState.legs[i].contractQuoteAmount
    const expirationUnixTimestamp = rfqState.legs[i].expiry
    const size = rfqState.legs[i].amount
    const legId = rfqState.legs[i].id

    for (let j = 0; j < optionMarkets.length; j++) {
      const optionMarket = optionMarkets[j].account
      const optionMarketPublicKey = optionMarkets[j].publicKey

      if (assetToken.publicKey.toString() == optionMarket.underlyingAssetMint.toString() &&
        quoteToken.publicKey.toString() == optionMarket.quoteAssetMint.toString() &&
        expirationUnixTimestamp.toNumber() == optionMarket.expirationUnixTimestamp.toNumber() &&
        underlyingAmountPerContract.toNumber() == optionMarket.underlyingAmountPerContract.toNumber() &&
        quoteAmountPerContract.toNumber() == optionMarket.quoteAmountPerContract.toNumber()) {
        // Leg market exists
        legOptionMarket = optionMarket
        legOptionMarketPublicKey = optionMarketPublicKey
        break
      }
    }

    // Initialize market if it does not exist
    if (legOptionMarket === null && legOptionMarketPublicKey === null) {
      const res = await initializePsyAmericanOptionMarket(
        assetToken,
        expirationUnixTimestamp,
        provider,
        quoteAmountPerContract,
        quoteToken,
        signer,
        underlyingAmountPerContract
      )

      legOptionMarket = res.optionMarket
      legOptionMarketPublicKey = res.publicKey
    }

    if (legOptionMarketPublicKey && legOptionMarket) {
      await mintPsyAmericanOption(assetToken, legId, legOptionMarketPublicKey, legOptionMarket, provider, rfqPda, signer, size)
    }

    legOptionMarket = null
    legOptionMarketPublicKey = null
  }

  // 🦆:
  // - Consolidate instructions into one transaction

  return { rfqState }
}

/// Utils

export async function getProgram(provider: Provider): Promise<Program> {
  const programId = new PublicKey(idl.metadata.address)
  return new anchor.Program(idl as Idl, programId, provider)
}

export async function getBalance(
  provider: Provider,
  signer: PublicKey,
  mint: PublicKey
) {
  const program = await getProgram(provider)
  try {
    const parsedAccount = await program.provider.connection.getParsedTokenAccountsByOwner(signer, { mint })
    return parseInt(parsedAccount.value[0].account.data.parsed.info.tokenAmount.amount, 10)
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
