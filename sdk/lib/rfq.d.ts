export declare type Rfq = {
    "version": "0.0.0";
    "name": "rfq";
    "instructions": [
        {
            "name": "initialize";
            "accounts": [
                {
                    "name": "authority";
                    "isMut": true;
                    "isSigner": true;
                },
                {
                    "name": "protocol";
                    "isMut": true;
                    "isSigner": false;
                },
                {
                    "name": "systemProgram";
                    "isMut": false;
                    "isSigner": false;
                }
            ];
            "args": [
                {
                    "name": "feeDenominator";
                    "type": "u64";
                },
                {
                    "name": "feeNumerator";
                    "type": "u64";
                }
            ];
        },
        {
            "name": "request";
            "accounts": [
                {
                    "name": "authority";
                    "isMut": true;
                    "isSigner": true;
                },
                {
                    "name": "rfqState";
                    "isMut": true;
                    "isSigner": false;
                },
                {
                    "name": "systemProgram";
                    "isMut": false;
                    "isSigner": false;
                },
                {
                    "name": "tokenProgram";
                    "isMut": false;
                    "isSigner": false;
                },
                {
                    "name": "associatedTokenProgram";
                    "isMut": false;
                    "isSigner": false;
                },
                {
                    "name": "rent";
                    "isMut": false;
                    "isSigner": false;
                }
            ];
            "args": [
                {
                    "name": "title";
                    "type": "string";
                },
                {
                    "name": "takerOrderType";
                    "type": "u8";
                },
                {
                    "name": "instrument";
                    "type": "u8";
                },
                {
                    "name": "expiry";
                    "type": "i64";
                },
                {
                    "name": "ratio";
                    "type": "u8";
                },
                {
                    "name": "nOfLegs";
                    "type": "u8";
                },
                {
                    "name": "amount";
                    "type": "u64";
                }
            ];
        },
        {
            "name": "respond";
            "accounts": [
                {
                    "name": "authority";
                    "isMut": true;
                    "isSigner": true;
                },
                {
                    "name": "orderState";
                    "isMut": true;
                    "isSigner": false;
                },
                {
                    "name": "rfqState";
                    "isMut": true;
                    "isSigner": false;
                },
                {
                    "name": "assetToken";
                    "isMut": true;
                    "isSigner": false;
                },
                {
                    "name": "quoteToken";
                    "isMut": true;
                    "isSigner": false;
                },
                {
                    "name": "escrowAssetToken";
                    "isMut": true;
                    "isSigner": false;
                },
                {
                    "name": "escrowQuoteToken";
                    "isMut": true;
                    "isSigner": false;
                },
                {
                    "name": "assetMint";
                    "isMut": false;
                    "isSigner": false;
                },
                {
                    "name": "quoteMint";
                    "isMut": false;
                    "isSigner": false;
                },
                {
                    "name": "systemProgram";
                    "isMut": false;
                    "isSigner": false;
                },
                {
                    "name": "tokenProgram";
                    "isMut": false;
                    "isSigner": false;
                },
                {
                    "name": "associatedTokenProgram";
                    "isMut": false;
                    "isSigner": false;
                },
                {
                    "name": "rent";
                    "isMut": false;
                    "isSigner": false;
                }
            ];
            "args": [
                {
                    "name": "title";
                    "type": "string";
                },
                {
                    "name": "amount";
                    "type": "u64";
                }
            ];
        },
        {
            "name": "confirm";
            "accounts": [
                {
                    "name": "authority";
                    "isMut": true;
                    "isSigner": true;
                },
                {
                    "name": "rfqState";
                    "isMut": true;
                    "isSigner": false;
                },
                {
                    "name": "assetToken";
                    "isMut": true;
                    "isSigner": false;
                },
                {
                    "name": "quoteToken";
                    "isMut": true;
                    "isSigner": false;
                },
                {
                    "name": "escrowAssetToken";
                    "isMut": true;
                    "isSigner": false;
                },
                {
                    "name": "escrowQuoteToken";
                    "isMut": true;
                    "isSigner": false;
                },
                {
                    "name": "assetMint";
                    "isMut": false;
                    "isSigner": false;
                },
                {
                    "name": "quoteMint";
                    "isMut": false;
                    "isSigner": false;
                },
                {
                    "name": "systemProgram";
                    "isMut": false;
                    "isSigner": false;
                },
                {
                    "name": "tokenProgram";
                    "isMut": false;
                    "isSigner": false;
                },
                {
                    "name": "associatedTokenProgram";
                    "isMut": false;
                    "isSigner": false;
                },
                {
                    "name": "rent";
                    "isMut": false;
                    "isSigner": false;
                }
            ];
            "args": [
                {
                    "name": "title";
                    "type": "string";
                }
            ];
        },
        {
            "name": "settle";
            "accounts": [
                {
                    "name": "authority";
                    "isMut": true;
                    "isSigner": true;
                },
                {
                    "name": "orderState";
                    "isMut": true;
                    "isSigner": false;
                },
                {
                    "name": "rfqState";
                    "isMut": true;
                    "isSigner": false;
                },
                {
                    "name": "assetToken";
                    "isMut": true;
                    "isSigner": false;
                },
                {
                    "name": "quoteToken";
                    "isMut": true;
                    "isSigner": false;
                },
                {
                    "name": "escrowAssetToken";
                    "isMut": true;
                    "isSigner": false;
                },
                {
                    "name": "escrowQuoteToken";
                    "isMut": true;
                    "isSigner": false;
                },
                {
                    "name": "assetMint";
                    "isMut": true;
                    "isSigner": false;
                },
                {
                    "name": "quoteMint";
                    "isMut": true;
                    "isSigner": false;
                },
                {
                    "name": "systemProgram";
                    "isMut": false;
                    "isSigner": false;
                },
                {
                    "name": "tokenProgram";
                    "isMut": false;
                    "isSigner": false;
                },
                {
                    "name": "associatedTokenProgram";
                    "isMut": false;
                    "isSigner": false;
                },
                {
                    "name": "rent";
                    "isMut": false;
                    "isSigner": false;
                }
            ];
            "args": [
                {
                    "name": "title";
                    "type": "string";
                }
            ];
        },
        {
            "name": "approve";
            "accounts": [
                {
                    "name": "authority";
                    "isMut": true;
                    "isSigner": true;
                },
                {
                    "name": "orderState";
                    "isMut": true;
                    "isSigner": false;
                },
                {
                    "name": "rfqState";
                    "isMut": true;
                    "isSigner": false;
                },
                {
                    "name": "assetToken";
                    "isMut": true;
                    "isSigner": false;
                },
                {
                    "name": "quoteToken";
                    "isMut": true;
                    "isSigner": false;
                },
                {
                    "name": "escrowAssetToken";
                    "isMut": true;
                    "isSigner": false;
                },
                {
                    "name": "escrowQuoteToken";
                    "isMut": true;
                    "isSigner": false;
                },
                {
                    "name": "assetMint";
                    "isMut": false;
                    "isSigner": false;
                },
                {
                    "name": "quoteMint";
                    "isMut": false;
                    "isSigner": false;
                },
                {
                    "name": "systemProgram";
                    "isMut": false;
                    "isSigner": false;
                },
                {
                    "name": "tokenProgram";
                    "isMut": false;
                    "isSigner": false;
                },
                {
                    "name": "associatedTokenProgram";
                    "isMut": false;
                    "isSigner": false;
                },
                {
                    "name": "rent";
                    "isMut": false;
                    "isSigner": false;
                }
            ];
            "args": [];
        }
    ];
    "accounts": [
        {
            "name": "rfqState";
            "type": {
                "kind": "struct";
                "fields": [
                    {
                        "name": "action";
                        "type": "bool";
                    },
                    {
                        "name": "instrument";
                        "type": "u8";
                    },
                    {
                        "name": "expiry";
                        "type": "i64";
                    },
                    {
                        "name": "expired";
                        "type": "bool";
                    },
                    {
                        "name": "ratio";
                        "type": "u8";
                    },
                    {
                        "name": "nOfLegs";
                        "type": "u8";
                    },
                    {
                        "name": "assetMint";
                        "type": "publicKey";
                    },
                    {
                        "name": "quoteMint";
                        "type": "publicKey";
                    },
                    {
                        "name": "bestBidAmount";
                        "type": "u64";
                    },
                    {
                        "name": "bestAskAmount";
                        "type": "u64";
                    },
                    {
                        "name": "bestBidAddress";
                        "type": "publicKey";
                    },
                    {
                        "name": "bestAskAddress";
                        "type": "publicKey";
                    },
                    {
                        "name": "responseCount";
                        "type": "u16";
                    },
                    {
                        "name": "takerOrderType";
                        "type": "u8";
                    },
                    {
                        "name": "assetAmount";
                        "type": "u64";
                    },
                    {
                        "name": "quoteAmount";
                        "type": "u64";
                    },
                    {
                        "name": "orderAmount";
                        "type": "u64";
                    },
                    {
                        "name": "confirmed";
                        "type": "bool";
                    },
                    {
                        "name": "takerAddress";
                        "type": "publicKey";
                    },
                    {
                        "name": "winningMakerAssetEscrow";
                        "type": "publicKey";
                    },
                    {
                        "name": "winningMakerQuoteEscrow";
                        "type": "publicKey";
                    },
                    {
                        "name": "participants";
                        "type": {
                            "vec": "publicKey";
                        };
                    }
                ];
            };
        },
        {
            "name": "globalState";
            "type": {
                "kind": "struct";
                "fields": [
                    {
                        "name": "rfqCount";
                        "type": "u64";
                    },
                    {
                        "name": "accessManagerCount";
                        "type": "u64";
                    },
                    {
                        "name": "authority";
                        "type": "publicKey";
                    },
                    {
                        "name": "feeDenominator";
                        "type": "u64";
                    },
                    {
                        "name": "feeNumerator";
                        "type": "u64";
                    }
                ];
            };
        },
        {
            "name": "orderState";
            "type": {
                "kind": "struct";
                "fields": [
                    {
                        "name": "ask";
                        "type": "u64";
                    },
                    {
                        "name": "bid";
                        "type": "u64";
                    }
                ];
            };
        }
    ];
    "errors": [
        {
            "code": 300;
            "name": "InvalidQuoteType";
            "msg": "Invalid quote type";
        },
        {
            "code": 301;
            "name": "InvalidTakerAddress";
            "msg": "Invalid taker address";
        },
        {
            "code": 302;
            "name": "TradeNotConfirmed";
            "msg": "Trade has not been confirmed by taker";
        }
    ];
};
export declare const IDL: Rfq;
