import {
  AnchorProvider,
  BN,
  parseIdlErrors,
  Program,
  ProgramError,
  Wallet,
  web3,
} from "@project-serum/anchor";
import NodeWallet from "@project-serum/anchor/dist/cjs/nodewallet";
import { bs58 } from "@project-serum/anchor/dist/cjs/utils/bytes";
import { EuroPrimitive, IDL } from "./euro_primitive";
import { EuroMeta, ExpirationData, OptionType } from "./types";

export const MAINNET_FEE_OWNER_KEY = new web3.PublicKey(
  "CyDnoEMVuf21v23bxoS2wXxPdCvRR2yFLfymegMH1WY4"
);

export const DEVNET_FEE_OWNER_KEY = new web3.PublicKey(
  "Bja7SLji7JzzS5fwg2qUESoPbktALCMuUJLd8VCy8DkG"
);

export type SolCluster = web3.Cluster | "localnet";

/**
 * Given a connection to any node, return the cluster name
 */
export const getClusterNameFromConnection = async (
  connection: web3.Connection
): Promise<SolCluster> => {
  const genesisHash = await connection.getGenesisHash();
  switch (genesisHash) {
    case "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d":
      return "mainnet-beta";
    case "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG":
      return "devnet";
    case "4uhcVJyU9pJkvQyS88uRDiswHXSCkY3zQawwpjk2NsNY":
      return "testnet";
    default:
      return "localnet";
  }
};

/**
 * Given any Connection return the Fee owner. This is required for applications to
 */
export const getFeeOwnerForCluster = async (connection: web3.Connection) => {
  const cluster = await getClusterNameFromConnection(connection);
  switch (cluster) {
    case "devnet":
      return DEVNET_FEE_OWNER_KEY;
    default:
      return MAINNET_FEE_OWNER_KEY;
  }
};

export const CONTRACT_TOKEN_DECIMALS = 4;

const TEN_BN = new BN(10);

export const CONTRACT_DECIMALS_BN = new BN(
  Math.pow(10, CONTRACT_TOKEN_DECIMALS)
);

export const contractAmountToUnderlyingAmount = (
  contractAmount: BN,
  underlyingAmountPerContract: BN
) => contractAmount.mul(underlyingAmountPerContract).div(CONTRACT_DECIMALS_BN);

export const contractAmountToStableAmount = (
  contractAmount: BN,
  euroMeta: EuroMeta
) => {
  const underlyingAmount = contractAmount
    .mul(euroMeta.underlyingAmountPerContract)
    .div(CONTRACT_DECIMALS_BN);
  const underlyingDecimalsFactor = TEN_BN.pow(
    new BN(euroMeta.underlyingDecimals)
  );
  const priceDecimalFactor = TEN_BN.pow(new BN(euroMeta.priceDecimals));
  const stableFactor = TEN_BN.pow(new BN(euroMeta.stableDecimals));
  return underlyingAmount
    .mul(euroMeta.strikePrice)
    .mul(stableFactor)
    .div(underlyingDecimalsFactor)
    .div(priceDecimalFactor);
};

export const calcValueInUnderlying = (
  euroMeta: EuroMeta,
  expirationData: ExpirationData,
  amountOfContracts: BN,
  optionType: OptionType
) => {
  let diff = expirationData.priceAtExpiration.sub(euroMeta.strikePrice);
  if (optionType === OptionType.PUT) {
    diff = diff.neg();
  }
  return diff
    .mul(euroMeta.underlyingAmountPerContract)
    .div(expirationData.priceAtExpiration)
    .mul(amountOfContracts)
    .div(CONTRACT_DECIMALS_BN);
};

export const calcValueInStables = (
  euroMeta: EuroMeta,
  expirationData: ExpirationData,
  amountOfContracts: BN
): BN => {
  let diff = euroMeta.strikePrice.sub(expirationData.priceAtExpiration);
  if (diff.isNeg()) {
    return new BN(0);
  }
  const underlyingDecimalsFactor = TEN_BN.pow(
    new BN(euroMeta.underlyingDecimals)
  );
  const priceDecimalFactor = TEN_BN.pow(new BN(euroMeta.priceDecimals));
  const stableFactor = TEN_BN.pow(new BN(euroMeta.stableDecimals));
  return diff
    .mul(euroMeta.underlyingAmountPerContract)
    .div(underlyingDecimalsFactor)
    .mul(stableFactor)
    .div(priceDecimalFactor)
    .mul(amountOfContracts)
    .div(CONTRACT_DECIMALS_BN);
};

const idlErrors = parseIdlErrors(IDL);

export const parseTranactionError = (error: any) => {
  const programError = ProgramError.parse(error, idlErrors);
  if (programError === null) {
    // handle Raw Transaction error. Example below
    // Error: Raw transaction TRANSACTION_ID failed ({"err":{"InstructionError":[1,{"Custom":309}]}})
    let match = error.toString().match(/Raw transaction .* failed \((.*)\)/);
    if (!match) return null;
    const errorResponse = JSON.parse(match[1]);
    const errorCode = errorResponse?.err?.InstructionError?.[1]?.Custom;
    const errorMsg = idlErrors.get(errorCode);
    if (errorMsg !== undefined) {
      return new ProgramError(errorCode, errorMsg, error.logs);
    }
  }

  return programError;
};

/**
 * Load all of the ExpirationData accounts where price_set is false.
 *
 * @param program
 * @returns
 */
export const loadUnsetExpirationAccounts = (
  program: Program<EuroPrimitive>
) => {
  const expirationLayout =
    // @ts-ignore
    program.coder.accounts.accountLayouts.get("expirationData");
  return program.account.expirationData.all([
    {
      memcmp: {
        offset: expirationLayout.offsetOf("priceSet"),
        bytes: bs58.encode([0]),
      },
    },
  ]);
};

/**
 * Fetch all of the EuroMeta accounts in the give Program.
 *
 * @param program - Tokenized Euro Anchor Program
 * @returns
 */
export const loadAllEuroMetaAccunts = (program: Program<EuroPrimitive>) => {
  return program.account.euroMeta.all();
};

/**
 * Generate a new anchor Program
 *
 * @param payer
 * @param jsonRpcUrl
 * @param programId
 */
export const createProgram = (
  payer: web3.Keypair,
  jsonRpcUrl: string,
  programId: web3.PublicKey
) => {
  const connection = new web3.Connection(jsonRpcUrl);

  const wallet = new NodeWallet(payer);
  // Create anchor provider
  const provider = new AnchorProvider(connection, wallet, {
    commitment: "processed",
  });
  // Create anchor Program
  return new Program<EuroPrimitive>(IDL, programId, provider);
};

/**
 * Generate a new anchor Program from wallet
 *
 * @param wallet
 * @param jsonRpcUrl
 * @param programId
 */
export const createProgramFromWallet = (
  wallet: Wallet,
  jsonRpcUrl: string,
  programId: web3.PublicKey
) => {
  const connection = new web3.Connection(jsonRpcUrl);

  // Create anchor provider
  const provider = new AnchorProvider(connection, wallet, {
    commitment: "processed",
  });
  // Create anchor Program
  return new Program<EuroPrimitive>(IDL, programId, provider);
};

/**
 * Generate a new anchor Program from an AnchorProvider
 * @param provider
 * @param programId
 * @returns
 */
export const createProgramFromProvider = (
  provider: AnchorProvider,
  programId: web3.PublicKey
) => {
  // Create anchor Program
  return new Program<EuroPrimitive>(IDL, programId, provider);
};
