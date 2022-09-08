export type DummyRiskEngine = {
  "version": "0.1.0",
  "name": "dummy_risk_engine",
  "instructions": [
    {
      "name": "calculateCollateralForRfq",
      "accounts": [
        {
          "name": "rfq",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [],
      "returns": "u64"
    },
    {
      "name": "calculateCollateralForResponse",
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
      "args": [],
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
      "args": [],
      "returns": {
        "defined": "(u64,u64)"
      }
    }
  ]
};

export const IDL: DummyRiskEngine = {
  "version": "0.1.0",
  "name": "dummy_risk_engine",
  "instructions": [
    {
      "name": "calculateCollateralForRfq",
      "accounts": [
        {
          "name": "rfq",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [],
      "returns": "u64"
    },
    {
      "name": "calculateCollateralForResponse",
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
      "args": [],
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
      "args": [],
      "returns": {
        "defined": "(u64,u64)"
      }
    }
  ]
};