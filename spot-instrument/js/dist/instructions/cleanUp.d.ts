import * as beet from '@metaplex-foundation/beet';
import * as web3 from '@solana/web3.js';
export declare type CleanUpInstructionArgs = {
    legIndex: number;
};
export declare const cleanUpStruct: beet.BeetArgsStruct<CleanUpInstructionArgs & {
    instructionDiscriminator: number[];
}>;
export declare type CleanUpInstructionAccounts = {
    protocol: web3.PublicKey;
    rfq: web3.PublicKey;
    response: web3.PublicKey;
    firstToPrepare: web3.PublicKey;
    escrow: web3.PublicKey;
    backupReceiver: web3.PublicKey;
    tokenProgram?: web3.PublicKey;
    anchorRemainingAccounts?: web3.AccountMeta[];
};
export declare const cleanUpInstructionDiscriminator: number[];
export declare function createCleanUpInstruction(accounts: CleanUpInstructionAccounts, args: CleanUpInstructionArgs, programId?: web3.PublicKey): web3.TransactionInstruction;
