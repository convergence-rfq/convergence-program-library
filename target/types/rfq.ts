export type Rfq = {
  "version": "0.1.0",
  "name": "rfq",
  "instructions": [
    {
      "name": "initializeProtocol",
      "accounts": [
        {
          "name": "signer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "protocol",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "riskEngine",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "collateralMint",
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
          "name": "settleFees",
          "type": {
            "defined": "FeeParameters"
          }
        },
        {
          "name": "defaultFees",
          "type": {
            "defined": "FeeParameters"
          }
        }
      ]
    },
    {
      "name": "addInstrument",
      "accounts": [
        {
          "name": "authority",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "protocol",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "instrumentProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "validateDataAccountAmount",
          "type": "u8"
        },
        {
          "name": "prepareToSettleAccountAmount",
          "type": "u8"
        },
        {
          "name": "settleAccountAmount",
          "type": "u8"
        },
        {
          "name": "revertPreparationAccountAmount",
          "type": "u8"
        }
      ]
    },
    {
      "name": "initializeCollateral",
      "accounts": [
        {
          "name": "user",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "protocol",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "collateralInfo",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "collateralToken",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "collateralMint",
          "isMut": false,
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
          "name": "rent",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "fundCollateral",
      "accounts": [
        {
          "name": "user",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "userTokens",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "protocol",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "collateralInfo",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "collateralToken",
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
        }
      ]
    },
    {
      "name": "intitializeRfq",
      "accounts": [
        {
          "name": "taker",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "protocol",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rfq",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "collateralInfo",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "collateralToken",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "quoteMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "riskEngine",
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
          "name": "legs",
          "type": {
            "vec": {
              "defined": "Leg"
            }
          }
        },
        {
          "name": "orderType",
          "type": {
            "defined": "OrderType"
          }
        },
        {
          "name": "fixedSize",
          "type": {
            "defined": "FixedSize"
          }
        },
        {
          "name": "activeWindow",
          "type": "u32"
        },
        {
          "name": "settlingWindow",
          "type": "u32"
        }
      ]
    },
    {
      "name": "respondToRfq",
      "accounts": [
        {
          "name": "maker",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "protocol",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rfq",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "response",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "collateralInfo",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "collateralToken",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "riskEngine",
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
          "name": "bid",
          "type": {
            "option": {
              "defined": "Quote"
            }
          }
        },
        {
          "name": "ask",
          "type": {
            "option": {
              "defined": "Quote"
            }
          }
        }
      ]
    },
    {
      "name": "confirmResponse",
      "accounts": [
        {
          "name": "taker",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "protocol",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rfq",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "response",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "collateralInfo",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "makerCollateralInfo",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "collateralToken",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "riskEngine",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "side",
          "type": {
            "defined": "Side"
          }
        },
        {
          "name": "overrideLegMultiplierBps",
          "type": {
            "option": "u64"
          }
        }
      ]
    },
    {
      "name": "prepareToSettle",
      "accounts": [
        {
          "name": "caller",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "quoteTokens",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "protocol",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rfq",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "response",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "quoteMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "quoteEscrow",
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
          "name": "rent",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "side",
          "type": {
            "defined": "AuthoritySide"
          }
        }
      ]
    },
    {
      "name": "settle",
      "accounts": [
        {
          "name": "protocol",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rfq",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "response",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "quoteReceiverTokens",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "quoteEscrow",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "revertPreparation",
      "accounts": [
        {
          "name": "protocol",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rfq",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "response",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "quoteTokens",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "quoteEscrow",
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
          "name": "side",
          "type": {
            "defined": "AuthoritySide"
          }
        }
      ]
    },
    {
      "name": "unlockResponseCollateral",
      "accounts": [
        {
          "name": "protocol",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rfq",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "response",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "takerCollateralInfo",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "makerCollateralInfo",
          "isMut": true,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "unlockRfqCollateral",
      "accounts": [
        {
          "name": "protocol",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rfq",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "collateralInfo",
          "isMut": true,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "settleOnePartyDefaultCollateral",
      "accounts": [
        {
          "name": "protocol",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rfq",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "response",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "takerCollateralInfo",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "makerCollateralInfo",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "takerCollateralTokens",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "makerCollateralTokens",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "settleBothPartyDefaultCollateral",
      "accounts": [
        {
          "name": "protocol",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rfq",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "response",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "takerCollateralInfo",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "makerCollateralInfo",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "takerCollateralTokens",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "makerCollateralTokens",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "protocolCollateralTokens",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "protocolState",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "publicKey"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "active",
            "type": "bool"
          },
          {
            "name": "settleFees",
            "type": {
              "defined": "FeeParameters"
            }
          },
          {
            "name": "defaultFees",
            "type": {
              "defined": "FeeParameters"
            }
          },
          {
            "name": "riskEngine",
            "type": "publicKey"
          },
          {
            "name": "collateralMint",
            "type": "publicKey"
          },
          {
            "name": "instruments",
            "type": {
              "vec": {
                "defined": "Instrument"
              }
            }
          }
        ]
      }
    },
    {
      "name": "rfq",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "taker",
            "type": "publicKey"
          },
          {
            "name": "orderType",
            "type": {
              "defined": "OrderType"
            }
          },
          {
            "name": "lastLookEnabled",
            "type": "bool"
          },
          {
            "name": "fixedSize",
            "type": {
              "defined": "FixedSize"
            }
          },
          {
            "name": "quoteMint",
            "type": "publicKey"
          },
          {
            "name": "accessManager",
            "type": {
              "option": "publicKey"
            }
          },
          {
            "name": "creationTimestamp",
            "type": "i64"
          },
          {
            "name": "activeWindow",
            "type": "u32"
          },
          {
            "name": "settlingWindow",
            "type": "u32"
          },
          {
            "name": "state",
            "type": {
              "defined": "StoredRfqState"
            }
          },
          {
            "name": "nonResponseTakerCollateralLocked",
            "type": "u64"
          },
          {
            "name": "totalTakerCollateralLocked",
            "type": "u64"
          },
          {
            "name": "totalResponses",
            "type": "u32"
          },
          {
            "name": "clearedResponses",
            "type": "u32"
          },
          {
            "name": "confirmedResponses",
            "type": "u32"
          },
          {
            "name": "legs",
            "type": {
              "vec": {
                "defined": "Leg"
              }
            }
          }
        ]
      }
    },
    {
      "name": "response",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "maker",
            "type": "publicKey"
          },
          {
            "name": "rfq",
            "type": "publicKey"
          },
          {
            "name": "creationTimestamp",
            "type": "i64"
          },
          {
            "name": "makerCollateralLocked",
            "type": "u64"
          },
          {
            "name": "takerCollateralLocked",
            "type": "u64"
          },
          {
            "name": "state",
            "type": {
              "defined": "StoredResponseState"
            }
          },
          {
            "name": "takerPreparedToSettle",
            "type": "bool"
          },
          {
            "name": "makerPreparedToSettle",
            "type": "bool"
          },
          {
            "name": "confirmed",
            "type": {
              "option": {
                "defined": "Confirmation"
              }
            }
          },
          {
            "name": "defaultingParty",
            "type": {
              "option": {
                "defined": "DefaultingParty"
              }
            }
          },
          {
            "name": "firstToPrepare",
            "type": {
              "option": {
                "defined": "AuthoritySide"
              }
            }
          },
          {
            "name": "bid",
            "type": {
              "option": {
                "defined": "Quote"
              }
            }
          },
          {
            "name": "ask",
            "type": {
              "option": {
                "defined": "Quote"
              }
            }
          }
        ]
      }
    },
    {
      "name": "collateralInfo",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "user",
            "type": "publicKey"
          },
          {
            "name": "tokenAccountBump",
            "type": "u8"
          },
          {
            "name": "lockedTokensAmount",
            "type": "u64"
          }
        ]
      }
    }
  ],
  "types": [
    {
      "name": "Instrument",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "programKey",
            "type": "publicKey"
          },
          {
            "name": "validateDataAccountAmount",
            "type": "u8"
          },
          {
            "name": "prepareToSettleAccountAmount",
            "type": "u8"
          },
          {
            "name": "settleAccountAmount",
            "type": "u8"
          },
          {
            "name": "revertPreparationAccountAmount",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "FeeParameters",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "takerBps",
            "type": "u64"
          },
          {
            "name": "makerBps",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "Leg",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "instrument",
            "type": "publicKey"
          },
          {
            "name": "instrumentData",
            "type": "bytes"
          },
          {
            "name": "instrumentAmount",
            "type": "u64"
          },
          {
            "name": "side",
            "type": {
              "defined": "Side"
            }
          }
        ]
      }
    },
    {
      "name": "Confirmation",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "side",
            "type": {
              "defined": "Side"
            }
          },
          {
            "name": "overrideLegMultiplierBps",
            "type": {
              "option": "u64"
            }
          }
        ]
      }
    },
    {
      "name": "FixedSize",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "None",
            "fields": [
              {
                "name": "padding",
                "type": "u64"
              }
            ]
          },
          {
            "name": "BaseAsset",
            "fields": [
              {
                "name": "legs_multiplier_bps",
                "type": "u64"
              }
            ]
          },
          {
            "name": "QuoteAsset",
            "fields": [
              {
                "name": "quote_amount",
                "type": "u64"
              }
            ]
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
            "name": "Buy"
          },
          {
            "name": "Sell"
          },
          {
            "name": "TwoWay"
          }
        ]
      }
    },
    {
      "name": "Quote",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Standart",
            "fields": [
              {
                "name": "price_quote",
                "type": {
                  "defined": "PriceQuote"
                }
              },
              {
                "name": "legs_multiplier_bps",
                "type": "u64"
              }
            ]
          },
          {
            "name": "FixedSize",
            "fields": [
              {
                "name": "price_quote",
                "type": {
                  "defined": "PriceQuote"
                }
              }
            ]
          }
        ]
      }
    },
    {
      "name": "PriceQuote",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "AbsolutePrice",
            "fields": [
              {
                "name": "amount_bps",
                "type": "u128"
              }
            ]
          }
        ]
      }
    },
    {
      "name": "StoredRfqState",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Constructed"
          },
          {
            "name": "Active"
          },
          {
            "name": "Canceled"
          }
        ]
      }
    },
    {
      "name": "RfqState",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Constructed"
          },
          {
            "name": "Active"
          },
          {
            "name": "Canceled"
          },
          {
            "name": "Expired"
          },
          {
            "name": "Settling"
          },
          {
            "name": "SettlingEnded"
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
      "name": "StoredResponseState",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Active"
          },
          {
            "name": "Canceled"
          },
          {
            "name": "WaitingForLastLook"
          },
          {
            "name": "SettlingPreparations"
          },
          {
            "name": "ReadyForSettling"
          },
          {
            "name": "Settled"
          },
          {
            "name": "Defaulted"
          }
        ]
      }
    },
    {
      "name": "ResponseState",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Active"
          },
          {
            "name": "Canceled"
          },
          {
            "name": "WaitingForLastLook"
          },
          {
            "name": "SettlingPreparations"
          },
          {
            "name": "OnlyMakerPrepared"
          },
          {
            "name": "OnlyTakerPrepared"
          },
          {
            "name": "ReadyForSettling"
          },
          {
            "name": "Settled"
          },
          {
            "name": "Defaulted"
          },
          {
            "name": "Expired"
          }
        ]
      }
    },
    {
      "name": "AuthoritySide",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Taker"
          },
          {
            "name": "Maker"
          }
        ]
      }
    },
    {
      "name": "DefaultingParty",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Taker"
          },
          {
            "name": "Maker"
          },
          {
            "name": "Both"
          }
        ]
      }
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "NotAProtocolAuthority",
      "msg": "Require protocol authority"
    },
    {
      "code": 6001,
      "name": "InstrumentAlreadyAdded",
      "msg": "Instrument already added"
    },
    {
      "code": 6002,
      "name": "InvalidRiskEngineRegister",
      "msg": "Invalid risk engine register"
    },
    {
      "code": 6003,
      "name": "NotACollateralMint",
      "msg": "Passed mint is not a collateral mint"
    },
    {
      "code": 6004,
      "name": "NotACollateralTokenAccount",
      "msg": "Passed token account does not belong to collateral mint"
    },
    {
      "code": 6005,
      "name": "NotARiskEngine",
      "msg": "Passed account is not a risk engine in the protocol"
    },
    {
      "code": 6006,
      "name": "EmptyLegsNotSupported",
      "msg": "An Rfq without legs is not supported"
    },
    {
      "code": 6007,
      "name": "NotEnoughTokens",
      "msg": "Not enough tokens"
    },
    {
      "code": 6008,
      "name": "NotEnoughCollateral",
      "msg": "Not enough collateral"
    },
    {
      "code": 6009,
      "name": "NotAWhitelistedInstrument",
      "msg": "Not a whitelisted instrument"
    },
    {
      "code": 6010,
      "name": "NotEnoughAccounts",
      "msg": "Not enough accounts"
    },
    {
      "code": 6011,
      "name": "PassedProgramIdDiffersFromAnInstrument",
      "msg": "Passed program id differs from an instrument"
    },
    {
      "code": 6012,
      "name": "RfqIsNotInRequiredState",
      "msg": "Rfq is not in required state"
    },
    {
      "code": 6013,
      "name": "ResponseDoesNotMatchOrderType",
      "msg": "Response does not match order type"
    },
    {
      "code": 6014,
      "name": "InvalidQuoteType",
      "msg": "Invalid quote type"
    },
    {
      "code": 6015,
      "name": "ResponseForAnotherRfq",
      "msg": "Response is for another Rfq"
    },
    {
      "code": 6016,
      "name": "NotATaker",
      "msg": "Caller is not a taker"
    },
    {
      "code": 6017,
      "name": "ResponseIsNotInRequiredState",
      "msg": "Response is not required state"
    },
    {
      "code": 6018,
      "name": "ConfirmedSideMissing",
      "msg": "Confirmed side is missing in a response"
    },
    {
      "code": 6019,
      "name": "NotAPassedAuthority",
      "msg": "Caller is not a authority passed in parameters"
    },
    {
      "code": 6020,
      "name": "TakerCanNotRespond",
      "msg": "Taker can not respond to rfq he had created"
    },
    {
      "code": 6021,
      "name": "NotAQuoteMint",
      "msg": "Not a quote mint"
    },
    {
      "code": 6022,
      "name": "WrongQuoteReceiver",
      "msg": "Quote receiver account is not a receiver associated token account"
    },
    {
      "code": 6023,
      "name": "NoLegMultiplierForFixedSize",
      "msg": "Fixed size rfq doesn't support specifying legs multiplier"
    },
    {
      "code": 6024,
      "name": "LegMultiplierHigherThanInQuote",
      "msg": "Leg multiplier can't be higher than which is specified in the quote"
    },
    {
      "code": 6025,
      "name": "CanNotLockAdditionalMakerCollateral",
      "msg": "Confirmation can't lock additional maker collateral"
    },
    {
      "code": 6026,
      "name": "NoPreparationToRevert",
      "msg": "This side of rfq either had not prepared or had already reverted"
    },
    {
      "code": 6027,
      "name": "NoCollateralLocked",
      "msg": "No collateral locked"
    },
    {
      "code": 6028,
      "name": "InvalidDefaultingParty",
      "msg": "Invalid defaulting party"
    }
  ]
};

