import { BN, Program, web3 } from "@project-serum/anchor";
import { Logger, MarketProxyBuilder, Middleware, OpenOrders, OpenOrdersPda, ReferralFees } from "@project-serum/serum";
import { EuroPrimitive } from "./euro_primitive";

const textEncoder = new TextEncoder();

export type MarketLoaderOpts = {
  enableLogger: boolean;
};

export const marketLoader = (
  program: Program<EuroPrimitive>,
  dexProgramId: web3.PublicKey,
  marketKey: web3.PublicKey,
  euroMetaKey: web3.PublicKey,
  marketAuthorityBump: number,
  opts: MarketLoaderOpts = {
    enableLogger: false,
  }
) => {
  let marketProxy = new MarketProxyBuilder()
    .middleware(
      new OpenOrdersPda({
        proxyProgramId: program.programId,
        dexProgramId: dexProgramId,
      })
    )
    .middleware(new ReferralFees())
    .middleware(new Validation(euroMetaKey, marketAuthorityBump));
  if (opts.enableLogger) {
    marketProxy = marketProxy.middleware(new Logger());
  }
  return marketProxy.load({
    connection: program.provider.connection,
    market: marketKey,
    dexProgramId: dexProgramId,
    proxyProgramId: program.programId,
    options: { commitment: "recent" },
  });
};

export class Validation implements Middleware {
  euroMetaKey: web3.PublicKey;
  marketAuthorityBump: number;

  constructor(euroMetaKey: web3.PublicKey, marketAuthorityBump: number) {
    this.euroMetaKey = euroMetaKey;
    this.marketAuthorityBump = marketAuthorityBump;
  }
  initOpenOrders(ix: web3.TransactionInstruction) {
    ix.data = Buffer.concat([Buffer.from([0]), ix.data]);
  }
  newOrderV3(ix: web3.TransactionInstruction) {
    ix.data = Buffer.concat([Buffer.from([1]), ix.data]);
  }
  cancelOrderV2(ix: web3.TransactionInstruction) {
    ix.data = Buffer.concat([Buffer.from([2]), ix.data]);
  }
  cancelOrderByClientIdV2(ix: web3.TransactionInstruction) {
    ix.data = Buffer.concat([Buffer.from([3]), ix.data]);
  }
  settleFunds(ix: web3.TransactionInstruction) {
    ix.data = Buffer.concat([Buffer.from([4]), ix.data]);
  }
  closeOpenOrders(ix: web3.TransactionInstruction) {
    ix.data = Buffer.concat([Buffer.from([5]), ix.data]);
  }
  prune(ix: web3.TransactionInstruction) {
    // prepend a discriminator and the marketAuthorityBump
    const bumpBuffer = new BN(this.marketAuthorityBump).toArrayLike(Buffer, "le", 1);
    ix.data = Buffer.concat([Buffer.from([6]), bumpBuffer, ix.data]);
    // prepend the euroMeta key
    ix.keys = [{ pubkey: this.euroMetaKey, isWritable: false, isSigner: false }, ...ix.keys];
  }
  consumeEvents(ix: web3.TransactionInstruction) {
    ix.data = Buffer.concat([Buffer.from([7]), ix.data]);
  }
  consumeEventsPermissioned(ix: web3.TransactionInstruction) {
    ix.data = Buffer.concat([Buffer.from([8]), ix.data]);
  }
}

/**
 * Load the open orders for a user based on the Serum DEX and Serum Market
 * address.
 *
 * @param program - Anchor Psy American program
 * @param dexProgramId - Serum DEX program id
 * @param serumMarketAddress - Serum market address
 * @returns
 */
export const findOpenOrdersAccountsForOwner = async (
  program: Program<EuroPrimitive>,
  dexProgramId: web3.PublicKey,
  serumMarketAddress: web3.PublicKey
) => {
  const [openOrdersAddressKey, openOrdersBump] = await web3.PublicKey.findProgramAddress(
    [
      textEncoder.encode("open-orders"),
      dexProgramId.toBuffer(),
      serumMarketAddress.toBuffer(),
      program.provider.publicKey.toBuffer(),
    ],
    program.programId
  );
  const filters = [
    {
      memcmp: {
        offset: OpenOrders.getLayout(dexProgramId).offsetOf("market"),
        bytes: serumMarketAddress.toBase58(),
      },
    },
    {
      memcmp: {
        offset: OpenOrders.getLayout(dexProgramId).offsetOf("owner"),
        bytes: openOrdersAddressKey.toBase58(),
      },
    },
    {
      dataSize: OpenOrders.getLayout(dexProgramId).span,
    },
  ];
  const accounts = await program.provider.connection.getProgramAccounts(dexProgramId, {
    filters,
  });

  return accounts.map(({ pubkey, account }) => OpenOrders.fromAccountInfo(pubkey, account, dexProgramId));
};
