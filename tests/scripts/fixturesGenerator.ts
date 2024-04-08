import path from "path";
import fs from "fs";
import fsPromise from "node:fs/promises";
import { spawn } from "node:child_process";

import * as toml from "toml";
import { rimraf } from "rimraf";
import { PublicKey, Keypair, Connection, Version } from "@solana/web3.js";
import { Wallet } from "@coral-xyz/anchor";
import { executeInParallel, inversePubkeyToName, sleep } from "../utilities/helpers";
import { CollateralMint, Context, Mint } from "../utilities/wrappers";
import { SpotInstrument } from "../utilities/instruments/spotInstrument";
import { PsyoptionsAmericanInstrumentClass } from "../utilities/instruments/psyoptionsAmericanInstrument";
import { PsyoptionsEuropeanInstrument } from "../utilities/instruments/psyoptionsEuropeanInstrument";
import {
  BITCOIN_BASE_ASSET_INDEX,
  DEFAULT_COLLATERAL_FUNDED,
  DEFAULT_SOL_FOR_SIGNERS,
  ETH_BASE_ASSET_INDEX,
  ETH_IN_PLACE_PRICE,
  PYTH_SOL_ORACLE,
  SOLANA_BASE_ASSET_INDEX,
  SPOT_QUOTE_FEE_BPS,
  SWITCHBOARD_BTC_ORACLE,
} from "../utilities/constants";
import { OracleSource, RiskCategory } from "../utilities/types";
import {
  fixtureAccountsPath,
  getKeypairPath,
  loadHxroPubkeyNaming,
  pubkeyNamingFilePath,
  readKeypair,
} from "../utilities/fixtures";
import { HxroPrintTradeProvider } from "../utilities/printTradeProviders/hxroPrintTradeProvider";

const ledgerPath = path.join(".anchor", "test-ledger");
const buildDirectoryPath = path.join("target", "deploy");
const anchorConfigPath = "Anchor.toml";
const validatorOutput = path.join(ledgerPath, "validator-output.log");
const validatorPort = "8899";

const namedPubkeys: { [pubkey: string]: string } = {};
const savedAccountFixtures: { pubkey: PublicKey; name: string }[] = [];

process.env.ANCHOR_PROVIDER_URL = "http://127.0.0.1:8899";

