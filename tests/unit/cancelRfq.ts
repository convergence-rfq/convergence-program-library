import { PublicKey } from "@solana/web3.js";
import { AuthoritySide } from "../utilities/types";

import { Context, getContext } from "../utilities/wrappers";

describe("Cancel RFQ", () => {
  let context: Context;
  let taker: PublicKey;
  let maker: PublicKey;
  let dao: PublicKey;

  before(async () => {
    context = await getContext();
    taker = context.taker.publicKey;
    maker = context.maker.publicKey;
    dao = context.dao.publicKey;
  });

  it("Can cancel Rfq after response settlement", async () => {
    let rfq = await context.createRfq();

    let response = await rfq.respond();
    await response.confirm();
    await response.prepareSettlement(AuthoritySide.Taker);
    await response.prepareSettlement(AuthoritySide.Maker);
    await response.settle(taker, [maker]);
    await response.unlockResponseCollateral();
    await response.cleanUp();

    await rfq.cancel();
  });
});
