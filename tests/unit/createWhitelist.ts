import { Keypair, PublicKey } from "@solana/web3.js";
import { Context, getContext } from "../utilities/wrappers";

describe("Create Whitelist", () => {
  let context: Context;

  before(async () => {
    context = await getContext();
  });

  it("Create a whitelist", async () => {
    const whitelistKeypair = Keypair.generate();

    await context.createWhitelist(
      whitelistKeypair,
      context.taker.publicKey,
      [context.maker.publicKey, context.dao.publicKey],
      10
    );
  });

  it("Add an address to whitelist", async () => {
    const whitelistKeypair = Keypair.generate();
    const newPublickey = new PublicKey("Eyv3PBdmp5PUVzrT3orDVad8roBMK8au9nKBazZXkKtA");

    const whitelist = await context.createWhitelist(
      whitelistKeypair,
      context.taker.publicKey,
      [context.dao.publicKey, newPublickey],
      50
    );

    await whitelist.addAddressToWhitelist(context.maker.publicKey);
  });

  it("remove an address from whitelist", async () => {
    const whitelistKeypair = Keypair.generate();

    const whitelist = await context.createWhitelist(
      whitelistKeypair,
      context.taker.publicKey,
      [context.maker.publicKey, context.dao.publicKey],
      10
    );
    await whitelist.removeAddressFromWhitelist(context.maker.publicKey);
  });

  it("clean up", async () => {
    const whitelistKeypair = Keypair.generate();

    const whitelist = await context.createWhitelist(
      whitelistKeypair,
      context.taker.publicKey,
      [context.maker.publicKey, context.dao.publicKey],
      10
    );

    await whitelist.cleanUp();
  });
});
