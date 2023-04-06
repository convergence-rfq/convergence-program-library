import { expect } from "chai";
import { expectError } from "../utilities/helpers";
import { Context, getContext } from "../utilities/wrappers";

describe("Close risk engine config", () => {
  let context: Context;

  before(async () => {
    context = await getContext();
  });

  it("Can close risk engine config", async () => {
    await context.riskEngine.closeConfig();

    const configData = await context.riskEngine.getConfig();
    expect(configData).to.be.null;

    await context.riskEngine.initializeDefaultConfig();
  });

  it("Can't close if not a protocol authority", async () => {
    await expectError(context.riskEngine.closeConfig({ signer: context.taker }), "NotAProtocolAuthority");
  });
});
