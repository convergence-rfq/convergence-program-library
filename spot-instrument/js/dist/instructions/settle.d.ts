import * as beet from '@metaplex-foundation/beet';
import * as web3 from '@solana/web3.js';
export declare type SettleInstructionArgs = {
    legIndex: number;
};
export declare const settleStruct: beet.BeetArgsStruct<SettleInstructionArgs & {
    instructionDiscriminator: number[];
}>;
export declare type SettleInstructionAccounts = {
    protocol: web3.PublicKey;
    rfq: web3.PublicKey;
    response: web3.PublicKey;
    escrow: web3.PublicKey;
    receiverTokens: web3.PublicKey;
    tokenProgram?: web3.PublicKey;
    anchorRemainingAccounts?: web3.AccountMeta[];
};
export declare const settleInstructionDiscriminator: number[];
export declare function createSettleInstruction(accounts: SettleInstructionAccounts, args: SettleInstructionArgs, programId?: web3.PublicKey): web3.TransactionInstruction;
