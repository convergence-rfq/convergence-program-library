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
          "name": "rfqState",
          "isMut": true,
          "isSigner": false
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
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "associatedTokenProgram",
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
          "name": "title",
          "type": "string"
        },
        {
          "name": "requestOrderType",
          "type": "u8"
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
          "name": "orderState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "rfqState",
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
          "name": "escrowAssetToken",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "escrowQuoteToken",
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
          "name": "associatedTokenProgram",
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
          "name": "title",
          "type": "string"
        },
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
          "name": "rfqState",
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
          "name": "escrowAssetToken",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "escrowQuoteToken",
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
          "name": "associatedTokenProgram",
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
          "name": "title",
          "type": "string"
        },
        {
          "name": "confirmOrderType",
          "type": "u8"
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
          "name": "orderState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "rfqState",
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
          "name": "title",
          "type": "string"
        }
      ]
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
          "name": "orderState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "rfqState",
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
          "name": "escrowAssetToken",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "escrowQuoteToken",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "assetMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "quoteMint",
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
          "name": "associatedTokenProgram",
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
          "name": "title",
          "type": "string"
        }
      ]
    },
    {
      "name": "settle",
      "accounts": [
        {
          "name": "authority",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "orderState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "rfqState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "protocol",
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
          "name": "escrowAssetToken",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "escrowQuoteToken",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "assetMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "quoteMint",
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
          "name": "associatedTokenProgram",
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
          "name": "title",
          "type": "string"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "rfqState",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "title",
            "type": "string"
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
            "name": "expired",
            "type": "bool"
          },
          {
            "name": "assetMint",
            "type": "publicKey"
          },
          {
            "name": "quoteMint",
            "type": "publicKey"
          },
          {
            "name": "bestBidAmount",
            "type": "u64"
          },
          {
            "name": "bestAskAmount",
            "type": "u64"
          },
          {
            "name": "bestBidAddress",
            "type": "publicKey"
          },
          {
            "name": "bestAskAddress",
            "type": "publicKey"
          },
          {
            "name": "responseCount",
            "type": "u16"
          },
          {
            "name": "requestOrderType",
            "type": "u8"
          },
          {
            "name": "confirmOrderType",
            "type": "u8"
          },
          {
            "name": "orderAmount",
            "type": "u64"
          },
          {
            "name": "confirmed",
            "type": "bool"
          },
          {
            "name": "approved",
            "type": "bool"
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
      "name": "protocol",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "rfqCount",
            "type": "u64"
          },
          {
            "name": "accessManagerCount",
            "type": "u64"
          },
          {
            "name": "authority",
            "type": "publicKey"
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
            "name": "titles",
            "type": {
              "vec": "string"
            }
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
            "name": "bid",
            "type": "u64"
          },
          {
            "name": "collateralReturned",
            "type": "bool"
          }
        ]
      }
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "InvalidQuoteType",
      "msg": "Invalid quote type"
    },
    {
      "code": 6001,
      "name": "InvalidTakerAddress",
      "msg": "Invalid taker address"
    },
    {
      "code": 6002,
      "name": "TradeNotConfirmed",
      "msg": "Trade has not been confirmed by taker"
    },
    {
      "code": 6003,
      "name": "TradeNotApproved",
      "msg": "Trade has not been approved (last look) by maker"
    },
    {
      "code": 6004,
      "name": "ResponseTimeElapsed",
      "msg": "Timed out on response to request"
    },
    {
      "code": 6005,
      "name": "InvalidOrder",
      "msg": "Invalid order logic"
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
          "name": "rfqState",
          "isMut": true,
          "isSigner": false
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
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "associatedTokenProgram",
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
          "name": "title",
          "type": "string"
        },
        {
          "name": "requestOrderType",
          "type": "u8"
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
          "name": "orderState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "rfqState",
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
          "name": "escrowAssetToken",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "escrowQuoteToken",
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
          "name": "associatedTokenProgram",
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
          "name": "title",
          "type": "string"
        },
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
          "name": "rfqState",
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
          "name": "escrowAssetToken",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "escrowQuoteToken",
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
          "name": "associatedTokenProgram",
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
          "name": "title",
          "type": "string"
        },
        {
          "name": "confirmOrderType",
          "type": "u8"
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
          "name": "orderState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "rfqState",
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
          "name": "title",
          "type": "string"
        }
      ]
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
          "name": "orderState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "rfqState",
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
          "name": "escrowAssetToken",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "escrowQuoteToken",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "assetMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "quoteMint",
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
          "name": "associatedTokenProgram",
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
          "name": "title",
          "type": "string"
        }
      ]
    },
    {
      "name": "settle",
      "accounts": [
        {
          "name": "authority",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "orderState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "rfqState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "protocol",
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
          "name": "escrowAssetToken",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "escrowQuoteToken",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "assetMint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "quoteMint",
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
          "name": "associatedTokenProgram",
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
          "name": "title",
          "type": "string"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "rfqState",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "title",
            "type": "string"
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
            "name": "expired",
            "type": "bool"
          },
          {
            "name": "assetMint",
            "type": "publicKey"
          },
          {
            "name": "quoteMint",
            "type": "publicKey"
          },
          {
            "name": "bestBidAmount",
            "type": "u64"
          },
          {
            "name": "bestAskAmount",
            "type": "u64"
          },
          {
            "name": "bestBidAddress",
            "type": "publicKey"
          },
          {
            "name": "bestAskAddress",
            "type": "publicKey"
          },
          {
            "name": "responseCount",
            "type": "u16"
          },
          {
            "name": "requestOrderType",
            "type": "u8"
          },
          {
            "name": "confirmOrderType",
            "type": "u8"
          },
          {
            "name": "orderAmount",
            "type": "u64"
          },
          {
            "name": "confirmed",
            "type": "bool"
          },
          {
            "name": "approved",
            "type": "bool"
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
      "name": "protocol",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "rfqCount",
            "type": "u64"
          },
          {
            "name": "accessManagerCount",
            "type": "u64"
          },
          {
            "name": "authority",
            "type": "publicKey"
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
            "name": "titles",
            "type": {
              "vec": "string"
            }
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
            "name": "bid",
            "type": "u64"
          },
          {
            "name": "collateralReturned",
            "type": "bool"
          }
        ]
      }
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "InvalidQuoteType",
      "msg": "Invalid quote type"
    },
    {
      "code": 6001,
      "name": "InvalidTakerAddress",
      "msg": "Invalid taker address"
    },
    {
      "code": 6002,
      "name": "TradeNotConfirmed",
      "msg": "Trade has not been confirmed by taker"
    },
    {
      "code": 6003,
      "name": "TradeNotApproved",
      "msg": "Trade has not been approved (last look) by maker"
    },
    {
      "code": 6004,
      "name": "ResponseTimeElapsed",
      "msg": "Timed out on response to request"
    },
    {
      "code": 6005,
      "name": "InvalidOrder",
      "msg": "Invalid order logic"
    }
  ]
};
