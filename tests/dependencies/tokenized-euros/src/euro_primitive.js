"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IDL = void 0;
exports.IDL = {
    "version": "0.1.0",
    "name": "euro_primitive",
    "instructions": [
        {
            "name": "initializeStablePool",
            "accounts": [
                {
                    "name": "payer",
                    "isMut": true,
                    "isSigner": true,
                    "docs": [
                        "The wallet address signing the transaction"
                    ]
                },
                {
                    "name": "stableMint",
                    "isMut": false,
                    "isSigner": false,
                    "docs": [
                        "The mint of the stable asset"
                    ]
                },
                {
                    "name": "stablePool",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "poolAuthority",
                    "isMut": false,
                    "isSigner": false,
                    "docs": [
                        "The general pool authority for the protocol"
                    ]
                },
                {
                    "name": "tokenProgram",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "rent",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "systemProgram",
                    "isMut": false,
                    "isSigner": false
                }
            ],
            "args": []
        },
        {
            "name": "initializeUnderlyingPool",
            "accounts": [
                {
                    "name": "payer",
                    "isMut": true,
                    "isSigner": true,
                    "docs": [
                        "The wallet address signing the transaction"
                    ]
                },
                {
                    "name": "underlyingMint",
                    "isMut": false,
                    "isSigner": false,
                    "docs": [
                        "The mint of the underlying asset. Calls will be settled in this asset."
                    ]
                },
                {
                    "name": "underlyingPool",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "poolAuthority",
                    "isMut": false,
                    "isSigner": false,
                    "docs": [
                        "The general pool authority for the protocol"
                    ]
                },
                {
                    "name": "tokenProgram",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "rent",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "systemProgram",
                    "isMut": false,
                    "isSigner": false
                }
            ],
            "args": []
        },
        {
            "name": "initExpirationData",
            "accounts": [
                {
                    "name": "payer",
                    "isMut": true,
                    "isSigner": true,
                    "docs": [
                        "The wallet address signing the transaction"
                    ]
                },
                {
                    "name": "underlyingMint",
                    "isMut": false,
                    "isSigner": false,
                    "docs": [
                        "The mint of the underlying asset"
                    ]
                },
                {
                    "name": "expirationData",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "oracle",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "tokenProgram",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "rent",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "systemProgram",
                    "isMut": false,
                    "isSigner": false
                }
            ],
            "args": [
                {
                    "name": "expiration",
                    "type": "i64"
                },
                {
                    "name": "priceDecimals",
                    "type": "u8"
                },
                {
                    "name": "oracleProviderId",
                    "type": "u8"
                }
            ]
        },
        {
            "name": "createEuroMeta",
            "accounts": [
                {
                    "name": "payer",
                    "isMut": true,
                    "isSigner": true,
                    "docs": [
                        "The wallet address signing the transaction"
                    ]
                },
                {
                    "name": "underlyingMint",
                    "isMut": false,
                    "isSigner": false,
                    "docs": [
                        "The mint of the underlying asset. Calls will be settled in this asset."
                    ]
                },
                {
                    "name": "underlyingPool",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "stableMint",
                    "isMut": false,
                    "isSigner": false,
                    "docs": [
                        "The mint of the stable asset. Puts will be settled in this asset.",
                        "NOTE: This should match the oracle"
                    ]
                },
                {
                    "name": "stablePool",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "euroMeta",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "expirationData",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "callOptionMint",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "callWriterMint",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "putOptionMint",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "putWriterMint",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "oracle",
                    "isMut": false,
                    "isSigner": false,
                    "docs": [
                        "the oracle account is a seed for the ExpirationData PDA, you know this is the same oracle",
                        "account on that strutcture that was previously checked. Thus all known appropriate checks for",
                        "the oracle, given the derived ExpirationData, have been met."
                    ]
                },
                {
                    "name": "tokenProgram",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "rent",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "systemProgram",
                    "isMut": false,
                    "isSigner": false
                }
            ],
            "args": [
                {
                    "name": "underlyingAmountPerContract",
                    "type": "u64"
                },
                {
                    "name": "expiration",
                    "type": "i64"
                },
                {
                    "name": "strikePrice",
                    "type": "u64"
                },
                {
                    "name": "priceDecimals",
                    "type": "u8"
                },
                {
                    "name": "bump",
                    "type": "u8"
                },
                {
                    "name": "expirationDataBump",
                    "type": "u8"
                },
                {
                    "name": "oracleProviderId",
                    "type": "u8"
                }
            ]
        },
        {
            "name": "mintOptions",
            "accounts": [
                {
                    "name": "payer",
                    "isMut": false,
                    "isSigner": true
                },
                {
                    "name": "euroMeta",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "collateralPool",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "optionMint",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "writerMint",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "minterCollateral",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "optionDestination",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "writerDestination",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "tokenProgram",
                    "isMut": false,
                    "isSigner": false
                }
            ],
            "args": [
                {
                    "name": "amount",
                    "type": "u64"
                },
                {
                    "name": "optionType",
                    "type": "u8"
                }
            ]
        },
        {
            "name": "closeOptions",
            "accounts": [
                {
                    "name": "payer",
                    "isMut": false,
                    "isSigner": true
                },
                {
                    "name": "euroMeta",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "collateralPool",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "poolAuthority",
                    "isMut": false,
                    "isSigner": false,
                    "docs": [
                        "The general pool authority for the protocol"
                    ]
                },
                {
                    "name": "optionMint",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "writerMint",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "optionSource",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "writerSource",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "collateralDestination",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "tokenProgram",
                    "isMut": false,
                    "isSigner": false
                }
            ],
            "args": [
                {
                    "name": "amount",
                    "type": "u64"
                },
                {
                    "name": "optionType",
                    "type": "u8"
                }
            ]
        },
        {
            "name": "setExpirationPrice",
            "accounts": [
                {
                    "name": "payer",
                    "isMut": false,
                    "isSigner": true
                },
                {
                    "name": "expirationData",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "priceOracle",
                    "isMut": false,
                    "isSigner": false
                }
            ],
            "args": []
        },
        {
            "name": "settleExpiredOptions",
            "accounts": [
                {
                    "name": "payer",
                    "isMut": false,
                    "isSigner": true
                },
                {
                    "name": "euroMeta",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "expirationData",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "optionMint",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "collateralMint",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "optionSource",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "collateralPool",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "poolAuthority",
                    "isMut": false,
                    "isSigner": false,
                    "docs": [
                        "The general pool authority for the protocol"
                    ]
                },
                {
                    "name": "collateralDestination",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "tokenProgram",
                    "isMut": false,
                    "isSigner": false
                }
            ],
            "args": [
                {
                    "name": "amount",
                    "type": "u64"
                },
                {
                    "name": "optionType",
                    "type": "u8"
                }
            ]
        },
        {
            "name": "settleExpiredWriters",
            "accounts": [
                {
                    "name": "payer",
                    "isMut": false,
                    "isSigner": true
                },
                {
                    "name": "euroMeta",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "expirationData",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "writerMint",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "collateralMint",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "writerSource",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "collateralPool",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "poolAuthority",
                    "isMut": false,
                    "isSigner": false,
                    "docs": [
                        "The general pool authority for the protocol"
                    ]
                },
                {
                    "name": "collateralDestination",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "tokenProgram",
                    "isMut": false,
                    "isSigner": false
                }
            ],
            "args": [
                {
                    "name": "amount",
                    "type": "u64"
                },
                {
                    "name": "optionType",
                    "type": "u8"
                }
            ]
        },
        {
            "name": "initSerumMarket",
            "accounts": [
                {
                    "name": "userAuthority",
                    "isMut": true,
                    "isSigner": true
                },
                {
                    "name": "serumMarket",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "systemProgram",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "tokenProgram",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "dexProgram",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "rent",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "pcMint",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "optionMint",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "requestQueue",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "eventQueue",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "bids",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "asks",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "coinVault",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "pcVault",
                    "isMut": true,
                    "isSigner": false
                },
                {
                    "name": "vaultSigner",
                    "isMut": false,
                    "isSigner": false
                },
                {
                    "name": "marketAuthority",
                    "isMut": false,
                    "isSigner": false
                }
            ],
            "args": [
                {
                    "name": "marketSpace",
                    "type": "u64"
                },
                {
                    "name": "vaultSignerNonce",
                    "type": "u64"
                },
                {
                    "name": "coinLotSize",
                    "type": "u64"
                },
                {
                    "name": "pcLotSize",
                    "type": "u64"
                },
                {
                    "name": "pcDustThreshold",
                    "type": "u64"
                }
            ]
        }
    ],
    "accounts": [
        {
            "name": "euroMeta",
            "type": {
                "kind": "struct",
                "fields": [
                    {
                        "name": "underlyingMint",
                        "docs": [
                            "The mint of the underlying asset"
                        ],
                        "type": "publicKey"
                    },
                    {
                        "name": "underlyingDecimals",
                        "docs": [
                            "The nubmer of decimals on the underlying, read from the Mint on creation"
                        ],
                        "type": "u8"
                    },
                    {
                        "name": "underlyingAmountPerContract",
                        "docs": [
                            "The amount of underlying assets per 1 OptionToken,",
                            "denoted in the underlying assets decimals."
                        ],
                        "type": "u64"
                    },
                    {
                        "name": "stableMint",
                        "docs": [
                            "The mint key for some stable coin that is pegged to the oracle"
                        ],
                        "type": "publicKey"
                    },
                    {
                        "name": "stableDecimals",
                        "docs": [
                            "The decimals of the stable mint"
                        ],
                        "type": "u8"
                    },
                    {
                        "name": "stablePool",
                        "docs": [
                            "The stable pool's address"
                        ],
                        "type": "publicKey"
                    },
                    {
                        "name": "oracle",
                        "docs": [
                            "The key for the oracle mapping"
                        ],
                        "type": "publicKey"
                    },
                    {
                        "name": "strikePrice",
                        "docs": [
                            "The strike price with decimals price_decimals"
                        ],
                        "type": "u64"
                    },
                    {
                        "name": "priceDecimals",
                        "docs": [
                            "The number of decimals in the strike_price & price_at_expiration. This is",
                            "required to normalize the strike price with the oracles."
                        ],
                        "type": "u8"
                    },
                    {
                        "name": "callOptionMint",
                        "docs": [
                            "The mint for the CALL option tokens"
                        ],
                        "type": "publicKey"
                    },
                    {
                        "name": "callWriterMint",
                        "docs": [
                            "The mint for the CALL writer tokens"
                        ],
                        "type": "publicKey"
                    },
                    {
                        "name": "putOptionMint",
                        "docs": [
                            "The mint for the PUT option tokens"
                        ],
                        "type": "publicKey"
                    },
                    {
                        "name": "putWriterMint",
                        "docs": [
                            "The mint for the PUT writer tokens"
                        ],
                        "type": "publicKey"
                    },
                    {
                        "name": "underlyingPool",
                        "docs": [
                            "The TokenAccount that holds underlying asset deposits"
                        ],
                        "type": "publicKey"
                    },
                    {
                        "name": "expiration",
                        "docs": [
                            "The Unix Timestamp for the expiration"
                        ],
                        "type": "i64"
                    },
                    {
                        "name": "bumpSeed",
                        "docs": [
                            "The bump seed for the EuroMeta"
                        ],
                        "type": "u8"
                    },
                    {
                        "name": "expirationData",
                        "docs": [
                            "The address for the associated ExpirationData. Stored to make validations computationally",
                            "efficient."
                        ],
                        "type": "publicKey"
                    },
                    {
                        "name": "oracleProviderId",
                        "docs": [
                            "An oracle provider identifier"
                        ],
                        "type": "u8"
                    }
                ]
            }
        },
        {
            "name": "expirationData",
            "type": {
                "kind": "struct",
                "fields": [
                    {
                        "name": "expiration",
                        "docs": [
                            "The expiration time"
                        ],
                        "type": "i64"
                    },
                    {
                        "name": "oracle",
                        "docs": [
                            "The aggregate price oracle for pyth or switchboard"
                        ],
                        "type": "publicKey"
                    },
                    {
                        "name": "priceAtExpiration",
                        "docs": [
                            "The price, in price_decimals, at the time of expiration"
                        ],
                        "type": "u64"
                    },
                    {
                        "name": "priceSetAtTime",
                        "docs": [
                            "The time at which the price_at_expiration was set."
                        ],
                        "type": "i64"
                    },
                    {
                        "name": "priceDecimals",
                        "docs": [
                            "The number of decimals in the strike_price & price_at_expiration. This is",
                            "required to normalize the strike price with the oracles."
                        ],
                        "type": "u8"
                    },
                    {
                        "name": "priceSet",
                        "docs": [
                            "Flag for easy memcmp filtering"
                        ],
                        "type": "bool"
                    },
                    {
                        "name": "bump",
                        "docs": [
                            "bump seed"
                        ],
                        "type": "u8"
                    },
                    {
                        "name": "oracleProviderId",
                        "docs": [
                            "An oracle provider identifier"
                        ],
                        "type": "u8"
                    }
                ]
            }
        }
    ],
    "types": [
        {
            "name": "SelfTradeBehavior",
            "type": {
                "kind": "enum",
                "variants": [
                    {
                        "name": "DecrementTake"
                    },
                    {
                        "name": "CancelProvide"
                    },
                    {
                        "name": "AbortTransaction"
                    }
                ]
            }
        },
        {
            "name": "OrderType",
            "type": {
                "kind": "enum",
                "variants": [
                    {
                        "name": "Limit"
                    },
                    {
                        "name": "ImmediateOrCancel"
                    },
                    {
                        "name": "PostOnly"
                    }
                ]
            }
        },
        {
            "name": "Side",
            "type": {
                "kind": "enum",
                "variants": [
                    {
                        "name": "Bid"
                    },
                    {
                        "name": "Ask"
                    }
                ]
            }
        },
        {
            "name": "OracleProvider",
            "type": {
                "kind": "enum",
                "variants": [
                    {
                        "name": "PYTH"
                    },
                    {
                        "name": "SWITCHBOARD"
                    }
                ]
            }
        },
        {
            "name": "OptionType",
            "type": {
                "kind": "enum",
                "variants": [
                    {
                        "name": "CALL"
                    },
                    {
                        "name": "PUT"
                    }
                ]
            }
        }
    ],
    "events": [
        {
            "name": "EuroMetaCreated",
            "fields": [
                {
                    "name": "euroMeta",
                    "type": "publicKey",
                    "index": false
                }
            ]
        },
        {
            "name": "ExpirationDataCreated",
            "fields": [
                {
                    "name": "expirationData",
                    "type": "publicKey",
                    "index": false
                }
            ]
        },
        {
            "name": "StablePoolCreated",
            "fields": [
                {
                    "name": "stablePool",
                    "type": "publicKey",
                    "index": false
                }
            ]
        },
        {
            "name": "UnderlyingPoolCreated",
            "fields": [
                {
                    "name": "underlyingPool",
                    "type": "publicKey",
                    "index": false
                }
            ]
        }
    ],
    "errors": [
        {
            "code": 6000,
            "name": "ExpirationIsInThePast",
            "msg": "Expiration must be in the future"
        },
        {
            "code": 6001,
            "name": "UnderlyingAmountLessThan0",
            "msg": "Underlying amount per contract must be greater than 0"
        },
        {
            "code": 6002,
            "name": "AccountMustBeOwnedByPyth",
            "msg": "Pyth program does not own oracle"
        },
        {
            "code": 6003,
            "name": "AccountMustBeOwnedByOracleProgram",
            "msg": "Oracle program does not own oracle"
        },
        {
            "code": 6004,
            "name": "PythOracleMustBePrice",
            "msg": "Pyth oracle must be a Price account"
        },
        {
            "code": 6005,
            "name": "NumberOverflow",
            "msg": "Number overflow"
        },
        {
            "code": 6006,
            "name": "AmountMustBeGreaterThanZero",
            "msg": "Amount must be greater than 0"
        },
        {
            "code": 6007,
            "name": "EuroMetaIsExpired",
            "msg": "EuroMeta is expired"
        },
        {
            "code": 6008,
            "name": "OptionMintDoesNotMatch",
            "msg": "Option Mint does not match EuroMeta"
        },
        {
            "code": 6009,
            "name": "WriterMintDoesNotMatch",
            "msg": "Writer Mint does not match EuroMeta"
        },
        {
            "code": 6010,
            "name": "PriceAtExpirationIsSet",
            "msg": "Price at expiration is already set"
        },
        {
            "code": 6011,
            "name": "OracleDoesNotMatch",
            "msg": "Oracle does not match ExpirationData"
        },
        {
            "code": 6012,
            "name": "EuroMetaNotExpired",
            "msg": "EuroMeta is not expired"
        },
        {
            "code": 6013,
            "name": "PriceAtExpirationNotSet",
            "msg": "Price at expiration has not been set"
        },
        {
            "code": 6014,
            "name": "UnknownOptionType",
            "msg": "Unknown OptionType"
        },
        {
            "code": 6015,
            "name": "CannotPruneActiveMarket",
            "msg": "Cannot prune the market while it's still active"
        },
        {
            "code": 6016,
            "name": "ExpirationDataDoesNotMatch",
            "msg": "ExpirationData address does not match EuroMeta"
        },
        {
            "code": 6017,
            "name": "CallsMustUseUnderlyingPool",
            "msg": "Calls must use the underlying pool"
        },
        {
            "code": 6018,
            "name": "PutsMustUseStablePool",
            "msg": "Puts must use the stable pool"
        },
        {
            "code": 6019,
            "name": "CallsMustUseUnderlyingAsCollateral",
            "msg": "Calls must use the underlying as collateral"
        },
        {
            "code": 6020,
            "name": "PutsMustUseStableAsCollateral",
            "msg": "Puts must use the stable as collateral"
        },
        {
            "code": 6021,
            "name": "NumericTypeConversionError",
            "msg": "Failed to convert numeric types"
        },
        {
            "code": 6022,
            "name": "DecimalConversionError",
            "msg": "Decimal conversion error"
        },
        {
            "code": 6023,
            "name": "PythOrcaleMustHaveNegativeExpo",
            "msg": "Pyth oracle must have negative expo"
        },
        {
            "code": 6024,
            "name": "PythPriceWasNone",
            "msg": "Pyth Price returned None"
        },
        {
            "code": 6025,
            "name": "PriceDecimalsExceeds15",
            "msg": "Price decimals cannot exceed 15"
        },
        {
            "code": 6026,
            "name": "OracleProviderIdDoesNotMatch",
            "msg": "Oracle provider ID for EuroMeta does not match ExpirationData"
        },
        {
            "code": 6027,
            "name": "SetTimeExpirationTimeDeltaIsLargerThanPresent",
            "msg": "Set Expiration Price should be called before settling writer or option tokens"
        }
    ]
};
