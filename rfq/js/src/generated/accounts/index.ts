export * from "./BaseAssetInfo";
export * from "./CollateralInfo";
export * from "./MintInfo";
export * from "./ProtocolState";
export * from "./Response";
export * from "./Rfq";

import { CollateralInfo } from "./CollateralInfo";
import { ProtocolState } from "./ProtocolState";
import { BaseAssetInfo } from "./BaseAssetInfo";
import { MintInfo } from "./MintInfo";
import { Response } from "./Response";
import { Rfq } from "./Rfq";

export const accountProviders = {
  CollateralInfo,
  ProtocolState,
  BaseAssetInfo,
  MintInfo,
  Response,
  Rfq,
};
