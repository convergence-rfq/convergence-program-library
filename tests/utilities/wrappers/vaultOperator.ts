import { PublicKey } from "@solana/web3.js";
import { Context } from "./context";
import { Rfq } from "./rfq";
import { expandComputeUnits } from "../helpers";
import { getCollateralInfoPda, getCollateralTokenPda, getVaultOperatorPda } from "../pdas";
import { Response } from "./response";
import { SpotInstrument } from "../instruments/spotInstrument";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

export class VaultOperator {
  private response?: Response;
  public operator: PublicKey;
  public constructor(private context: Context, public account: PublicKey, public rfq: Rfq) {
    this.operator = getVaultOperatorPda(this.account, this.context.vaultOperatorProgram.programId);
  }

  async confirmResponse(response: Response) {
    await this.context.vaultOperatorProgram.methods
      .confirmResponse()
      .accounts({
        vaultParams: this.account,
        operator: this.operator,
        protocol: this.context.protocolPda,
        rfq: this.rfq.account,
        response: response.account,
        collateralInfo: await getCollateralInfoPda(this.operator, this.context.program.programId),
        makerCollateralInfo: await getCollateralInfoPda(this.context.maker.publicKey, this.context.program.programId),
        collateralToken: await getCollateralTokenPda(this.operator, this.context.program.programId),
        riskEngine: this.context.riskEngineProgram.programId,
        rfqProgram: this.context.program.programId,
      })
      .remainingAccounts(await this.rfq.getRiskEngineAccounts())
      .preInstructions([expandComputeUnits])
      .rpc();

    this.response = response;
  }

  async prepareToSettle() {
    if (this.response === undefined) {
      throw new Error("Not yet confirmed!");
    }

    if (this.rfq.content.type !== "instrument") {
      throw new Error("Unexpected RFQ type");
    }

    const {
      legs: [leg],
      quote,
    } = this.rfq.content;

    if (this.response.firstToPrepare === null) {
      this.response.firstToPrepare = this.operator;
    }
    const quoteAccounts = await quote.getPrepareSettlementAccounts(
      { operator: this.operator },
      "quote",
      this.rfq,
      this.response
    );
    const legAccounts = await leg.getPrepareSettlementAccounts(
      { operator: this.operator },
      { legIndex: 0 },
      this.rfq,
      this.response
    );

    await this.context.vaultOperatorProgram.methods
      .prepareSettlement()
      .accounts({
        vaultParams: this.account,
        operator: this.operator,
        protocol: this.context.protocolPda,
        rfq: this.rfq.account,
        response: this.response.account,
        rfqProgram: this.context.program.programId,
      })
      .remainingAccounts([...quoteAccounts, ...legAccounts])
      .preInstructions([expandComputeUnits])
      .rpc();
  }

  async withdrawTokens({ withdrawTo = this.context.taker.publicKey }: { withdrawTo?: PublicKey } = {}) {
    if (this.rfq.content.type !== "instrument") {
      throw new Error("Unexpected RFQ type");
    }

    const {
      legs: [leg],
      quote,
    } = this.rfq.content;
    const legMint = (leg.instrument as SpotInstrument).mint;
    const quoteMint = (quote.instrument as SpotInstrument).mint;

    await this.context.vaultOperatorProgram.methods
      .withdrawTokens()
      .accountsStrict({
        vaultParams: this.account,
        operator: this.operator,
        creator: withdrawTo,
        legVault: legMint.getAssociatedAddress(this.operator),
        legTokens: legMint.getAssociatedAddress(withdrawTo),
        legMint: legMint.publicKey,
        quoteVault: quoteMint.getAssociatedAddress(this.operator),
        quoteTokens: quoteMint.getAssociatedAddress(withdrawTo),
        quoteMint: quoteMint.publicKey,
        response: this.response?.account ?? PublicKey.default,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();
  }

  async getData() {
    return this.context.vaultOperatorProgram.account.vaultParams.fetch(this.account);
  }
}
