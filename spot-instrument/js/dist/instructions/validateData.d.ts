import * as web3 from '@solana/web3.js';
import * as beet from '@metaplex-foundation/beet';
export declare type ValidateDataInstructionArgs = {
    dataSize: number;
    mintAddress: web3.PublicKey;
};
export declare const validateDataStruct: beet.BeetArgsStruct<ValidateDataInstructionArgs & {
    instructionDiscriminator: number[];
}>;
export declare type ValidateDataInstructionAccounts = {
    protocol: web3.PublicKey;
    mint: web3.PublicKey;
    anchorRemainingAccounts?: web3.AccountMeta[];
};
export declare const validateDataInstructionDiscriminator: number[];
export declare function createValidateDataInstruction(accounts: ValidateDataInstructionAccounts, args: ValidateDataInstructionArgs, programId?: web3.PublicKey): web3.TransactionInstruction;
