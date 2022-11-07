import * as beet from '@metaplex-foundation/beet';
import * as web3 from '@solana/web3.js';
export declare const calculateCollateralForRfqStruct: beet.BeetArgsStruct<{
    instructionDiscriminator: number[];
}>;
export declare type CalculateCollateralForRfqInstructionAccounts = {
    rfq: web3.PublicKey;
    anchorRemainingAccounts?: web3.AccountMeta[];
};
export declare const calculateCollateralForRfqInstructionDiscriminator: number[];
export declare function createCalculateCollateralForRfqInstruction(accounts: CalculateCollateralForRfqInstructionAccounts, programId?: web3.PublicKey): web3.TransactionInstruction;
