import path from "path";
import fsPromise from "node:fs/promises";

import { Keypair } from "@solana/web3.js";

export const testsDirectory = "tests";
export const fixturesBasePath = path.join(testsDirectory, "fixtures");
export const fixtureAccountsPath = path.join(fixturesBasePath, "accounts");
export const fixtureKeypairsPath = path.join(fixturesBasePath, "keypairs");
export const pubkeyNamingFilePath = path.join(fixturesBasePath, "pubkey-naming.json");

export async function readKeypair(fileName: string) {
  const filePath = path.join(fixtureKeypairsPath, `${fileName}.json`);
  const content = await fsPromise.readFile(filePath, { encoding: "utf-8" });
  const secretKey: number[] = JSON.parse(content);
  return Keypair.fromSecretKey(Uint8Array.from(secretKey));
}

export async function loadPubkeyNaming() {
  const content = await fsPromise.readFile(pubkeyNamingFilePath, { encoding: "utf-8" });
  const naming: { [pubkey: string]: string } = JSON.parse(content);
  return naming;
}
