import * as beet from '@metaplex-foundation/beet';
import * as web3 from '@solana/web3.js';
import { AuthoritySideDuplicate } from '../types/AuthoritySideDuplicate';
export declare type PrepareToSettleInstructionArgs = {
    legIndex: number;
    side: AuthoritySideDuplicate;
};
export declare const prepareToSettleStruct: beet.BeetArgsStruct<PrepareToSettleInstructionArgs & {
    instructionDiscriminator: number[];
}>;
export declare type PrepareToSettleInstructionAccounts = {
    protocol: web3.PublicKey;
    rfq: web3.PublicKey;
    response: web3.PublicKey;
    caller: web3.PublicKey;
    callerTokens: web3.PublicKey;
    mint: web3.PublicKey;
    escrow: web3.PublicKey;
    systemProgram?: web3.PublicKey;
    tokenProgram?: web3.PublicKey;
    rent?: web3.PublicKey;
    anchorRemainingAccounts?: web3.AccountMeta[];
};
export declare const prepareToSettleInstructionDiscriminator: number[];
export declare function createPrepareToSettleInstruction(accounts: PrepareToSettleInstructionAccounts, args: PrepareToSettleInstructionArgs, programId?: web3.PublicKey): web3.TransactionInstruction;
