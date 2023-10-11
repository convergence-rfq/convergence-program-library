import path from "path";
import fs from "fs";
import fsPromise from "node:fs/promises";
import { spawn } from "node:child_process";

import * as toml from "toml";
import { rimraf } from "rimraf";
import { PublicKey, Keypair, Connection, Version } from "@solana/web3.js";
import { Wallet } from "@coral-xyz/anchor";
import { executeInParallel, sleep } from "../utilities/helpers";
import { Context, Mint } from "../utilities/wrappers";
import { DEFAULT_SOL_FOR_SIGNERS } from "../utilities/constants";
import { fixtureAccountsPath, getKeypairPath, pubkeyNamingFilePath, readKeypair } from "../utilities/fixtures";

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

  // create and save mints and related token accounts
  await executeInParallel(
    async () => {
      const btcToken = await Mint.create(context, 8, await readOrCreateKeypair("mint-btc"));
      context.btcToken = btcToken;
      await saveMint(context, context.btcToken, "btc");
    },
    async () => {
      const solToken = await Mint.create(context, 10, await readOrCreateKeypair("mint-sol"));
      context.solToken = solToken;
      await saveMint(context, context.solToken, "sol");
    },
    async () => {
      const ethToken = await Mint.create(context, 4, await readOrCreateKeypair("mint-eth"));
      context.ethToken = ethToken;
      await saveMint(context, context.ethToken, "eth");
    },
    async () => {
      const quoteToken = await Mint.create(context, 6, await readOrCreateKeypair("mint-usd-quote"));
      context.quoteToken = quoteToken;
      await saveMint(context, context.quoteToken, "usd-quote");
    }
  );

  await context.initializeProtocol();

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
