import path from "path";
import fsPromise from "node:fs/promises";

import { Keypair } from "@solana/web3.js";

export const testsDirectory = "tests";
export const fixturesBasePath = path.join(testsDirectory, "fixtures");
export const fixtureAccountsPath = path.join(fixturesBasePath, "accounts");
export const fixtureKeypairsPath = path.join(fixturesBasePath, "keypairs");
export const pubkeyNamingFilePath = path.join(fixturesBasePath, "pubkey-naming.json");
export const hxroPubkeyNamingFilePath = path.join(testsDirectory, "dependencies/hxro/pubkey-naming.json");
export const hxroKeypairsPath = path.join(testsDirectory, "dependencies/hxro/keypairs");

export function getKeypairPath(name: string) {
  return path.join(fixtureKeypairsPath, `${name}.json`);
}

export async function readKeypair(name: string) {
  const content = await fsPromise.readFile(getKeypairPath(name), { encoding: "utf-8" });
  const secretKey: number[] = JSON.parse(content);
  return Keypair.fromSecretKey(Uint8Array.from(secretKey));
}

export function getHxroKeypairPath(name: string) {
  return path.join(hxroKeypairsPath, `${name}.json`);
}

export async function readHxroKeypair(name: string) {
  const content = await fsPromise.readFile(getHxroKeypairPath(name), { encoding: "utf-8" });
  const secretKey: number[] = JSON.parse(content);
  return Keypair.fromSecretKey(Uint8Array.from(secretKey));
}

export async function loadPubkeyNaming() {
  return {
    ...(await loadHxroPubkeyNaming()),
    ...(await loadFixturesPubkeyNaming()),
  };
}

export async function loadFixturesPubkeyNaming() {
  const content = await fsPromise.readFile(pubkeyNamingFilePath, { encoding: "utf-8" });
  const namings: { [pubkey: string]: string } = JSON.parse(content);
  return namings;
}

export async function loadHxroPubkeyNaming() {
  const content = await fsPromise.readFile(hxroPubkeyNamingFilePath, { encoding: "utf-8" });
  const namings: { [pubkey: string]: string } = JSON.parse(content);
  return namings;
}