export const IDL: Rfq = {
  "version": "0.1.0",
  "name": "rfq",
  "instructions": [
    {
      "name": "initializeProtocol",
      "accounts": [
        {
          "name": "signer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "protocol",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "riskEngine",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "collateralMint",
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
          "name": "settleFees",
          "type": {
            "defined": "FeeParameters"
          }
        },
        {
          "name": "defaultFees",
          "type": {
            "defined": "FeeParameters"
          }
        }
      ]
    },
    {
      "name": "addInstrument",
      "accounts": [
        {
          "name": "authority",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "protocol",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "instrumentProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "validateDataAccountAmount",
          "type": "u8"
        },
        {
          "name": "prepareToSettleAccountAmount",
          "type": "u8"
        },
        {
          "name": "settleAccountAmount",
          "type": "u8"
        },
        {
          "name": "revertPreparationAccountAmount",
          "type": "u8"
        }
      ]
    },
    {
      "name": "initializeCollateral",
      "accounts": [
        {
          "name": "user",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "protocol",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "collateralInfo",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "collateralToken",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "collateralMint",
          "isMut": false,
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
          "name": "rent",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "fundCollateral",
      "accounts": [
        {
          "name": "user",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "userTokens",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "protocol",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "collateralInfo",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "collateralToken",
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
        }
      ]
    },
    {
      "name": "intitializeRfq",
      "accounts": [
        {
          "name": "taker",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "protocol",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rfq",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "collateralInfo",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "collateralToken",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "quoteMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "riskEngine",
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
          "name": "legs",
          "type": {
            "vec": {
              "defined": "Leg"
            }
          }
        },
        {
          "name": "orderType",
          "type": {
            "defined": "OrderType"
          }
        },
        {
          "name": "fixedSize",
          "type": {
            "defined": "FixedSize"
          }
        },
        {
          "name": "activeWindow",
          "type": "u32"
        },
        {
          "name": "settlingWindow",
          "type": "u32"
        }
      ]
    },
    {
      "name": "respondToRfq",
      "accounts": [
        {
          "name": "maker",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "protocol",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rfq",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "response",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "collateralInfo",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "collateralToken",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "riskEngine",
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
          "name": "bid",
          "type": {
            "option": {
              "defined": "Quote"
            }
          }
        },
        {
          "name": "ask",
          "type": {
            "option": {
              "defined": "Quote"
            }
          }
        }
      ]
    },
    {
      "name": "confirmResponse",
      "accounts": [
        {
          "name": "taker",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "protocol",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rfq",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "response",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "collateralInfo",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "makerCollateralInfo",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "collateralToken",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "riskEngine",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "side",
          "type": {
            "defined": "Side"
          }
        },
        {
          "name": "overrideLegMultiplierBps",
          "type": {
            "option": "u64"
          }
        }
      ]
    },
    {
      "name": "prepareToSettle",
      "accounts": [
        {
          "name": "caller",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "quoteTokens",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "protocol",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rfq",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "response",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "quoteMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "quoteEscrow",
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
          "name": "rent",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "side",
          "type": {
            "defined": "AuthoritySide"
          }
        }
      ]
    },
    {
      "name": "settle",
      "accounts": [
        {
          "name": "protocol",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rfq",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "response",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "quoteReceiverTokens",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "quoteEscrow",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "revertPreparation",
      "accounts": [
        {
          "name": "protocol",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rfq",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "response",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "quoteTokens",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "quoteEscrow",
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
          "name": "side",
          "type": {
            "defined": "AuthoritySide"
          }
        }
      ]
    },
    {
      "name": "unlockResponseCollateral",
      "accounts": [
        {
          "name": "protocol",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rfq",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "response",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "takerCollateralInfo",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "makerCollateralInfo",
          "isMut": true,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "unlockRfqCollateral",
      "accounts": [
        {
          "name": "protocol",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rfq",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "collateralInfo",
          "isMut": true,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "settleOnePartyDefaultCollateral",
      "accounts": [
        {
          "name": "protocol",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rfq",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "response",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "takerCollateralInfo",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "makerCollateralInfo",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "takerCollateralTokens",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "makerCollateralTokens",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "settleBothPartyDefaultCollateral",
      "accounts": [
        {
          "name": "protocol",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rfq",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "response",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "takerCollateralInfo",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "makerCollateralInfo",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "takerCollateralTokens",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "makerCollateralTokens",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "protocolCollateralTokens",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "protocolState",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "publicKey"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "active",
            "type": "bool"
          },
          {
            "name": "settleFees",
            "type": {
              "defined": "FeeParameters"
            }
          },
          {
            "name": "defaultFees",
            "type": {
              "defined": "FeeParameters"
            }
          },
          {
            "name": "riskEngine",
            "type": "publicKey"
          },
          {
            "name": "collateralMint",
            "type": "publicKey"
          },
          {
            "name": "instruments",
            "type": {
              "vec": {
                "defined": "Instrument"
              }
            }
          }
        ]
      }
    },
    {
      "name": "rfq",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "taker",
            "type": "publicKey"
          },
          {
            "name": "orderType",
            "type": {
              "defined": "OrderType"
            }
          },
          {
            "name": "lastLookEnabled",
            "type": "bool"
          },
          {
            "name": "fixedSize",
            "type": {
              "defined": "FixedSize"
            }
          },
          {
            "name": "quoteMint",
            "type": "publicKey"
          },
          {
            "name": "accessManager",
            "type": {
              "option": "publicKey"
            }
          },
          {
            "name": "creationTimestamp",
            "type": "i64"
          },
          {
            "name": "activeWindow",
            "type": "u32"
          },
          {
            "name": "settlingWindow",
            "type": "u32"
          },
          {
            "name": "state",
            "type": {
              "defined": "StoredRfqState"
            }
          },
          {
            "name": "nonResponseTakerCollateralLocked",
            "type": "u64"
          },
          {
            "name": "totalTakerCollateralLocked",
            "type": "u64"
          },
          {
            "name": "totalResponses",
            "type": "u32"
          },
          {
            "name": "clearedResponses",
            "type": "u32"
          },
          {
            "name": "confirmedResponses",
            "type": "u32"
          },
          {
            "name": "legs",
            "type": {
              "vec": {
                "defined": "Leg"
              }
            }
          }
        ]
      }
    },
    {
      "name": "response",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "maker",
            "type": "publicKey"
          },
          {
            "name": "rfq",
            "type": "publicKey"
          },
          {
            "name": "creationTimestamp",
            "type": "i64"
          },
          {
            "name": "makerCollateralLocked",
            "type": "u64"
          },
          {
            "name": "takerCollateralLocked",
            "type": "u64"
          },
          {
            "name": "state",
            "type": {
              "defined": "StoredResponseState"
            }
          },
          {
            "name": "takerPreparedToSettle",
            "type": "bool"
          },
          {
            "name": "makerPreparedToSettle",
            "type": "bool"
          },
          {
            "name": "confirmed",
            "type": {
              "option": {
                "defined": "Confirmation"
              }
            }
          },
          {
            "name": "defaultingParty",
            "type": {
              "option": {
                "defined": "DefaultingParty"
              }
            }
          },
          {
            "name": "firstToPrepare",
            "type": {
              "option": {
                "defined": "AuthoritySide"
              }
            }
          },
          {
            "name": "bid",
            "type": {
              "option": {
                "defined": "Quote"
              }
            }
          },
          {
            "name": "ask",
            "type": {
              "option": {
                "defined": "Quote"
              }
            }
          }
        ]
      }
    },
    {
      "name": "collateralInfo",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "user",
            "type": "publicKey"
          },
          {
            "name": "tokenAccountBump",
            "type": "u8"
          },
          {
            "name": "lockedTokensAmount",
            "type": "u64"
          }
        ]
      }
    }
  ],
  "types": [
    {
      "name": "Instrument",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "programKey",
            "type": "publicKey"
          },
          {
            "name": "validateDataAccountAmount",
            "type": "u8"
          },
          {
            "name": "prepareToSettleAccountAmount",
            "type": "u8"
          },
          {
            "name": "settleAccountAmount",
            "type": "u8"
          },
          {
            "name": "revertPreparationAccountAmount",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "FeeParameters",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "takerBps",
            "type": "u64"
          },
          {
            "name": "makerBps",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "Leg",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "instrument",
            "type": "publicKey"
          },
          {
            "name": "instrumentData",
            "type": "bytes"
          },
          {
            "name": "instrumentAmount",
            "type": "u64"
          },
          {
            "name": "side",
            "type": {
              "defined": "Side"
            }
          }
        ]
      }
    },
    {
      "name": "Confirmation",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "side",
            "type": {
              "defined": "Side"
            }
          },
          {
            "name": "overrideLegMultiplierBps",
            "type": {
              "option": "u64"
            }
          }
        ]
      }
    },
    {
      "name": "FixedSize",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "None",
            "fields": [
              {
                "name": "padding",
                "type": "u64"
              }
            ]
          },
          {
            "name": "BaseAsset",
            "fields": [
              {
                "name": "legs_multiplier_bps",
                "type": "u64"
              }
            ]
          },
          {
            "name": "QuoteAsset",
            "fields": [
              {
                "name": "quote_amount",
                "type": "u64"
              }
            ]
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
            "name": "Buy"
          },
          {
            "name": "Sell"
          },
          {
            "name": "TwoWay"
          }
        ]
      }
    },
    {
      "name": "Quote",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Standart",
            "fields": [
              {
                "name": "price_quote",
                "type": {
                  "defined": "PriceQuote"
                }
              },
              {
                "name": "legs_multiplier_bps",
                "type": "u64"
              }
            ]
          },
          {
            "name": "FixedSize",
            "fields": [
              {
                "name": "price_quote",
                "type": {
                  "defined": "PriceQuote"
                }
              }
            ]
          }
        ]
      }
    },
    {
      "name": "PriceQuote",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "AbsolutePrice",
            "fields": [
              {
                "name": "amount_bps",
                "type": "u128"
              }
            ]
          }
        ]
      }
    },
    {
      "name": "StoredRfqState",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Constructed"
          },
          {
            "name": "Active"
          },
          {
            "name": "Canceled"
          }
        ]
      }
    },
    {
      "name": "RfqState",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Constructed"
          },
          {
            "name": "Active"
          },
          {
            "name": "Canceled"
          },
          {
            "name": "Expired"
          },
          {
            "name": "Settling"
          },
          {
            "name": "SettlingEnded"
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
      "name": "StoredResponseState",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Active"
          },
          {
            "name": "Canceled"
          },
          {
            "name": "WaitingForLastLook"
          },
          {
            "name": "SettlingPreparations"
          },
          {
            "name": "ReadyForSettling"
          },
          {
            "name": "Settled"
          },
          {
            "name": "Defaulted"
          }
        ]
      }
    },
    {
      "name": "ResponseState",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Active"
          },
          {
            "name": "Canceled"
          },
          {
            "name": "WaitingForLastLook"
          },
          {
            "name": "SettlingPreparations"
          },
          {
            "name": "OnlyMakerPrepared"
          },
          {
            "name": "OnlyTakerPrepared"
          },
          {
            "name": "ReadyForSettling"
          },
          {
            "name": "Settled"
          },
          {
            "name": "Defaulted"
          },
          {
            "name": "Expired"
          }
        ]
      }
    },
    {
      "name": "AuthoritySide",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Taker"
          },
          {
            "name": "Maker"
          }
        ]
      }
    },
    {
      "name": "DefaultingParty",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Taker"
          },
          {
            "name": "Maker"
          },
          {
            "name": "Both"
          }
        ]
      }
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "NotAProtocolAuthority",
      "msg": "Require protocol authority"
    },
    {
      "code": 6001,
      "name": "InstrumentAlreadyAdded",
      "msg": "Instrument already added"
    },
    {
      "code": 6002,
      "name": "InvalidRiskEngineRegister",
      "msg": "Invalid risk engine register"
    },
    {
      "code": 6003,
      "name": "NotACollateralMint",
      "msg": "Passed mint is not a collateral mint"
    },
    {
      "code": 6004,
      "name": "NotACollateralTokenAccount",
      "msg": "Passed token account does not belong to collateral mint"
    },
    {
      "code": 6005,
      "name": "NotARiskEngine",
      "msg": "Passed account is not a risk engine in the protocol"
    },
    {
      "code": 6006,
      "name": "EmptyLegsNotSupported",
      "msg": "An Rfq without legs is not supported"
    },
    {
      "code": 6007,
      "name": "NotEnoughTokens",
      "msg": "Not enough tokens"
    },
    {
      "code": 6008,
      "name": "NotEnoughCollateral",
      "msg": "Not enough collateral"
    },
    {
      "code": 6009,
      "name": "NotAWhitelistedInstrument",
      "msg": "Not a whitelisted instrument"
    },
    {
      "code": 6010,
      "name": "NotEnoughAccounts",
      "msg": "Not enough accounts"
    },
    {
      "code": 6011,
      "name": "PassedProgramIdDiffersFromAnInstrument",
      "msg": "Passed program id differs from an instrument"
    },
    {
      "code": 6012,
      "name": "RfqIsNotInRequiredState",
      "msg": "Rfq is not in required state"
    },
    {
      "code": 6013,
      "name": "ResponseDoesNotMatchOrderType",
      "msg": "Response does not match order type"
    },
    {
      "code": 6014,
      "name": "InvalidQuoteType",
      "msg": "Invalid quote type"
    },
    {
      "code": 6015,
      "name": "ResponseForAnotherRfq",
      "msg": "Response is for another Rfq"
    },
    {
      "code": 6016,
      "name": "NotATaker",
      "msg": "Caller is not a taker"
    },
    {
      "code": 6017,
      "name": "ResponseIsNotInRequiredState",
      "msg": "Response is not required state"
    },
    {
      "code": 6018,
      "name": "ConfirmedSideMissing",
      "msg": "Confirmed side is missing in a response"
    },
    {
      "code": 6019,
      "name": "NotAPassedAuthority",
      "msg": "Caller is not a authority passed in parameters"
    },
    {
      "code": 6020,
      "name": "TakerCanNotRespond",
      "msg": "Taker can not respond to rfq he had created"
    },
    {
      "code": 6021,
      "name": "NotAQuoteMint",
      "msg": "Not a quote mint"
    },
    {
      "code": 6022,
      "name": "WrongQuoteReceiver",
      "msg": "Quote receiver account is not a receiver associated token account"
    },
    {
      "code": 6023,
      "name": "NoLegMultiplierForFixedSize",
      "msg": "Fixed size rfq doesn't support specifying legs multiplier"
    },
    {
      "code": 6024,
      "name": "LegMultiplierHigherThanInQuote",
      "msg": "Leg multiplier can't be higher than which is specified in the quote"
    },
    {
      "code": 6025,
      "name": "CanNotLockAdditionalMakerCollateral",
      "msg": "Confirmation can't lock additional maker collateral"
    },
    {
      "code": 6026,
      "name": "NoPreparationToRevert",
      "msg": "This side of rfq either had not prepared or had already reverted"
    },
    {
      "code": 6027,
      "name": "NoCollateralLocked",
      "msg": "No collateral locked"
    },
    {
      "code": 6028,
      "name": "InvalidDefaultingParty",
      "msg": "Invalid defaulting party"
    }
  ]
};
