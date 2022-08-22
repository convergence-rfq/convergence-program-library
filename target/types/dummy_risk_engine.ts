export type DummyRiskEngine = {
  "version": "0.1.0",
  "name": "dummy_risk_engine",
  "instructions": [
    {
      "name": "calculateCollateralForRfq",
      "accounts": [],
      "args": [
        {
          "name": "taker",
          "type": "publicKey"
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
          "name": "fixedSize",
          "type": {
            "defined": "FixedSize"
          }
        }
      ],
      "returns": "u64"
    },
    {
      "name": "calculateCollateralForResponse",
      "accounts": [
        {
          "name": "rfq",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "maker",
          "type": "publicKey"
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
      ],
      "returns": "u64"
    },
    {
      "name": "calculateCollateralForConfirmation",
      "accounts": [
        {
          "name": "rfq",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "response",
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
        }
      ],
      "returns": "u64"
    }
  ]
};

export const IDL: DummyRiskEngine = {
  "version": "0.1.0",
  "name": "dummy_risk_engine",
  "instructions": [
    {
      "name": "calculateCollateralForRfq",
      "accounts": [],
      "args": [
        {
          "name": "taker",
          "type": "publicKey"
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
          "name": "fixedSize",
          "type": {
            "defined": "FixedSize"
          }
        }
      ],
      "returns": "u64"
    },
    {
      "name": "calculateCollateralForResponse",
      "accounts": [
        {
          "name": "rfq",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "maker",
          "type": "publicKey"
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
      ],
      "returns": "u64"
    },
    {
      "name": "calculateCollateralForConfirmation",
      "accounts": [
        {
          "name": "rfq",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "response",
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
        }
      ],
      "returns": "u64"
    }
  ]
};
