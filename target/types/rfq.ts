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
        }
      ],
      "args": [
        {
          "name": "requestOrder",
          "type": {
            "defined": "Order"
          }
        },
        {
          "name": "instrument",
          "type": "u8"
        },
        {
          "name": "expiry",
          "type": "i64"
        },
        {
          "name": "amount",
          "type": "u64"
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
          "name": "assetToken",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "quoteToken",
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
          "type": "u64"
        },
        {
          "name": "ask",
          "type": "u64"
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
          "name": "assetToken",
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
          "name": "quoteToken",
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
          "name": "assetToken",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "quoteToken",
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
          "name": "assetToken",
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
          "name": "quoteToken",
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
            "name": "assetMint",
            "type": "publicKey"
          },
          {
            "name": "bestAskAmount",
            "type": "u64"
          },
          {
            "name": "bestBidAmount",
            "type": "u64"
          },
          {
            "name": "bestAskAddress",
            "type": "publicKey"
          },
          {
            "name": "bestBidAddress",
            "type": "publicKey"
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
            "name": "expired",
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
            "name": "instrument",
            "type": "u8"
          },
          {
            "name": "orderAmount",
            "type": "u64"
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
            "name": "timeBegin",
            "type": "i64"
          },
          {
            "name": "timeResponse",
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
            "type": "u64"
          },
          {
            "name": "assetEscrowBump",
            "type": "u8"
          },
          {
            "name": "authority",
            "type": "publicKey"
          },
          {
            "name": "bid",
            "type": "u64"
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
            "name": "quoteEscrowBump",
            "type": "u8"
          }
        ]
      }
    }
  ],
  "types": [
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
      "name": "NotImplemented",
      "msg": "Not implemented"
    },
    {
      "code": 6004,
      "name": "TradeNotConfirmed",
      "msg": "Trade has not been confirmed by taker"
    },
    {
      "code": 6005,
      "name": "TradeNotApproved",
      "msg": "Trade has not been approved via last look by maker"
    },
    {
      "code": 6006,
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
        }
      ],
      "args": [
        {
          "name": "requestOrder",
          "type": {
            "defined": "Order"
          }
        },
        {
          "name": "instrument",
          "type": "u8"
        },
        {
          "name": "expiry",
          "type": "i64"
        },
        {
          "name": "amount",
          "type": "u64"
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
          "name": "assetToken",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "quoteToken",
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
          "type": "u64"
        },
        {
          "name": "ask",
          "type": "u64"
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
          "name": "assetToken",
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
          "name": "quoteToken",
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
          "name": "assetToken",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "quoteToken",
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
          "name": "assetToken",
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
          "name": "quoteToken",
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
            "name": "assetMint",
            "type": "publicKey"
          },
          {
            "name": "bestAskAmount",
            "type": "u64"
          },
          {
            "name": "bestBidAmount",
            "type": "u64"
          },
          {
            "name": "bestAskAddress",
            "type": "publicKey"
          },
          {
            "name": "bestBidAddress",
            "type": "publicKey"
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
            "name": "expired",
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
            "name": "instrument",
            "type": "u8"
          },
          {
            "name": "orderAmount",
            "type": "u64"
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
            "name": "timeBegin",
            "type": "i64"
          },
          {
            "name": "timeResponse",
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
            "type": "u64"
          },
          {
            "name": "assetEscrowBump",
            "type": "u8"
          },
          {
            "name": "authority",
            "type": "publicKey"
          },
          {
            "name": "bid",
            "type": "u64"
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
            "name": "quoteEscrowBump",
            "type": "u8"
          }
        ]
      }
    }
  ],
  "types": [
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
      "name": "NotImplemented",
      "msg": "Not implemented"
    },
    {
      "code": 6004,
      "name": "TradeNotConfirmed",
      "msg": "Trade has not been confirmed by taker"
    },
    {
      "code": 6005,
      "name": "TradeNotApproved",
      "msg": "Trade has not been approved via last look by maker"
    },
    {
      "code": 6006,
      "name": "ResponseTimeElapsed",
      "msg": "Timed out on response to request"
    }
  ]
};
