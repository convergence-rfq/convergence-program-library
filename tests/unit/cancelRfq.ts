import { PublicKey } from "@solana/web3.js";
import { attachImprovedLogDisplay } from "../utilities/helpers";
import { AuthoritySide } from "../utilities/types";
import { Context, getContext } from "../utilities/wrappers";

describe("Cancel RFQ", () => {
  let context: Context;
  let taker: PublicKey;
  let maker: PublicKey;

  beforeEach(function () {
    attachImprovedLogDisplay(this, context);
  });

  before(async () => {
    context = await getContext();
    taker = context.taker.publicKey;
    maker = context.maker.publicKey;
  });

  it("Can cancel Rfq after response settlement", async () => {
    let rfq = await context.createEscrowRfq();

    let response = await rfq.respond();
    await response.confirm();
    await response.prepareEscrowSettlement(AuthoritySide.Taker);
    await response.prepareEscrowSettlement(AuthoritySide.Maker);
    await response.settleEscrow(taker, [maker]);
    await response.cleanUp();

    await rfq.cancel();
  });
});
