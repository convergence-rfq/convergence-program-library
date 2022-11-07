import * as beet from '@metaplex-foundation/beet';
export declare enum AuthoritySideDuplicate {
    Taker = 0,
    Maker = 1
}
export declare const authoritySideDuplicateBeet: beet.FixedSizeBeet<AuthoritySideDuplicate, AuthoritySideDuplicate>;
