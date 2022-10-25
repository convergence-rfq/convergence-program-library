import type { ConvergenceRfq } from "../ConvergenceRfq";

export type ConvergenceRfqPlugin = {
  install(convergenceRfq: ConvergenceRfq): any;
};
