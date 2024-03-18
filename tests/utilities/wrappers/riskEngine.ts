import { Program, workspace } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { RiskEngine as RiskEngineIdl } from "../../../target/types/risk_engine";
import { getRiskEngineConfig } from "../pdas";
import {
  DEFAULT_MINT_DECIMALS,
  DEFAULT_COLLATERAL_FOR_FIXED_QUOTE_AMOUNT_RFQ,
  DEFAULT_MIN_COLLATERAL_REQUIREMENT,
  DEFAULT_SAFETY_PRICE_SHIFT_FACTOR,
  DEFAULT_OVERALL_SAFETY_FACTOR,
  DEFAULT_RISK_CATEGORIES_INFO,
  DEFAULT_ACCEPTED_ORACLE_STALENESS,
  DEFAULT_ACCEPTED_ORACLE_CONFIDENCE_INTERVAL_PORTION,
} from "../constants";
import { RiskCategory, InstrumentType, RiskCategoryInfo } from "../types";
import { SpotInstrument } from "../instruments/spotInstrument";
import { executeInParallel } from "../helpers";
import { PsyoptionsEuropeanInstrument } from "../instruments/psyoptionsEuropeanInstrument";
import { PsyoptionsAmericanInstrumentClass } from "../instruments/psyoptionsAmericanInstrument";
import { Context } from "./context";

export class RiskEngine {
  private constructor(
    private context: Context,
    public program: Program<RiskEngineIdl>,
    public programId: PublicKey,
    public configAddress: PublicKey
  ) {}

  static async create(context: Context) {
    const program = workspace.RiskEngine as Program<RiskEngineIdl>;
    const programId = program.programId;
    const configAddress = await getRiskEngineConfig(programId);

    return new RiskEngine(context, program, programId, configAddress);
  }

  async initializeDefaultConfig() {
    this.configAddress = await getRiskEngineConfig(this.programId);

    await this.program.methods
      .initializeConfig(
        DEFAULT_MIN_COLLATERAL_REQUIREMENT,
        DEFAULT_COLLATERAL_FOR_FIXED_QUOTE_AMOUNT_RFQ,
        DEFAULT_MINT_DECIMALS,
        DEFAULT_SAFETY_PRICE_SHIFT_FACTOR,
        DEFAULT_OVERALL_SAFETY_FACTOR,
        DEFAULT_ACCEPTED_ORACLE_STALENESS,
        DEFAULT_ACCEPTED_ORACLE_CONFIDENCE_INTERVAL_PORTION
      )
      .accounts({
        authority: this.context.dao.publicKey,
        protocol: this.context.protocolPda,
        config: this.configAddress,
        systemProgram: SystemProgram.programId,
      })
      .signers([this.context.dao])
      .rpc();

    await executeInParallel(
      async () => {
        await this.setRiskCategoriesInfo([
          {
            riskCategory: RiskCategory.VeryLow,
            newValue: DEFAULT_RISK_CATEGORIES_INFO[0],
          },
          {
            riskCategory: RiskCategory.Low,
            newValue: DEFAULT_RISK_CATEGORIES_INFO[1],
          },
          {
            riskCategory: RiskCategory.Medium,
            newValue: DEFAULT_RISK_CATEGORIES_INFO[2],
          },
        ]);
      },
      async () => {
        await this.setRiskCategoriesInfo([
          {
            riskCategory: RiskCategory.High,
            newValue: DEFAULT_RISK_CATEGORIES_INFO[3],
          },
          {
            riskCategory: RiskCategory.VeryHigh,
            newValue: DEFAULT_RISK_CATEGORIES_INFO[4],
          },
          {
            riskCategory: RiskCategory.Custom1,
            newValue: DEFAULT_RISK_CATEGORIES_INFO[5],
          },
        ]);
      },
      async () => {
        await this.setRiskCategoriesInfo([
          {
            riskCategory: RiskCategory.Custom2,
            newValue: DEFAULT_RISK_CATEGORIES_INFO[6],
          },
          {
            riskCategory: RiskCategory.Custom3,
            newValue: DEFAULT_RISK_CATEGORIES_INFO[7],
          },
        ]);
      },
      async () => {
        await SpotInstrument.setRiskEngineInstrumentType(this.context);
      },
      async () => {
        await PsyoptionsEuropeanInstrument.setRiskEngineInstrumentType(this.context);
      },
      async () => {
        await PsyoptionsAmericanInstrumentClass.setRiskEngineInstrumentType(this.context);
      }
    );
  }

  async closeConfig({ signer = this.context.dao } = {}) {
    this.configAddress = await getRiskEngineConfig(this.programId);

    await this.program.methods
      .closeConfig()
      .accounts({
        authority: signer.publicKey,
        protocol: this.context.protocolPda,
        config: this.configAddress,
      })
      .signers([signer])
      .rpc();
  }

  async updateConfig({
    minCollateralRequirement = null,
    collateralForFixedQuoteAmountRfq = null,
    collateralMintDecimals = null,
    safetyPriceShiftFactor = null,
    overallSafetyFactor = null,
    defaultAcceptedOracleStaleness = null,
    defaultAcceptedOracleConfidenceIntervalPortion = null,
  }: {
    minCollateralRequirement?: number | null;
    collateralForFixedQuoteAmountRfq?: number | null;
    collateralMintDecimals?: number | null;
    safetyPriceShiftFactor?: number | null;
    overallSafetyFactor?: number | null;
    defaultAcceptedOracleStaleness?: number | null;
    defaultAcceptedOracleConfidenceIntervalPortion?: number | null;
  } = {}) {
    await this.program.methods
      .updateConfig(
        minCollateralRequirement,
        collateralForFixedQuoteAmountRfq,
        collateralMintDecimals,
        safetyPriceShiftFactor,
        overallSafetyFactor,
        defaultAcceptedOracleStaleness,
        defaultAcceptedOracleConfidenceIntervalPortion
      )
      .accounts({
        authority: this.context.dao.publicKey,
        protocol: this.context.protocolPda,
        config: this.configAddress,
      })
      .signers([this.context.dao])
      .rpc();
  }

  async setInstrumentType(instrumentIndex: number, instrumentType: InstrumentType) {
    await this.program.methods
      .setInstrumentType(instrumentIndex, instrumentType)
      .accounts({
        authority: this.context.dao.publicKey,
        protocol: this.context.protocolPda,
        config: this.configAddress,
      })
      .signers([this.context.dao])
      .rpc();
  }

  async setRiskCategoriesInfo(
    changes: {
      riskCategory: RiskCategory;
      newValue: RiskCategoryInfo;
    }[]
  ) {
    let changesForInstruction = changes.map((x) => {
      return {
        riskCategoryIndex: x.riskCategory.index,
        newValue: x.newValue,
      };
    });

    await this.program.methods
      .setRiskCategoriesInfo(changesForInstruction)
      .accounts({
        authority: this.context.dao.publicKey,
        protocol: this.context.protocolPda,
        config: this.configAddress,
      })
      .signers([this.context.dao])
      .rpc();
  }

  async getConfig() {
    return this.program.account.config.fetchNullable(this.configAddress);
  }
}
