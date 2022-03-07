export type Rfq = {
  "version": "0.1.0",
  "name": "rfq",
  "instructions": [
    {
      "name": "initialize",
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
      "name": "initializeRfq",
      "accounts": [
        {
          "name": "authority",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "rfqState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "orderBookState",
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
          "name": "action",
          "type": "bool"
        },
        {
          "name": "instrument",
          "type": "u8"
        },
        {
          "name": "rfqExpiry",
          "type": "i64"
        },
        {
          "name": "strike",
          "type": "u64"
        },
        {
          "name": "ratio",
          "type": "u8"
        },
        {
          "name": "nOfLegs",
          "type": "u8"
        }
      ]
    },
    {
      "name": "placeLimitOrder",
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
          "name": "orderBookState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "assetToken",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "escrowToken",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "assetMint",
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
          "name": "action",
          "type": "bool"
        },
        {
          "name": "price",
          "type": "u64"
        },
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "cancelLimitOrder",
      "accounts": [],
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
            "name": "action",
            "type": "bool"
          },
          {
            "name": "instrument",
            "type": "u8"
          },
          {
            "name": "rfqExpiry",
            "type": "i64"
          },
          {
            "name": "expiry",
            "type": "i64"
          },
          {
            "name": "strike",
            "type": "u64"
          },
          {
            "name": "ratio",
            "type": "u8"
          },
          {
            "name": "nOfLegs",
            "type": "u8"
          },
          {
            "name": "bestBid",
            "type": "u64"
          },
          {
            "name": "bestOffer",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "orderBookState",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bids",
            "type": {
              "vec": "u64"
            }
          },
          {
            "name": "asks",
            "type": {
              "vec": "u64"
            }
          },
          {
            "name": "bidSigners",
            "type": {
              "vec": "u64"
            }
          },
          {
            "name": "askSigners",
            "type": {
              "vec": "u64"
            }
          }
        ]
      }
    },
    {
      "name": "globalState",
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
          }
        ]
      }
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
          "isMut": false,
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
      "name": "initializeRfq",
      "accounts": [
        {
          "name": "authority",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "rfqState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "orderBookState",
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
          "name": "action",
          "type": "bool"
        },
        {
          "name": "instrument",
          "type": "u8"
        },
        {
          "name": "rfqExpiry",
          "type": "i64"
        },
        {
          "name": "strike",
          "type": "u64"
        },
        {
          "name": "ratio",
          "type": "u8"
        },
        {
          "name": "nOfLegs",
          "type": "u8"
        }
      ]
    },
    {
      "name": "placeLimitOrder",
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
          "name": "orderBookState",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "assetToken",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "escrowToken",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "assetMint",
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
          "name": "action",
          "type": "bool"
        },
        {
          "name": "price",
          "type": "u64"
        },
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "cancelLimitOrder",
      "accounts": [],
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
            "name": "action",
            "type": "bool"
          },
          {
            "name": "instrument",
            "type": "u8"
          },
          {
            "name": "rfqExpiry",
            "type": "i64"
          },
          {
            "name": "expiry",
            "type": "i64"
          },
          {
            "name": "strike",
            "type": "u64"
          },
          {
            "name": "ratio",
            "type": "u8"
          },
          {
            "name": "nOfLegs",
            "type": "u8"
          },
          {
            "name": "bestBid",
            "type": "u64"
          },
          {
            "name": "bestOffer",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "orderBookState",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bids",
            "type": {
              "vec": "u64"
            }
          },
          {
            "name": "asks",
            "type": {
              "vec": "u64"
            }
          },
          {
            "name": "bidSigners",
            "type": {
              "vec": "u64"
            }
          },
          {
            "name": "askSigners",
            "type": {
              "vec": "u64"
            }
          }
        ]
      }
    },
    {
      "name": "globalState",
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
          }
        ]
      }
    }
  ]
};
