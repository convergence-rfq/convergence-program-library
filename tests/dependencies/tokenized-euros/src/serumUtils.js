"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.findOpenOrdersAccountsForOwner = exports.Validation = exports.marketLoader = void 0;
const anchor_1 = require("@project-serum/anchor");
const serum_1 = require("@project-serum/serum");
const textEncoder = new TextEncoder();
const marketLoader = (program, dexProgramId, marketKey, euroMetaKey, marketAuthorityBump, opts = {
    enableLogger: false,
}) => {
    let marketProxy = new serum_1.MarketProxyBuilder()
        .middleware(new serum_1.OpenOrdersPda({
        proxyProgramId: program.programId,
        dexProgramId: dexProgramId,
    }))
        .middleware(new serum_1.ReferralFees())
        .middleware(new Validation(euroMetaKey, marketAuthorityBump));
    if (opts.enableLogger) {
        marketProxy = marketProxy.middleware(new serum_1.Logger());
    }
    return marketProxy.load({
        connection: program.provider.connection,
        market: marketKey,
        dexProgramId: dexProgramId,
        proxyProgramId: program.programId,
        options: { commitment: "recent" },
    });
};
exports.marketLoader = marketLoader;
class Validation {
    constructor(euroMetaKey, marketAuthorityBump) {
        this.euroMetaKey = euroMetaKey;
        this.marketAuthorityBump = marketAuthorityBump;
    }
    initOpenOrders(ix) {
        ix.data = Buffer.concat([Buffer.from([0]), ix.data]);
    }
    newOrderV3(ix) {
        ix.data = Buffer.concat([Buffer.from([1]), ix.data]);
    }
    cancelOrderV2(ix) {
        ix.data = Buffer.concat([Buffer.from([2]), ix.data]);
    }
    cancelOrderByClientIdV2(ix) {
        ix.data = Buffer.concat([Buffer.from([3]), ix.data]);
    }
    settleFunds(ix) {
        ix.data = Buffer.concat([Buffer.from([4]), ix.data]);
    }
    closeOpenOrders(ix) {
        ix.data = Buffer.concat([Buffer.from([5]), ix.data]);
    }
    prune(ix) {
        // prepend a discriminator and the marketAuthorityBump
        const bumpBuffer = new anchor_1.BN(this.marketAuthorityBump).toArrayLike(Buffer, "le", 1);
        ix.data = Buffer.concat([Buffer.from([6]), bumpBuffer, ix.data]);
        // prepend the euroMeta key
        ix.keys = [
            { pubkey: this.euroMetaKey, isWritable: false, isSigner: false },
            ...ix.keys,
        ];
    }
    consumeEvents(ix) {
        ix.data = Buffer.concat([Buffer.from([7]), ix.data]);
    }
    consumeEventsPermissioned(ix) {
        ix.data = Buffer.concat([Buffer.from([8]), ix.data]);
    }
}
exports.Validation = Validation;
/**
 * Load the open orders for a user based on the Serum DEX and Serum Market
 * address.
 *
 * @param program - Anchor Psy American program
 * @param dexProgramId - Serum DEX program id
 * @param serumMarketAddress - Serum market address
 * @returns
 */
const findOpenOrdersAccountsForOwner = (program, dexProgramId, serumMarketAddress) => __awaiter(void 0, void 0, void 0, function* () {
    const [openOrdersAddressKey, openOrdersBump] = yield anchor_1.web3.PublicKey.findProgramAddress([
        textEncoder.encode("open-orders"),
        dexProgramId.toBuffer(),
        serumMarketAddress.toBuffer(),
        program.provider.publicKey.toBuffer(),
    ], program.programId);
    const filters = [
        {
            memcmp: {
                offset: serum_1.OpenOrders.getLayout(dexProgramId).offsetOf("market"),
                bytes: serumMarketAddress.toBase58(),
            },
        },
        {
            memcmp: {
                offset: serum_1.OpenOrders.getLayout(dexProgramId).offsetOf("owner"),
                bytes: openOrdersAddressKey.toBase58(),
            },
        },
        {
            dataSize: serum_1.OpenOrders.getLayout(dexProgramId).span,
        },
    ];
    const accounts = yield program.provider.connection.getProgramAccounts(dexProgramId, {
        filters,
    });
    return accounts.map(({ pubkey, account }) => serum_1.OpenOrders.fromAccountInfo(pubkey, account, dexProgramId));
});
exports.findOpenOrdersAccountsForOwner = findOpenOrdersAccountsForOwner;
