declare type ErrorWithCode = Error & {
    code: number;
};
declare type MaybeErrorWithCode = ErrorWithCode | null | undefined;
export declare class InvalidDataSizeError extends Error {
    readonly code: number;
    readonly name: string;
    constructor();
}
export declare class PassedMintDoesNotMatchError extends Error {
    readonly code: number;
    readonly name: string;
    constructor();
}
export declare class InvalidReceiverError extends Error {
    readonly code: number;
    readonly name: string;
    constructor();
}
export declare class InvalidBackupAddressError extends Error {
    readonly code: number;
    readonly name: string;
    constructor();
}
export declare class NotFirstToPrepareError extends Error {
    readonly code: number;
    readonly name: string;
    constructor();
}
export declare function errorFromCode(code: number): MaybeErrorWithCode;
export declare function errorFromName(name: string): MaybeErrorWithCode;
export {};
