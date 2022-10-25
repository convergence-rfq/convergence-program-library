import { Connection } from "@solana/web3.js";

import { ConvergenceRfqPlugin, Cluster, resolveClusterFromConnection } from "./types";
import { corePlugins } from "./plugins/corePlugins";

export type ConvergenceRfqOptions = {
  cluster?: Cluster;
};

export class ConvergenceRfq {
  public readonly connection: Connection;

  public readonly cluster: Cluster;

  constructor(connection: Connection, options: ConvergenceRfqOptions = {}) {
    this.connection = connection;
    this.cluster = options.cluster ?? resolveClusterFromConnection(connection);
    this.use(corePlugins());
  }

  static make(connection: Connection, options: ConvergenceRfqOptions = {}) {
    return new this(connection, options);
  }

  use(plugin: ConvergenceRfqPlugin) {
    plugin.install(this);

    return this;
  }
}
