/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/moltlaunch.json`.
 */
export type Moltlaunch = {
  "address": "6AZSAhq4iJTwCfGEVssoa1p3GnBqGkbcQ1iDdP1U1pSb",
  "metadata": {
    "name": "moltlaunch",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "MoltLaunch V3 — Composable Signal Architecture for AI Agent Identity"
  },
  "instructions": [
    {
      "name": "addAuthority",
      "discriminator": [
        229,
        9,
        106,
        73,
        91,
        213,
        109,
        183
      ],
      "accounts": [
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  111,
                  108,
                  116,
                  108,
                  97,
                  117,
                  110,
                  99,
                  104
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "authorityPubkey"
              }
            ]
          }
        },
        {
          "name": "authorityPubkey"
        },
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "authorityType",
          "type": {
            "defined": {
              "name": "authorityType"
            }
          }
        }
      ]
    },
    {
      "name": "flagAgent",
      "discriminator": [
        235,
        111,
        155,
        252,
        101,
        79,
        59,
        219
      ],
      "accounts": [
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  111,
                  108,
                  116,
                  108,
                  97,
                  117,
                  110,
                  99,
                  104
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "authoritySigner"
              }
            ]
          }
        },
        {
          "name": "agent",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  103,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "agent.wallet",
                "account": "agentIdentity"
              }
            ]
          }
        },
        {
          "name": "authoritySigner",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "reasonHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "initialize",
      "discriminator": [
        175,
        175,
        109,
        31,
        13,
        152,
        155,
        237
      ],
      "accounts": [
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  111,
                  108,
                  116,
                  108,
                  97,
                  117,
                  110,
                  99,
                  104
                ]
              }
            ]
          }
        },
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "refreshIdentitySignals",
      "discriminator": [
        192,
        171,
        41,
        249,
        54,
        12,
        114,
        128
      ],
      "accounts": [
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  111,
                  108,
                  116,
                  108,
                  97,
                  117,
                  110,
                  99,
                  104
                ]
              }
            ]
          }
        },
        {
          "name": "agent",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  103,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "agent.wallet",
                "account": "agentIdentity"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "registerAgent",
      "discriminator": [
        135,
        157,
        66,
        195,
        2,
        113,
        175,
        30
      ],
      "accounts": [
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  111,
                  108,
                  116,
                  108,
                  97,
                  117,
                  110,
                  99,
                  104
                ]
              }
            ]
          }
        },
        {
          "name": "agent",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  103,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "wallet"
              }
            ]
          }
        },
        {
          "name": "wallet",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "name",
          "type": "string"
        }
      ]
    },
    {
      "name": "removeAuthority",
      "discriminator": [
        242,
        104,
        208,
        132,
        190,
        250,
        74,
        216
      ],
      "accounts": [
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  111,
                  108,
                  116,
                  108,
                  97,
                  117,
                  110,
                  99,
                  104
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "authority.pubkey",
                "account": "authority"
              }
            ]
          }
        },
        {
          "name": "admin",
          "signer": true
        }
      ],
      "args": []
    },
    {
      "name": "revokeAttestation",
      "discriminator": [
        12,
        156,
        103,
        161,
        194,
        246,
        211,
        179
      ],
      "accounts": [
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  111,
                  108,
                  116,
                  108,
                  97,
                  117,
                  110,
                  99,
                  104
                ]
              }
            ]
          }
        },
        {
          "name": "attestation",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  116,
                  116,
                  101,
                  115,
                  116,
                  97,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "attestation.agent",
                "account": "attestation"
              },
              {
                "kind": "account",
                "path": "attestation.authority",
                "account": "attestation"
              }
            ]
          }
        },
        {
          "name": "authoritySigner",
          "signer": true
        }
      ],
      "args": []
    },
    {
      "name": "submitAttestation",
      "discriminator": [
        238,
        220,
        255,
        105,
        183,
        211,
        40,
        83
      ],
      "accounts": [
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  111,
                  108,
                  116,
                  108,
                  97,
                  117,
                  110,
                  99,
                  104
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "authoritySigner"
              }
            ]
          }
        },
        {
          "name": "agent",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  103,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "agent.wallet",
                "account": "agentIdentity"
              }
            ]
          }
        },
        {
          "name": "attestation",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  116,
                  116,
                  101,
                  115,
                  116,
                  97,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "agent.wallet",
                "account": "agentIdentity"
              },
              {
                "kind": "account",
                "path": "authoritySigner"
              }
            ]
          }
        },
        {
          "name": "authoritySigner",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "signalType",
          "type": {
            "defined": {
              "name": "signalType"
            }
          }
        },
        {
          "name": "attestationHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "teeQuote",
          "type": {
            "option": {
              "array": [
                "u8",
                32
              ]
            }
          }
        },
        {
          "name": "expiresAt",
          "type": "i64"
        }
      ]
    },
    {
      "name": "unflagAgent",
      "discriminator": [
        154,
        213,
        255,
        157,
        177,
        64,
        122,
        85
      ],
      "accounts": [
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  111,
                  108,
                  116,
                  108,
                  97,
                  117,
                  110,
                  99,
                  104
                ]
              }
            ]
          }
        },
        {
          "name": "agent",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  103,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "agent.wallet",
                "account": "agentIdentity"
              }
            ]
          }
        },
        {
          "name": "admin",
          "signer": true
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "agentIdentity",
      "discriminator": [
        11,
        149,
        31,
        27,
        186,
        76,
        241,
        72
      ]
    },
    {
      "name": "attestation",
      "discriminator": [
        152,
        125,
        183,
        86,
        36,
        146,
        121,
        73
      ]
    },
    {
      "name": "authority",
      "discriminator": [
        36,
        108,
        254,
        18,
        167,
        144,
        27,
        36
      ]
    },
    {
      "name": "protocolConfig",
      "discriminator": [
        207,
        91,
        250,
        28,
        152,
        179,
        215,
        209
      ]
    }
  ],
  "events": [
    {
      "name": "agentFlagged",
      "discriminator": [
        233,
        147,
        162,
        100,
        245,
        61,
        175,
        85
      ]
    },
    {
      "name": "agentRegistered",
      "discriminator": [
        191,
        78,
        217,
        54,
        232,
        100,
        189,
        85
      ]
    },
    {
      "name": "agentUnflagged",
      "discriminator": [
        192,
        185,
        66,
        72,
        56,
        134,
        16,
        37
      ]
    },
    {
      "name": "attestationRevoked",
      "discriminator": [
        47,
        106,
        65,
        238,
        200,
        127,
        163,
        50
      ]
    },
    {
      "name": "attestationSubmitted",
      "discriminator": [
        177,
        213,
        117,
        225,
        166,
        11,
        54,
        218
      ]
    },
    {
      "name": "authorityAdded",
      "discriminator": [
        50,
        148,
        144,
        211,
        13,
        58,
        69,
        166
      ]
    },
    {
      "name": "authorityRemoved",
      "discriminator": [
        141,
        173,
        114,
        187,
        213,
        168,
        90,
        182
      ]
    },
    {
      "name": "trustScoreRefreshed",
      "discriminator": [
        111,
        239,
        179,
        205,
        136,
        70,
        213,
        176
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "unauthorized",
      "msg": "unauthorized"
    },
    {
      "code": 6001,
      "name": "agentAlreadyRegistered",
      "msg": "Agent already registered"
    },
    {
      "code": 6002,
      "name": "agentNotFound",
      "msg": "Agent not found"
    },
    {
      "code": 6003,
      "name": "authorityNotActive",
      "msg": "Authority is not active"
    },
    {
      "code": 6004,
      "name": "attestationAlreadyExists",
      "msg": "Attestation already exists"
    },
    {
      "code": 6005,
      "name": "attestationExpired",
      "msg": "Attestation has expired"
    },
    {
      "code": 6006,
      "name": "agentFlagged",
      "msg": "Agent is flagged"
    },
    {
      "code": 6007,
      "name": "protocolPaused",
      "msg": "Protocol is paused"
    },
    {
      "code": 6008,
      "name": "nameTooLong",
      "msg": "Name too long (max 32 characters)"
    },
    {
      "code": 6009,
      "name": "invalidSignalType",
      "msg": "Invalid signal type"
    }
  ],
  "types": [
    {
      "name": "agentFlagged",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "agent",
            "type": "pubkey"
          },
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "reasonHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          }
        ]
      }
    },
    {
      "name": "agentIdentity",
      "docs": [
        "AgentIdentity — the composable signal hub. Seeds: [\"agent\", wallet]"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "wallet",
            "type": "pubkey"
          },
          {
            "name": "infraType",
            "type": {
              "defined": {
                "name": "infraType"
              }
            }
          },
          {
            "name": "hasEconomicStake",
            "type": "bool"
          },
          {
            "name": "hasHardwareBinding",
            "type": "bool"
          },
          {
            "name": "attestationCount",
            "type": "u8"
          },
          {
            "name": "isFlagged",
            "type": "bool"
          },
          {
            "name": "trustScore",
            "type": "u8"
          },
          {
            "name": "lastVerified",
            "type": "i64"
          },
          {
            "name": "nonce",
            "type": "u64"
          },
          {
            "name": "registeredAt",
            "type": "i64"
          },
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "agentRegistered",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "wallet",
            "type": "pubkey"
          },
          {
            "name": "name",
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "agentUnflagged",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "agent",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "attestation",
      "docs": [
        "Attestation — one per (agent, authority) pair.",
        "Seeds: [\"attestation\", agent_wallet, authority_pubkey]"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "agent",
            "type": "pubkey"
          },
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "authorityType",
            "type": {
              "defined": {
                "name": "authorityType"
              }
            }
          },
          {
            "name": "signalContributed",
            "type": {
              "defined": {
                "name": "signalType"
              }
            }
          },
          {
            "name": "attestationHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "teeQuote",
            "type": {
              "option": {
                "array": [
                  "u8",
                  32
                ]
              }
            }
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "expiresAt",
            "type": "i64"
          },
          {
            "name": "revoked",
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "attestationRevoked",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "agent",
            "type": "pubkey"
          },
          {
            "name": "authority",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "attestationSubmitted",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "agent",
            "type": "pubkey"
          },
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "signalType",
            "type": {
              "defined": {
                "name": "signalType"
              }
            }
          }
        ]
      }
    },
    {
      "name": "authority",
      "docs": [
        "Authority — one per authorized verifier. Seeds: [\"authority\", pubkey]"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "pubkey",
            "type": "pubkey"
          },
          {
            "name": "authorityType",
            "type": {
              "defined": {
                "name": "authorityType"
              }
            }
          },
          {
            "name": "attestationCount",
            "type": "u64"
          },
          {
            "name": "active",
            "type": "bool"
          },
          {
            "name": "addedBy",
            "type": "pubkey"
          },
          {
            "name": "addedAt",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "authorityAdded",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "authorityType",
            "type": {
              "defined": {
                "name": "authorityType"
              }
            }
          }
        ]
      }
    },
    {
      "name": "authorityRemoved",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "authorityType",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "single"
          },
          {
            "name": "multisigMember"
          },
          {
            "name": "oracleOperator"
          },
          {
            "name": "ncnValidator"
          }
        ]
      }
    },
    {
      "name": "infraType",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "unknown"
          },
          {
            "name": "cloud"
          },
          {
            "name": "tee"
          },
          {
            "name": "dePin"
          }
        ]
      }
    },
    {
      "name": "protocolConfig",
      "docs": [
        "Singleton protocol configuration — seeds: [\"moltlaunch\"]"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "admin",
            "type": "pubkey"
          },
          {
            "name": "revocationNonce",
            "type": "u64"
          },
          {
            "name": "totalAgents",
            "type": "u64"
          },
          {
            "name": "totalAttestations",
            "type": "u64"
          },
          {
            "name": "paused",
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "signalType",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "infraCloud"
          },
          {
            "name": "infraTee"
          },
          {
            "name": "infraDePin"
          },
          {
            "name": "economicStake"
          },
          {
            "name": "hardwareBinding"
          },
          {
            "name": "general"
          }
        ]
      }
    },
    {
      "name": "trustScoreRefreshed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "agent",
            "type": "pubkey"
          },
          {
            "name": "oldScore",
            "type": "u8"
          },
          {
            "name": "newScore",
            "type": "u8"
          }
        ]
      }
    }
  ]
};
