import * as beet from '@metaplex-foundation/beet';
import * as web3 from '@solana/web3.js';
export declare const calculateCollateralForConfirmationStruct: beet.BeetArgsStruct<{
    instructionDiscriminator: number[];
}>;
export declare type CalculateCollateralForConfirmationInstructionAccounts = {
    rfq: web3.PublicKey;
    response: web3.PublicKey;
    anchorRemainingAccounts?: web3.AccountMeta[];
};
export declare const calculateCollateralForConfirmationInstructionDiscriminator: number[];
export declare function createCalculateCollateralForConfirmationInstruction(accounts: CalculateCollateralForConfirmationInstructionAccounts, programId?: web3.PublicKey): web3.TransactionInstruction;
