import { PublicKey } from "@solana/web3.js";

import { OracleSource, RiskCategory } from "../utilities/types";
import { attachImprovedLogDisplay, expectError } from "../utilities/helpers";
import { Context, getContext } from "../utilities/wrappers";
import { PYTH_SOL_ORACLE, SWITCHBOARD_BTC_ORACLE } from "../utilities/constants";
import { expect } from "chai";

describe("Change base asset parameters", () => {
  let context: Context;
  const TEST_BASE_ASSET_INDEX = 4343;

  beforeEach(function () {
    attachImprovedLogDisplay(this, context);
  });

  before(async () => {
    context = await getContext();
    await context.addBaseAsset(
      TEST_BASE_ASSET_INDEX,
      "TEST",
      RiskCategory.VeryLow,
      OracleSource.Switchboard,
      SWITCHBOARD_BTC_ORACLE,
      null,
      null
    );
  });

  it("Can't call if not a protocol authority", async () => {
    await expectError(
      context.changeBaseAssetParametersStatus(TEST_BASE_ASSET_INDEX, {
        enabled: false,
        signers: [context.taker],
        accountOverrides: { authority: context.taker.publicKey },
      }),
      "NotAProtocolAuthority"
    );
  });

  it("Can't nullify a selected oracle source", async () => {
    await expectError(
      context.changeBaseAssetParametersStatus(TEST_BASE_ASSET_INDEX, {
        switchboardOracle: null,
      }),
      "OracleSourceIsMissing"
    );
  });

  it("Can successfully change oracle parameters", async () => {
    await context.changeBaseAssetParametersStatus(TEST_BASE_ASSET_INDEX, {
      enabled: false,
      riskCategory: RiskCategory.High,
      oracleSource: OracleSource.Pyth,
      switchboardOracle: null,
      pythOracle: PYTH_SOL_ORACLE,
      inPlacePrice: 2000,
    });

    const data = await context.getBaseAsset(TEST_BASE_ASSET_INDEX);
    expect(data.enabled).to.be.false;
    expect(data.riskCategory.hasOwnProperty("high")).to.be.true;
    expect(data.oracleSource).to.be.deep.equal(OracleSource.Pyth);
    expect(data.switchboardOracle).to.be.deep.equal(PublicKey.default);
    expect(data.pythOracle).to.be.deep.equal(PYTH_SOL_ORACLE);
    expect(data.inPlacePrice).to.be.equal(2000);
  });
});
