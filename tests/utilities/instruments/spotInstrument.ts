import { BN, Program, workspace } from "@coral-xyz/anchor";
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from "@solana/spl-token";
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { DEFAULT_LEG_AMOUNT, DEFAULT_LEG_SIDE } from "../constants";
import { Instrument, InstrumentController } from "../instrument";
import { getInstrumentEscrowPda } from "../pdas";
import { AssetIdentifier, LegSide } from "../types";
import { Context, Mint, Response, Rfq } from "../wrappers";
import { SpotInstrument as SpotInstrumentIdl } from "../../../target/types/spot_instrument";

let spotInstrumentProgram: Program<SpotInstrumentIdl> | null = null;
export function getSpotInstrumentProgram(): Program<SpotInstrumentIdl> {
  if (spotInstrumentProgram === null) {
    spotInstrumentProgram = workspace.SpotInstrument as Program<SpotInstrumentIdl>;
  }

  return spotInstrumentProgram;
}

export class SpotInstrument implements Instrument {
  static instrumentIndex = 0;

  constructor(private context: Context, public mint: Mint) {}

  static createForLeg(
    context: Context,
    {
      mint = context.btcToken,
      amount = DEFAULT_LEG_AMOUNT,
      side = DEFAULT_LEG_SIDE,
    }: {
      mint?: Mint;
      amount?: BN;
      side?: LegSide;
    } = {}
  ): InstrumentController<SpotInstrument> {
    const annotatedMint: Mint = mint;
    annotatedMint.assertRegisteredAsBaseAsset();
    const instrument = new SpotInstrument(context, annotatedMint);
    return new InstrumentController(
      instrument,
      { amount, side, baseAssetIndex: annotatedMint.baseAssetIndex },
      mint.decimals
    );
  }

  static createForQuote(context: Context, mint: Mint = context.btcToken): InstrumentController<SpotInstrument> {
    const instrument = new SpotInstrument(context, mint);
    return new InstrumentController(instrument, null, mint.decimals);
  }

  static async addInstrument(context: Context) {
    await context.addInstrument(getSpotInstrumentProgram().programId, true, 1, 7, 5, 3, 4);
  }

  static async initializeConfig(context: Context, feeBps: BN) {
    await getSpotInstrumentProgram()
      .methods.initializeConfig(feeBps)
      .accounts({
        authority: context.dao.publicKey,
        protocol: context.protocolPda,
        config: this.getConfigAddress(),
        systemProgram: SystemProgram.programId,
      })
      .signers([context.dao])
      .rpc();
  }

  static getConfigAddress() {
    const program = getSpotInstrumentProgram();
    const [address] = PublicKey.findProgramAddressSync([Buffer.from("config")], program.programId);
    return address;
  }

  getInstrumentIndex(): number {
    return SpotInstrument.instrumentIndex;
  }

  serializeInstrumentData(): Buffer {
    return Buffer.from(this.mint.publicKey.toBytes());
  }

  serializeInstrumentDataForQuote(): Buffer {
    return Buffer.from(this.mint.publicKey.toBytes());
  }

  getProgramId(): PublicKey {
    return getSpotInstrumentProgram().programId;
  }

  async getValidationAccounts() {
    this.mint.assertRegistered();
    return [{ pubkey: this.mint.mintInfoAddress, isSigner: false, isWritable: false }];
  }

  async getPrepareSettlementAccounts(
    side: { taker: {} } | { maker: {} } | { operator: PublicKey },
    assetIdentifier: AssetIdentifier,
    rfq: Rfq,
    response: Response
  ) {
    const caller =
      "taker" in side ? this.context.taker.publicKey : "maker" in side ? this.context.maker.publicKey : side.operator;
    const callerIsSigner = !("operator" in side);

    return [
      { pubkey: caller, isSigner: callerIsSigner, isWritable: true },
      {
        pubkey: await getAssociatedTokenAddress(this.mint.publicKey, caller, true),
        isSigner: false,
        isWritable: true,
      },
      { pubkey: this.mint.publicKey, isSigner: false, isWritable: false },
      {
        pubkey: await getInstrumentEscrowPda(response.account, assetIdentifier, this.getProgramId()),
        isSigner: false,
        isWritable: true,
      },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    ];
  }

  async getSettleAccounts(assetReceiver: PublicKey, assetIdentifier: AssetIdentifier, rfq: Rfq, response: Response) {
    return [
      {
        pubkey: SpotInstrument.getConfigAddress(),
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: await getInstrumentEscrowPda(response.account, assetIdentifier, this.getProgramId()),
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: await this.mint.getAssociatedAddress(assetReceiver),
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: await this.mint.getAssociatedAddress(this.context.dao.publicKey),
        isSigner: false,
        isWritable: true,
      },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ];
  }

  async getRevertSettlementPreparationAccounts(
    side: { taker: {} } | { maker: {} } | { operator: PublicKey },
    assetIdentifier: AssetIdentifier,
    rfq: Rfq,
    response: Response
  ) {
    const caller =
      "taker" in side ? this.context.taker.publicKey : "maker" in side ? this.context.maker.publicKey : side.operator;

    return [
      {
        pubkey: await getInstrumentEscrowPda(response.account, assetIdentifier, this.getProgramId()),
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: await this.mint.getAssociatedAddress(caller),
        isSigner: false,
        isWritable: true,
      },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ];
  }

  async getCleanUpAccounts(assetIdentifier: AssetIdentifier, rfq: Rfq, response: Response) {
    return [
      {
        pubkey: response.firstToPrepare!,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: await getInstrumentEscrowPda(response.account, assetIdentifier, this.getProgramId()),
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: await this.mint.getAssociatedAddress(this.context.dao.publicKey),
        isSigner: false,
        isWritable: true,
      },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ];
  }
}
