import { Keypair, PublicKey } from "@solana/web3.js";
import { Context, getContext } from "../utilities/wrappers";

describe("Create Whitelist", () => {
  let context: Context;

  before(async () => {
    context = await getContext();
  });

  it("Create a whitelist", async () => {
    await context.createWhitelist([context.maker.publicKey, context.dao.publicKey]);
  });

  it("Create a whitelist with MAX_WHITELIST_SIZE", async () => {
    const pubkeys: PublicKey[] = [];

    for (let i = 0; i < 20; i++) {
      const keypair = Keypair.generate();
      pubkeys.push(keypair.publicKey);
    }
    await context.createWhitelist(pubkeys);
  });

  it("clean up", async () => {
    const whitelist = await context.createWhitelist([context.maker.publicKey, context.dao.publicKey]);

    await whitelist.cleanUp();
  });
});
