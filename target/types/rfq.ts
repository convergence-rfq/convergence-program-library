export type Rfq = {
  "version": "0.1.0",
  "name": "rfq",
  "instructions": [
    {
      "name": "initialize",
      "accounts": [
        {
          "name": "authority",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "protocol",
          "isMut": true,
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
          "name": "feeDenominator",
          "type": "u64"
        },
        {
          "name": "feeNumerator",
          "type": "u64"
        }
      ]
    },
    {
      "name": "request",
      "accounts": [
        {
          "name": "assetEscrow",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "assetMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "authority",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "protocol",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "quoteEscrow",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "quoteMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rfq",
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
        }
      ],
      "args": [
        {
          "name": "expiry",
          "type": "i64"
        },
        {
          "name": "lastLook",
          "type": "bool"
        },
        {
          "name": "legs",
          "type": {
            "vec": {
              "defined": "Leg"
            }
          }
        },
        {
          "name": "orderAmount",
          "type": "u64"
        },
        {
          "name": "requestOrder",
          "type": {
            "defined": "Order"
          }
        }
      ]
    },
    {
      "name": "respond",
      "accounts": [
        {
          "name": "authority",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "order",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "rfq",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "assetWallet",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "quoteWallet",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "assetEscrow",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "quoteEscrow",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "assetMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "quoteMint",
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
      "args": [
        {
          "name": "bid",
          "type": {
            "option": "u64"
          }
        },
        {
          "name": "ask",
          "type": {
            "option": "u64"
          }
        }
      ]
    },
    {
      "name": "confirm",
      "accounts": [
        {
          "name": "authority",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "rfq",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "assetWallet",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "assetMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "assetEscrow",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "order",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "quoteEscrow",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "quoteMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "quoteWallet",
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
          "name": "confirmOrder",
          "type": {
            "defined": "Order"
          }
        }
      ]
    },
    {
      "name": "lastLook",
      "accounts": [
        {
          "name": "authority",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "order",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "rfq",
          "isMut": true,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "returnCollateral",
      "accounts": [
        {
          "name": "authority",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "assetMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "assetWallet",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "quoteWallet",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "assetEscrow",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "order",
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
          "name": "rfq",
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
      "name": "settle",
      "accounts": [
        {
          "name": "assetMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "assetWallet",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "authority",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "assetEscrow",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "quoteEscrow",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "order",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "rfq",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "quoteWallet",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "quoteMint",
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
      "name": "rfqState",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "approved",
            "type": "bool"
          },
          {
            "name": "assetEscrowBump",
            "type": "u8"
          },
          {
            "name": "assetMint",
            "type": "publicKey"
          },
          {
            "name": "authority",
            "type": "publicKey"
          },
          {
            "name": "bestAskAmount",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "bestBidAmount",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "bestAskAddress",
            "type": {
              "option": "publicKey"
            }
          },
          {
            "name": "bestBidAddress",
            "type": {
              "option": "publicKey"
            }
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "confirmOrder",
            "type": {
              "defined": "Order"
            }
          },
          {
            "name": "confirmed",
            "type": "bool"
          },
          {
            "name": "expiry",
            "type": "i64"
          },
          {
            "name": "id",
            "type": "u64"
          },
          {
            "name": "legs",
            "type": {
              "vec": {
                "defined": "Leg"
              }
            }
          },
          {
            "name": "lastLook",
            "type": "bool"
          },
          {
            "name": "orderAmount",
            "type": "u64"
          },
          {
            "name": "quoteEscrowBump",
            "type": "u8"
          },
          {
            "name": "quoteMint",
            "type": "publicKey"
          },
          {
            "name": "responseCount",
            "type": "u64"
          },
          {
            "name": "requestOrder",
            "type": {
              "defined": "Order"
            }
          },
          {
            "name": "takerAddress",
            "type": "publicKey"
          },
          {
            "name": "unixTimestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "protocolState",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "accessManagerCount",
            "type": "u64"
          },
          {
            "name": "authority",
            "type": "publicKey"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "feeDenominator",
            "type": "u64"
          },
          {
            "name": "feeNumerator",
            "type": "u64"
          },
          {
            "name": "rfqCount",
            "type": "u64"
          },
          {
            "name": "treasuryWallet",
            "type": "publicKey"
          }
        ]
      }
    },
    {
      "name": "orderState",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "ask",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "authority",
            "type": "publicKey"
          },
          {
            "name": "bid",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "collateralReturned",
            "type": "bool"
          },
          {
            "name": "id",
            "type": "u64"
          },
          {
            "name": "unixTimestamp",
            "type": "i64"
          }
        ]
      }
    }
  ],
  "types": [
    {
      "name": "Leg",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "instrument",
            "type": {
              "defined": "Instrument"
            }
          },
          {
            "name": "venue",
            "type": {
              "defined": "Venue"
            }
          },
          {
            "name": "side",
            "type": {
              "defined": "Side"
            }
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "Instrument",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Call"
          },
          {
            "name": "Future"
          },
          {
            "name": "Put"
          },
          {
            "name": "Spot"
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
            "name": "Buy"
          },
          {
            "name": "Sell"
          }
        ]
      }
    },
    {
      "name": "Venue",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Convergence"
          },
          {
            "name": "PsyOptions"
          }
        ]
      }
    },
    {
      "name": "Order",
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
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "InvalidOrder",
      "msg": "Invalid order logic"
    },
    {
      "code": 6001,
      "name": "InvalidQuote",
      "msg": "Invalid quote"
    },
    {
      "code": 6002,
      "name": "InvalidTakerAddress",
      "msg": "Invalid taker address"
    },
    {
      "code": 6003,
      "name": "InvalidAuthorityAddress",
      "msg": "Invalid authority address"
    },
    {
      "code": 6004,
      "name": "InvalidOrderAmount",
      "msg": "Invalid order amount"
    },
    {
      "code": 6005,
      "name": "LastLookNotSet",
      "msg": "Last look has not been configured for this RFQ"
    },
    {
      "code": 6006,
      "name": "NotImplemented",
      "msg": "Not implemented"
    },
    {
      "code": 6007,
      "name": "TradeNotConfirmed",
      "msg": "Trade has not been confirmed by taker"
    },
    {
      "code": 6008,
      "name": "TradeNotApproved",
      "msg": "Trade has not been approved via last look by maker"
    },
    {
      "code": 6009,
      "name": "ResponseTimeElapsed",
      "msg": "Timed out on response to request"
    }
  ]
};

