import { Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { attachImprovedLogDisplay } from "../utilities/helpers";
import { Context, getContext, Mint } from "../utilities/wrappers";
import { expect } from "chai";
import { DEFAULT_ADD_ASSET_FEES } from "../utilities/constants";

describe("RFQ escrow settlement using spot integration tests", () => {
  let context: Context;
  beforeEach(function () {
    attachImprovedLogDisplay(this, context);
  });

  before(async () => {
    context = await getContext();
  });

  it("Create user asset creates accounts", async () => {
    const mint = await Mint.create(context, new Keypair());
    await context.addUserAsset(42, "TEST", mint);

    const baseAssetData = await context.getBaseAsset(42);
    expect(baseAssetData.index.value).to.equal(42);
    expect(baseAssetData.enabled).to.equal(true);
    expect(baseAssetData.nonStrict).to.equal(true);
    expect(baseAssetData.ticker).to.equal("TEST");
    const mintData = await context.getRegisteredMint(mint);
    expect(mintData.mintType).to.deep.equal({ assetWithRisk: { baseAssetIndex: { value: 42 } } });
  });

  it("Create user asset transfers creation fee", async () => {
    const mint = await Mint.create(context, new Keypair());
    const balanceBefore = await context.provider.connection.getBalance(context.dao.publicKey);
    await context.addUserAsset(43, "TEST", mint);
    const balanceAfter = await context.provider.connection.getBalance(context.dao.publicKey);
    expect(balanceAfter - balanceBefore).to.equal(DEFAULT_ADD_ASSET_FEES * LAMPORTS_PER_SOL);
  });

  it("Can set user asset as strict", async () => {
    const mint = await Mint.create(context, new Keypair());
    await context.addUserAsset(44, "TEST", mint);
    await context.changeBaseAssetParametersStatus(44, { strict: true });

    const baseAssetData = await context.getBaseAsset(44);
    expect(baseAssetData.nonStrict).to.equal(false);
  });
});
