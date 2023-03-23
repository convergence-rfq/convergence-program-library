import { BN } from "@project-serum/anchor";
import { expect } from "chai";
import {
  DEFAULT_COLLATERAL_FOR_FIXED_QUOTE_AMOUNT_RFQ,
  DEFAULT_COLLATERAL_FOR_VARIABLE_SIZE_RFQ,
  DEFAULT_MINT_DECIMALS,
} from "../utilities/constants";
import { Context, getContext, RiskEngine } from "../utilities/wrappers";

describe("Update Risk Engine config", () => {
  let context: Context;
  let riskEngine: RiskEngine;

  before(async () => {
    context = await getContext();
    riskEngine = context.riskEngine;
  });

  it("Successfully partially update risk engine config", async () => {
    await riskEngine.updateConfig({
      collateralForVariableSizeRfq: new BN(100_000_000),
      collateralMintDecimals: 3,
    });

    const config = await riskEngine.getConfig();
    if (config === null) {
      throw Error("Config is expected to exist");
    }
    expect(config.collateralForVariableSizeRfqCreation).to.be.bignumber.equal(new BN(100_000_000));
    expect(config.collateralMintDecimals).to.be.bignumber.equal(new BN(3));
    expect(config.collateralForFixedQuoteAmountRfqCreation).to.be.bignumber.equal(
      DEFAULT_COLLATERAL_FOR_FIXED_QUOTE_AMOUNT_RFQ
    );

    // reset config
    await riskEngine.updateConfig({
      collateralForVariableSizeRfq: DEFAULT_COLLATERAL_FOR_VARIABLE_SIZE_RFQ,
      collateralMintDecimals: DEFAULT_MINT_DECIMALS,
    });
  });
});
