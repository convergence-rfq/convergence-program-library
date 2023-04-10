import { Program, workspace } from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";
import { Context } from "../wrappers";
import { HxroPrintTradeProvider as HxroPrintTradeProviderIdl } from "../../../target/types/hxro_print_trade_provider";

let hxroPrintTradeProviderProgram: Program<HxroPrintTradeProviderIdl> | null = null;
export function getHxroInstrumentProgram(): Program<HxroPrintTradeProviderIdl> {
  if (hxroPrintTradeProviderProgram === null) {
    hxroPrintTradeProviderProgram = workspace.HxroInstrument as Program<HxroPrintTradeProviderIdl>;
  }

  return hxroPrintTradeProviderProgram;
}

export class HxroPrintTradeProvider {
  constructor(private context: Context) {}
  static create(context: Context): HxroPrintTradeProvider {
    return new HxroPrintTradeProvider(context);
  }

  static async addPrintTradeProvider(context: Context) {
    await context.addPrintTradeProvider(getHxroInstrumentProgram().programId, 8);
  }

  serializeData(): Buffer {}

  getProgramId(): PublicKey {
    return getHxroInstrumentProgram().programId;
  }

  async getValidationAccounts() {}
}
