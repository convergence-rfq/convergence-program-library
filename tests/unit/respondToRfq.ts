import { BN } from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";
import { expectError } from "../utilities/helpers";

import { FixedSize, Quote } from "../utilities/types";
import { Context, getContext } from "../utilities/wrappers";

describe("Respond to RFQ", () => {
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

  it("Cannot respond with a negative price to a fixed quote asset amount rfq", async () => {
    let rfq = await context.createRfq({ fixedSize: FixedSize.getQuoteAsset(new BN(100)) });
    await expectError(rfq.respond({ bid: Quote.getFixedSize(new BN(-100)) }), "PriceCannotBeNegative");
    await expectError(rfq.respond({ ask: Quote.getFixedSize(new BN(-100)) }), "PriceCannotBeNegative");
  });
});
