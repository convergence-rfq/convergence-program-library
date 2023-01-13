export type Pyth = {
  version: "0.1.0";
  name: "pyth";
  instructions: [
    {
      name: "initialize";
      accounts: [
        {
          name: "price";
          isMut: true;
          isSigner: false;
        }
      ];
      args: [
        {
          name: "price";
          type: "i64";
        },
        {
          name: "expo";
          type: "i32";
        },
        {
          name: "conf";
          type: "u64";
        }
      ];
    },
    {
      name: "setPrice";
      accounts: [
        {
          name: "price";
          isMut: true;
          isSigner: false;
        }
      ];
      args: [
        {
          name: "price";
          type: "i64";
        }
      ];
    },
    {
      name: "getPrice";
      accounts: [
        {
          name: "price";
          isMut: false;
          isSigner: false;
        },
        {
          name: "dataAccount";
          isMut: true;
          isSigner: true;
        },
        {
          name: "payer";
          isMut: true;
          isSigner: false;
        },
        {
          name: "systemProgram";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [];
    }
  ];
  accounts: [
    {
      name: "dataAccount";
      type: {
        kind: "struct";
        fields: [
          {
            name: "price";
            type: "u64";
          }
        ];
      };
    }
  ];
};

export const IDL: Pyth = {
  version: "0.1.0",
  name: "pyth",
  instructions: [
    {
      name: "initialize",
      accounts: [
        {
          name: "price",
          isMut: true,
          isSigner: false,
        },
      ],
      args: [
        {
          name: "price",
          type: "i64",
        },
        {
          name: "expo",
          type: "i32",
        },
        {
          name: "conf",
          type: "u64",
        },
      ],
    },
    {
      name: "setPrice",
      accounts: [
        {
          name: "price",
          isMut: true,
          isSigner: false,
        },
      ],
      args: [
        {
          name: "price",
          type: "i64",
        },
      ],
    },
    {
      name: "getPrice",
      accounts: [
        {
          name: "price",
          isMut: false,
          isSigner: false,
        },
        {
          name: "dataAccount",
          isMut: true,
          isSigner: true,
        },
        {
          name: "payer",
          isMut: true,
          isSigner: false,
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [],
    },
  ],
  accounts: [
    {
      name: "dataAccount",
      type: {
        kind: "struct",
        fields: [
          {
            name: "price",
            type: "u64",
          },
        ],
      },
    },
  ],
};