async function main() {
  clearFixtures();

  await launchLocalValidator();

  const context = new Context();
  await context.basicInitialize();
  console.log("Context initialized");

  // create and save payers
  await executeInParallel(
    async () => {
      const dao = await fundPayer(context.provider.connection, "dao");
      context.dao = dao;
      await savePayer(context, context.dao, "dao");
    },
    async () => {
      const taker = await fundPayer(context.provider.connection, "taker");
      context.taker = taker;
      await savePayer(context, context.taker, "taker");
    },
    async () => {
      const maker = await fundPayer(context.provider.connection, "maker");
      context.maker = maker;
      await savePayer(context, context.maker, "maker");
    }
  );
  console.log("Initialized payers");

  // create and save mints and related token accounts
  await executeInParallel(
    async () => {
      const btcToken = await Mint.create(context, await readOrCreateKeypair("mint-btc"));
      context.btcToken = btcToken;
      await saveMint(context, context.btcToken, "btc");
    },
    async () => {
      const solToken = await Mint.create(context, await readOrCreateKeypair("mint-sol"));
      context.solToken = solToken;
      await saveMint(context, context.solToken, "sol");
    },
    async () => {
      const ethToken = await Mint.create(context, await readOrCreateKeypair("mint-eth"));
      context.ethToken = ethToken;
      await saveMint(context, context.ethToken, "eth");
    },
    async () => {
      const quoteToken = await Mint.create(context, await readOrCreateKeypair("mint-usd-quote"));
      context.quoteToken = quoteToken;
      await saveMint(context, context.quoteToken, "usd-quote");
    },
    async () => {
      const collateralToken = await CollateralMint.create(context, await readOrCreateKeypair("mint-usd-collateral"));
      context.collateralToken = collateralToken;
      await saveMint(context, context.collateralToken, "usd-collateral");
    }
  );
  console.log("Initialized tokens");

  await context.initializeProtocol();
  console.log("Initialized protocol");
  // static instrument index values are taken from position in this sequence
  await SpotInstrument.addInstrument(context);
  await PsyoptionsEuropeanInstrument.addInstrument(context);
  await PsyoptionsAmericanInstrumentClass.addInstrument(context);
  console.log("Initialized instruments");

  await executeInParallel(
    async () => {
      await SpotInstrument.initializeConfig(context, SPOT_QUOTE_FEE_BPS);

      const configAddress = SpotInstrument.getConfigAddress();
      await saveAccountAsFixture(context, configAddress, "spot-instrument-config");
    },
    async () => {
      await HxroPrintTradeProvider.addPrintTradeProvider(context);

      const hxroAddresses = inversePubkeyToName(await loadHxroPubkeyNaming());
      const mpgAddress = hxroAddresses["mpg"];
      await HxroPrintTradeProvider.initializeConfig(context, mpgAddress);

      const configAddress = HxroPrintTradeProvider.getConfigAddress();
      await saveAccountAsFixture(context, configAddress, "hxro-print-trade-provider-config");
    },
    // initialize and fund collateral accounts`
    async () => {
      await context.initializeCollateral(context.taker);
      await context.fundCollateral(context.taker, DEFAULT_COLLATERAL_FUNDED);
      await saveCollateralPdas(context, context.taker.publicKey, "taker");
    },
    async () => {
      await context.initializeCollateral(context.maker);
      await context.fundCollateral(context.maker, DEFAULT_COLLATERAL_FUNDED);
      await saveCollateralPdas(context, context.maker.publicKey, "maker");
    },
    async () => {
      await context.initializeCollateral(context.dao);
      await saveCollateralPdas(context, context.dao.publicKey, "dao");
    },
    // add base assets, register mints and save accounts
    async () => {
      const { baseAssetPda } = await context.addBaseAsset(
        BITCOIN_BASE_ASSET_INDEX,
        "BTC",
        RiskCategory.VeryLow,
        OracleSource.Switchboard,
        SWITCHBOARD_BTC_ORACLE,
        null,
        null
      );
      await context.btcToken.register(BITCOIN_BASE_ASSET_INDEX);

      await saveAccountAsFixture(context, baseAssetPda, "rfq-base-asset-btc");
      await saveAccountAsFixture(context, context.btcToken.mintInfoAddress as PublicKey, "rfq-mint-info-btc");
    },
    async () => {
      const { baseAssetPda } = await context.addBaseAsset(
        SOLANA_BASE_ASSET_INDEX,
        "SOL",
        RiskCategory.Medium,
        OracleSource.Pyth,
        null,
        PYTH_SOL_ORACLE,
        null
      );
      await context.solToken.register(SOLANA_BASE_ASSET_INDEX);

      await saveAccountAsFixture(context, baseAssetPda, "rfq-base-asset-sol");
      await saveAccountAsFixture(context, context.solToken.mintInfoAddress as PublicKey, "rfq-mint-info-sol");
    },
    async () => {
      const { baseAssetPda } = await context.addBaseAsset(
        ETH_BASE_ASSET_INDEX,
        "ETH",
        RiskCategory.Low,
        OracleSource.InPlace,
        null,
        null,
        ETH_IN_PLACE_PRICE
      );
      await context.ethToken.register(ETH_BASE_ASSET_INDEX);

      await saveAccountAsFixture(context, baseAssetPda, "rfq-base-asset-eth");
      await saveAccountAsFixture(context, context.ethToken.mintInfoAddress as PublicKey, "rfq-mint-info-eth");
    },
    async () => {
      await context.quoteToken.register(null);

      await saveAccountAsFixture(context, context.quoteToken.mintInfoAddress as PublicKey, "rfq-mint-info-usd-quote");
    }
  );
  console.log("Main actions done");

  // postpone saving protocol and risk engine config after all initialization
  // to capture all internal changes in those accounts
  await executeInParallel(() => saveAccountAsFixture(context, context.protocolPda, "rfq-protocol"));

  await savePubkeyNaming();
  process.exit();
}

async function launchLocalValidator() {
  console.log("Launching local validator...");

  await rimraf(ledgerPath);
  await fsPromise.mkdir(ledgerPath);

  const outputFile = fs.createWriteStream(validatorOutput);
  const programsToDeploy = await parsePrograms();
  const validatorProgramParams = programsToDeploy.flatMap(({ address, binaryPath }) => {
    return ["--bpf-program", address, binaryPath];
  });

  const wallet = Wallet.local();
  const validator = spawn("solana-test-validator", [
    "-u",
    "http://0.0.0.0",
    "--ledger",
    ledgerPath,
    "--rpc-port",
    validatorPort,
    "--mint",
    wallet.publicKey.toString(),
    ...validatorProgramParams,
  ]);
  validator.stdout.pipe(outputFile);
  validator.stderr.pipe(outputFile);
  validator.on("exit", (code) => {
    if (code !== null) {
      console.error("Validator have thrown an error, aborting a process!");
      console.error(`Check validator output at ${validatorOutput}`);
      process.exit(1);
    }
  });
  process.on("exit", () => {
    validator.kill();
  });
  await waitForValidator();
}