export const IDL: Rfq = {
  "version": "0.1.0",
  "name": "rfq",
  "instructions": [
    {
      "name": "initialize",
      "accounts": [
        {
          "name": "authority",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "protocol",
          "isMut": true,
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
          "name": "feeDenominator",
          "type": "u64"
        },
        {
          "name": "feeNumerator",
          "type": "u64"
        }
      ]
    },
    {
      "name": "request",
      "accounts": [
        {
          "name": "assetEscrow",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "assetMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "authority",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "protocol",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "quoteEscrow",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "quoteMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rent",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "rfq",
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
        }
      ],
      "args": [
        {
          "name": "expiry",
          "type": "i64"
        },
        {
          "name": "lastLook",
          "type": "bool"
        },
        {
          "name": "legs",
          "type": {
            "vec": {
              "defined": "Leg"
            }
          }
        },
        {
          "name": "orderAmount",
          "type": "u64"
        },
        {
          "name": "requestOrder",
          "type": {
            "defined": "Order"
          }
        }
      ]
    },
    {
      "name": "respond",
      "accounts": [
        {
          "name": "authority",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "order",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "rfq",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "assetWallet",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "quoteWallet",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "assetEscrow",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "quoteEscrow",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "assetMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "quoteMint",
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
      "args": [
        {
          "name": "bid",
          "type": {
            "option": "u64"
          }
        },
        {
          "name": "ask",
          "type": {
            "option": "u64"
          }
        }
      ]
    },
    {
      "name": "confirm",
      "accounts": [
        {
          "name": "authority",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "rfq",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "assetWallet",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "assetMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "assetEscrow",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "order",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "quoteEscrow",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "quoteMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "quoteWallet",
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
          "name": "confirmOrder",
          "type": {
            "defined": "Order"
          }
        }
      ]
    },
    {
      "name": "lastLook",
      "accounts": [
        {
          "name": "authority",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "order",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "rfq",
          "isMut": true,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "returnCollateral",
      "accounts": [
        {
          "name": "authority",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "assetMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "assetWallet",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "quoteWallet",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "assetEscrow",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "order",
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
          "name": "rfq",
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
      "name": "settle",
      "accounts": [
        {
          "name": "assetMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "assetWallet",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "authority",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "assetEscrow",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "quoteEscrow",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "order",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "rfq",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "quoteWallet",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "quoteMint",
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
      "name": "rfqState",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "approved",
            "type": "bool"
          },
          {
            "name": "assetEscrowBump",
            "type": "u8"
          },
          {
            "name": "assetMint",
            "type": "publicKey"
          },
          {
            "name": "authority",
            "type": "publicKey"
          },
          {
            "name": "bestAskAmount",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "bestBidAmount",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "bestAskAddress",
            "type": {
              "option": "publicKey"
            }
          },
          {
            "name": "bestBidAddress",
            "type": {
              "option": "publicKey"
            }
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "confirmOrder",
            "type": {
              "defined": "Order"
            }
          },
          {
            "name": "confirmed",
            "type": "bool"
          },
          {
            "name": "expiry",
            "type": "i64"
          },
          {
            "name": "id",
            "type": "u64"
          },
          {
            "name": "legs",
            "type": {
              "vec": {
                "defined": "Leg"
              }
            }
          },
          {
            "name": "lastLook",
            "type": "bool"
          },
          {
            "name": "orderAmount",
            "type": "u64"
          },
          {
            "name": "quoteEscrowBump",
            "type": "u8"
          },
          {
            "name": "quoteMint",
            "type": "publicKey"
          },
          {
            "name": "responseCount",
            "type": "u64"
          },
          {
            "name": "requestOrder",
            "type": {
              "defined": "Order"
            }
          },
          {
            "name": "takerAddress",
            "type": "publicKey"
          },
          {
            "name": "unixTimestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "protocolState",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "accessManagerCount",
            "type": "u64"
          },
          {
            "name": "authority",
            "type": "publicKey"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "feeDenominator",
            "type": "u64"
          },
          {
            "name": "feeNumerator",
            "type": "u64"
          },
          {
            "name": "rfqCount",
            "type": "u64"
          },
          {
            "name": "treasuryWallet",
            "type": "publicKey"
          }
        ]
      }
    },
    {
      "name": "orderState",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "ask",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "authority",
            "type": "publicKey"
          },
          {
            "name": "bid",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "collateralReturned",
            "type": "bool"
          },
          {
            "name": "id",
            "type": "u64"
          },
          {
            "name": "unixTimestamp",
            "type": "i64"
          }
        ]
      }
    }
  ],
  "types": [
    {
      "name": "Leg",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "instrument",
            "type": {
              "defined": "Instrument"
            }
          },
          {
            "name": "venue",
            "type": {
              "defined": "Venue"
            }
          },
          {
            "name": "side",
            "type": {
              "defined": "Side"
            }
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "Instrument",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Call"
          },
          {
            "name": "Future"
          },
          {
            "name": "Put"
          },
          {
            "name": "Spot"
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
            "name": "Buy"
          },
          {
            "name": "Sell"
          }
        ]
      }
    },
    {
      "name": "Venue",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Convergence"
          },
          {
            "name": "PsyOptions"
          }
        ]
      }
    },
    {
      "name": "Order",
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
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "InvalidOrder",
      "msg": "Invalid order logic"
    },
    {
      "code": 6001,
      "name": "InvalidQuote",
      "msg": "Invalid quote"
    },
    {
      "code": 6002,
      "name": "InvalidTakerAddress",
      "msg": "Invalid taker address"
    },
    {
      "code": 6003,
      "name": "InvalidAuthorityAddress",
      "msg": "Invalid authority address"
    },
    {
      "code": 6004,
      "name": "InvalidOrderAmount",
      "msg": "Invalid order amount"
    },
    {
      "code": 6005,
      "name": "LastLookNotSet",
      "msg": "Last look has not been configured for this RFQ"
    },
    {
      "code": 6006,
      "name": "NotImplemented",
      "msg": "Not implemented"
    },
    {
      "code": 6007,
      "name": "TradeNotConfirmed",
      "msg": "Trade has not been confirmed by taker"
    },
    {
      "code": 6008,
      "name": "TradeNotApproved",
      "msg": "Trade has not been approved via last look by maker"
    },
    {
      "code": 6009,
      "name": "ResponseTimeElapsed",
      "msg": "Timed out on response to request"
    }
  ]
};
