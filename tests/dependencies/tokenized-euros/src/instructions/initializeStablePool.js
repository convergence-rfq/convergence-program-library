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
exports.initializeStablePool = void 0;
const anchor_1 = require("@project-serum/anchor");
const spl_token_1 = require("@solana/spl-token");
const __1 = require("../");
const initializeStablePool = (program, stableMint) => __awaiter(void 0, void 0, void 0, function* () {
    const [poolAuthority] = yield __1.pdas.derivePoolAuthority(program);
    const [stablePool] = yield __1.pdas.deriveStablePoolKey(program, stableMint);
    const instruction = program.instruction.initializeStablePool({
        accounts: {
            payer: program.provider.publicKey,
            stableMint,
            stablePool,
            poolAuthority,
            tokenProgram: spl_token_1.TOKEN_PROGRAM_ID,
            rent: anchor_1.web3.SYSVAR_RENT_PUBKEY,
            systemProgram: anchor_1.web3.SystemProgram.programId,
        },
    });
    return { instruction };
});
exports.initializeStablePool = initializeStablePool;