async function parsePrograms() {
  const anchorToml = await fsPromise.readFile(anchorConfigPath, { encoding: "utf-8" });
  const anchorConfig = toml.parse(anchorToml);
  const localnetPrograms = anchorConfig.programs.localnet;
  const programsInfo = [];
  for (const name in localnetPrograms) {
    const address = localnetPrograms[name] as string;
    programsInfo.push({
      name,
      address,
      binaryPath: path.join(buildDirectoryPath, `${name}.so`),
    });

    namedPubkeys[address] = name.replace(/_/g, "-");
  }

  return programsInfo;
}

async function waitForValidator(): Promise<void> {
  const connection = new Connection(`http://127.0.0.1:${validatorPort}`);
  let version: Version | null = null;

  while (!version) {
    try {
      version = await connection.getVersion();
    } catch (err) {
      console.log("Validator is not online yet. Waiting 1 second...");
      await sleep(1);
    }
  }

  console.log("Validator is online!");
}

async function clearFixtures() {
  await rimraf(fixtureAccountsPath);
  await fsPromise.mkdir(fixtureAccountsPath);
}

async function fundPayer(connection: Connection, name: string) {
  const keypair = await readOrCreateKeypair(name);

  const signature = await connection.requestAirdrop(keypair.publicKey, DEFAULT_SOL_FOR_SIGNERS);
  const latestBlockHash = await connection.getLatestBlockhash();
  await connection.confirmTransaction({
    blockhash: latestBlockHash.blockhash,
    lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
    signature,
  });

  return keypair;
}

async function readOrCreateKeypair(name: string) {
  try {
    return await readKeypair(name);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
    const keypair = Keypair.generate();

    const content = JSON.stringify(Array.from(keypair.secretKey));
    await fsPromise.writeFile(getKeypairPath(name), content);

    return keypair;
  }
}

async function saveCollateralPdas(context: Context, owner: PublicKey, ownerName: string) {
  await saveAccountAsFixture(
    context,
    await context.collateralToken.getTokenPda(owner),
    `rfq-collateral-token-${ownerName}`
  );
  await saveAccountAsFixture(
    context,
    await context.collateralToken.getInfoPda(owner),
    `rfq-collateral-info-${ownerName}`
  );
}

async function savePayer(context: Context, keypair: Keypair, name: string) {
  await saveAccountAsFixture(context, keypair.publicKey, `account-${name}`);
}

async function saveMint(context: Context, mint: Mint, name: string) {
  await saveAccountAsFixture(context, mint.publicKey, `mint-${name}`);

  await executeInParallel(
    () => saveTokenAccount(context, mint, context.dao.publicKey, `${name}-dao`),
    () => saveTokenAccount(context, mint, context.taker.publicKey, `${name}-taker`),
    () => saveTokenAccount(context, mint, context.maker.publicKey, `${name}-maker`)
  );
}

async function saveTokenAccount(context: Context, mint: Mint, owner: PublicKey, name: string) {
  const address = await mint.getAssociatedAddress(owner);
  await saveAccountAsFixture(context, address, `token-account-${name}`);
}

async function savePubkeyNaming() {
  let sorted: { [pubkey: string]: string } = {};
  Object.entries(namedPubkeys)
    .sort((x, y) => x[1].localeCompare(y[1]))
    .forEach(([key, value]) => (sorted[key] = value));

  const content = JSON.stringify(sorted, null, 2);
  await fsPromise.writeFile(pubkeyNamingFilePath, content);
}

async function saveAccountAsFixture(context: Context, pubkey: PublicKey, name: string) {
  namedPubkeys[pubkey.toString()] = name;
  savedAccountFixtures.push({ pubkey, name });
  const content = await accountToJson(context, pubkey);
  const filePath = path.join(fixtureAccountsPath, `${name}.json`);
  await fsPromise.writeFile(filePath, content);
}

async function accountToJson(context: Context, pubkey: PublicKey) {
  const account = await context.provider.connection.getAccountInfo(pubkey);
  if (!account) {
    throw Error("Expected existing account, found none");
  }
  let content = {
    pubkey,
    account: {
      lamports: account.lamports,
      data: [account.data.toString("base64"), "base64"],
      owner: account.owner,
      executable: account.executable,
      rentEpoch: 0,
    },
  };
  return JSON.stringify(content, null, 2);
}

main()
  .then(() => {})
  .catch((err) => {
    console.log(err);
    process.exit();
  });
