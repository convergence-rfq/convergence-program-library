import { PublicKey } from "@solana/web3.js";
import { expectError } from "../utilities/helpers";
import { AuthoritySide } from "../utilities/types";
import { Context, getContext } from "../utilities/wrappers";

describe("Prepare print trade settlement", () => {
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

  it("Can't call for escrow settled rfq", async () => {
    const rfq = await context.createRfq();
    const response = await rfq.respond();
    await response.confirm();
    await expectError(response.preparePrintTradeSettlement(AuthoritySide.Taker), "InvalidSettlingFlow");
  });
});
