import * as beet from '@metaplex-foundation/beet';
import * as web3 from '@solana/web3.js';
export declare const calculateCollateralForResponseStruct: beet.BeetArgsStruct<{
    instructionDiscriminator: number[];
}>;
export declare type CalculateCollateralForResponseInstructionAccounts = {
    rfq: web3.PublicKey;
    response: web3.PublicKey;
    anchorRemainingAccounts?: web3.AccountMeta[];
};
export declare const calculateCollateralForResponseInstructionDiscriminator: number[];
export declare function createCalculateCollateralForResponseInstruction(accounts: CalculateCollateralForResponseInstructionAccounts, programId?: web3.PublicKey): web3.TransactionInstruction;
