import * as beet from '@metaplex-foundation/beet';
import * as web3 from '@solana/web3.js';
import { AuthoritySideDuplicate } from '../types/AuthoritySideDuplicate';
export declare type RevertPreparationInstructionArgs = {
    legIndex: number;
    side: AuthoritySideDuplicate;
};
export declare const revertPreparationStruct: beet.BeetArgsStruct<RevertPreparationInstructionArgs & {
    instructionDiscriminator: number[];
}>;
export declare type RevertPreparationInstructionAccounts = {
    protocol: web3.PublicKey;
    rfq: web3.PublicKey;
    response: web3.PublicKey;
    escrow: web3.PublicKey;
    tokens: web3.PublicKey;
    tokenProgram?: web3.PublicKey;
    anchorRemainingAccounts?: web3.AccountMeta[];
};
export declare const revertPreparationInstructionDiscriminator: number[];
export declare function createRevertPreparationInstruction(accounts: RevertPreparationInstructionAccounts, args: RevertPreparationInstructionArgs, programId?: web3.PublicKey): web3.TransactionInstruction;
