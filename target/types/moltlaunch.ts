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
    "description": "MoltLaunch - Solana Agent Validation Protocol"
  },
  "instructions": [
    {
      "name": "attestVerification",
      "docs": [
        "Record a PoA verification score on-chain (authority only)"
      ],
      "discriminator": [
        174,
        250,
        164,
        34,
        215,
        158,
        186,
        134
      ],
      "accounts": [
        {
          "name": "identity",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  97,
                  112,
                  45,
                  105,
                  100,
                  101,
                  110,
                  116,
                  105,
                  116,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "identity.owner",
                "account": "agentIdentity"
              }
            ]
          }
        },
        {
          "name": "launchpad",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  97,
                  117,
                  110,
                  99,
                  104,
                  112,
                  97,
                  100
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "signer": true,
          "relations": [
            "launchpad"
          ]
        }
      ],
      "args": [
        {
          "name": "score",
          "type": "u8"
        },
        {
          "name": "tier",
          "type": "string"
        },
        {
          "name": "attestationHash",
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
      "name": "bindDepinDevice",
      "docs": [
        "Link identity to a DePIN device PDA"
      ],
      "discriminator": [
        134,
        210,
        151,
        92,
        92,
        34,
        209,
        10
      ],
      "accounts": [
        {
          "name": "identity",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  97,
                  112,
                  45,
                  105,
                  100,
                  101,
                  110,
                  116,
                  105,
                  116,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              }
            ]
          }
        },
        {
          "name": "devicePda"
        },
        {
          "name": "owner",
          "signer": true,
          "relations": [
            "identity"
          ]
        }
      ],
      "args": [
        {
          "name": "depinProvider",
          "type": "string"
        },
        {
          "name": "deviceId",
          "type": "string"
        }
      ]
    },
    {
      "name": "buyTokens",
      "docs": [
        "Buy tokens from bonding curve"
      ],
      "discriminator": [
        189,
        21,
        230,
        133,
        247,
        2,
        110,
        42
      ],
      "accounts": [
        {
          "name": "launch",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  97,
                  117,
                  110,
                  99,
                  104
                ]
              },
              {
                "kind": "account",
                "path": "launch.agent",
                "account": "launch"
              }
            ]
          }
        },
        {
          "name": "mint",
          "writable": true
        },
        {
          "name": "vault",
          "writable": true
        },
        {
          "name": "buyer",
          "writable": true,
          "signer": true
        },
        {
          "name": "buyerTokenAccount",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "solAmount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "createLaunch",
      "docs": [
        "Create a new token launch with bonding curve"
      ],
      "discriminator": [
        239,
        223,
        255,
        134,
        39,
        121,
        127,
        62
      ],
      "accounts": [
        {
          "name": "launch",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  97,
                  117,
                  110,
                  99,
                  104
                ]
              },
              {
                "kind": "account",
                "path": "agent"
              }
            ]
          }
        },
        {
          "name": "agent",
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
                "path": "owner"
              }
            ]
          }
        },
        {
          "name": "mint",
          "writable": true,
          "signer": true
        },
        {
          "name": "owner",
          "writable": true,
          "signer": true,
          "relations": [
            "agent"
          ]
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "launchParams"
            }
          }
        }
      ]
    },
    {
      "name": "delegateAuthority",
      "docs": [
        "Delegate authority over this identity to another keypair"
      ],
      "discriminator": [
        228,
        17,
        85,
        163,
        65,
        139,
        36,
        206
      ],
      "accounts": [
        {
          "name": "identity",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  97,
                  112,
                  45,
                  105,
                  100,
                  101,
                  110,
                  116,
                  105,
                  116,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              }
            ]
          }
        },
        {
          "name": "owner",
          "signer": true,
          "relations": [
            "identity"
          ]
        }
      ],
      "args": [
        {
          "name": "delegate",
          "type": "pubkey"
        },
        {
          "name": "scope",
          "type": {
            "defined": {
              "name": "delegationScope"
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
      "name": "finalizeLaunch",
      "docs": [
        "Finalize launch and create Raydium pool (when graduated)"
      ],
      "discriminator": [
        113,
        133,
        62,
        196,
        58,
        212,
        118,
        166
      ],
      "accounts": [
        {
          "name": "launch",
          "writable": true
        },
        {
          "name": "authority",
          "signer": true
        }
      ],
      "args": []
    },
    {
      "name": "flagSybil",
      "docs": [
        "Flag an identity as a Sybil (authority only)"
      ],
      "discriminator": [
        131,
        60,
        253,
        184,
        193,
        16,
        174,
        70
      ],
      "accounts": [
        {
          "name": "identity",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  97,
                  112,
                  45,
                  105,
                  100,
                  101,
                  110,
                  116,
                  105,
                  116,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "identity.owner",
                "account": "agentIdentity"
              }
            ]
          }
        },
        {
          "name": "launchpad",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  97,
                  117,
                  110,
                  99,
                  104,
                  112,
                  97,
                  100
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "signer": true,
          "relations": [
            "launchpad"
          ]
        }
      ],
      "args": [
        {
          "name": "reason",
          "type": "string"
        },
        {
          "name": "matchingIdentity",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "initialize",
      "docs": [
        "Initialize the launchpad configuration"
      ],
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
          "name": "launchpad",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  97,
                  117,
                  110,
                  99,
                  104,
                  112,
                  97,
                  100
                ]
              }
            ]
          }
        },
        {
          "name": "treasury"
        },
        {
          "name": "authority",
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
          "name": "config",
          "type": {
            "defined": {
              "name": "launchpadConfig"
            }
          }
        }
      ]
    },
    {
      "name": "registerAgent",
      "docs": [
        "Register a new agent for verification"
      ],
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
                "path": "owner"
              }
            ]
          }
        },
        {
          "name": "owner",
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
        },
        {
          "name": "capabilities",
          "type": {
            "vec": "string"
          }
        },
        {
          "name": "proofUrl",
          "type": "string"
        }
      ]
    },
    {
      "name": "registerIdentity",
      "docs": [
        "Register a hardware-anchored identity PDA for an agent"
      ],
      "discriminator": [
        164,
        118,
        227,
        177,
        47,
        176,
        187,
        248
      ],
      "accounts": [
        {
          "name": "identity",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  97,
                  112,
                  45,
                  105,
                  100,
                  101,
                  110,
                  116,
                  105,
                  116,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              }
            ]
          }
        },
        {
          "name": "owner",
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
          "name": "identityHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "trustLevel",
          "type": "u8"
        },
        {
          "name": "attestationMethod",
          "type": "string"
        }
      ]
    },
    {
      "name": "revokeDelegation",
      "docs": [
        "Revoke an existing delegation"
      ],
      "discriminator": [
        188,
        92,
        135,
        67,
        160,
        181,
        54,
        62
      ],
      "accounts": [
        {
          "name": "identity",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  97,
                  112,
                  45,
                  105,
                  100,
                  101,
                  110,
                  116,
                  105,
                  116,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              }
            ]
          }
        },
        {
          "name": "owner",
          "signer": true,
          "relations": [
            "identity"
          ]
        }
      ],
      "args": []
    },
    {
      "name": "rotateIdentity",
      "docs": [
        "Rotate identity to a new hardware fingerprint (preserves score, drops trust)"
      ],
      "discriminator": [
        182,
        215,
        197,
        254,
        178,
        56,
        199,
        236
      ],
      "accounts": [
        {
          "name": "identity",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  97,
                  112,
                  45,
                  105,
                  100,
                  101,
                  110,
                  116,
                  105,
                  116,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              }
            ]
          }
        },
        {
          "name": "owner",
          "signer": true,
          "relations": [
            "identity"
          ]
        }
      ],
      "args": [
        {
          "name": "newIdentityHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "migrationProof",
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
      "name": "updateTrustLevel",
      "docs": [
        "Update trust level after new attestation (owner only)"
      ],
      "discriminator": [
        226,
        164,
        214,
        50,
        71,
        113,
        54,
        106
      ],
      "accounts": [
        {
          "name": "identity",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  97,
                  112,
                  45,
                  105,
                  100,
                  101,
                  110,
                  116,
                  105,
                  116,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              }
            ]
          }
        },
        {
          "name": "owner",
          "signer": true,
          "relations": [
            "identity"
          ]
        }
      ],
      "args": [
        {
          "name": "newLevel",
          "type": "u8"
        },
        {
          "name": "evidenceHash",
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
      "name": "verifyAgent",
      "docs": [
        "Verify an agent (admin only)"
      ],
      "discriminator": [
        206,
        212,
        108,
        12,
        105,
        61,
        100,
        66
      ],
      "accounts": [
        {
          "name": "agent",
          "writable": true
        },
        {
          "name": "launchpad",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  97,
                  117,
                  110,
                  99,
                  104,
                  112,
                  97,
                  100
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "signer": true,
          "relations": [
            "launchpad"
          ]
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "agent",
      "discriminator": [
        47,
        166,
        112,
        147,
        155,
        197,
        86,
        7
      ]
    },
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
      "name": "launch",
      "discriminator": [
        144,
        51,
        51,
        163,
        206,
        85,
        213,
        38
      ]
    },
    {
      "name": "launchpad",
      "discriminator": [
        247,
        20,
        16,
        242,
        203,
        38,
        169,
        160
      ]
    }
  ],
  "events": [
    {
      "name": "dePinBound",
      "discriminator": [
        195,
        25,
        7,
        221,
        244,
        253,
        100,
        151
      ]
    },
    {
      "name": "delegationCreated",
      "discriminator": [
        20,
        93,
        12,
        34,
        227,
        63,
        100,
        136
      ]
    },
    {
      "name": "delegationRevoked",
      "discriminator": [
        59,
        158,
        142,
        49,
        164,
        116,
        220,
        8
      ]
    },
    {
      "name": "identityRegistered",
      "discriminator": [
        5,
        243,
        147,
        84,
        8,
        116,
        238,
        24
      ]
    },
    {
      "name": "identityRotated",
      "discriminator": [
        249,
        231,
        242,
        236,
        76,
        94,
        129,
        91
      ]
    },
    {
      "name": "sybilFlagged",
      "discriminator": [
        246,
        89,
        7,
        82,
        18,
        195,
        228,
        204
      ]
    },
    {
      "name": "trustLevelUpdated",
      "discriminator": [
        54,
        223,
        51,
        60,
        169,
        238,
        18,
        171
      ]
    },
    {
      "name": "verificationAttested",
      "discriminator": [
        197,
        206,
        56,
        232,
        123,
        214,
        158,
        94
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "agentNotVerified",
      "msg": "Agent is not verified"
    },
    {
      "code": 6001,
      "name": "launchNotActive",
      "msg": "Launch is not active"
    },
    {
      "code": 6002,
      "name": "launchNotStarted",
      "msg": "Launch has not started"
    },
    {
      "code": 6003,
      "name": "launchEnded",
      "msg": "Launch has ended"
    },
    {
      "code": 6004,
      "name": "notGraduated",
      "msg": "Launch has not graduated"
    },
    {
      "code": 6005,
      "name": "invalidTrustLevel",
      "msg": "Invalid trust level (must be 0-5)"
    },
    {
      "code": 6006,
      "name": "identityExpired",
      "msg": "Identity has expired"
    },
    {
      "code": 6007,
      "name": "sybilFlagged",
      "msg": "Identity is flagged as Sybil"
    },
    {
      "code": 6008,
      "name": "dePinDeviceNotFound",
      "msg": "DePIN device PDA does not exist on-chain"
    },
    {
      "code": 6009,
      "name": "delegationExpired",
      "msg": "Delegation has expired"
    },
    {
      "code": 6010,
      "name": "unauthorizedDelegate",
      "msg": "Unauthorized delegate"
    },
    {
      "code": 6011,
      "name": "insufficientScope",
      "msg": "Insufficient delegation scope"
    }
  ],
  "types": [
    {
      "name": "agent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "capabilities",
            "type": {
              "vec": "string"
            }
          },
          {
            "name": "proofUrl",
            "type": "string"
          },
          {
            "name": "verified",
            "type": "bool"
          },
          {
            "name": "verifiedAt",
            "type": {
              "option": "i64"
            }
          },
          {
            "name": "createdAt",
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
      "name": "agentIdentity",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "identityHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "trustLevel",
            "type": "u8"
          },
          {
            "name": "score",
            "type": "u8"
          },
          {
            "name": "attestationMethod",
            "type": "string"
          },
          {
            "name": "depinDevice",
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "depinProvider",
            "type": {
              "option": "string"
            }
          },
          {
            "name": "sybilFlagged",
            "type": "bool"
          },
          {
            "name": "sybilMatch",
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "lastAttestation",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "lastEvidence",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "registeredAt",
            "type": "i64"
          },
          {
            "name": "expiresAt",
            "type": "i64"
          },
          {
            "name": "attestedAt",
            "type": {
              "option": "i64"
            }
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "previousIdentityHash",
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
            "name": "rotatedAt",
            "type": {
              "option": "i64"
            }
          },
          {
            "name": "delegate",
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "delegationScope",
            "type": {
              "option": "u8"
            }
          },
          {
            "name": "delegationExpires",
            "type": {
              "option": "i64"
            }
          }
        ]
      }
    },
    {
      "name": "bondingCurveType",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "linear"
          },
          {
            "name": "exponential"
          },
          {
            "name": "sigmoid"
          }
        ]
      }
    },
    {
      "name": "dePinBound",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "devicePda",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "delegationCreated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "delegate",
            "type": "pubkey"
          },
          {
            "name": "scope",
            "type": "u8"
          },
          {
            "name": "expiresAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "delegationRevoked",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "delegate",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "delegationScope",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "full"
          },
          {
            "name": "attestOnly"
          },
          {
            "name": "readOnly"
          },
          {
            "name": "signTransactions"
          }
        ]
      }
    },
    {
      "name": "identityRegistered",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "identityHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "trustLevel",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "identityRotated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "oldHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "newHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "migrationProof",
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
      "name": "launch",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "agent",
            "type": "pubkey"
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "symbol",
            "type": "string"
          },
          {
            "name": "targetRaise",
            "type": "u64"
          },
          {
            "name": "currentRaise",
            "type": "u64"
          },
          {
            "name": "tokenSupply",
            "type": "u64"
          },
          {
            "name": "tokensSold",
            "type": "u64"
          },
          {
            "name": "bondingCurveType",
            "type": {
              "defined": {
                "name": "bondingCurveType"
              }
            }
          },
          {
            "name": "startTime",
            "type": "i64"
          },
          {
            "name": "endTime",
            "type": "i64"
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "launchStatus"
              }
            }
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "launchParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "symbol",
            "type": "string"
          },
          {
            "name": "targetRaise",
            "type": "u64"
          },
          {
            "name": "tokenSupply",
            "type": "u64"
          },
          {
            "name": "bondingCurveType",
            "type": {
              "defined": {
                "name": "bondingCurveType"
              }
            }
          },
          {
            "name": "startTime",
            "type": "i64"
          },
          {
            "name": "endTime",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "launchStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "pending"
          },
          {
            "name": "active"
          },
          {
            "name": "graduated"
          },
          {
            "name": "finalized"
          },
          {
            "name": "failed"
          }
        ]
      }
    },
    {
      "name": "launchpad",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "treasury",
            "type": "pubkey"
          },
          {
            "name": "platformFeeBps",
            "type": "u16"
          },
          {
            "name": "minRaise",
            "type": "u64"
          },
          {
            "name": "maxRaise",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "launchpadConfig",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "platformFeeBps",
            "type": "u16"
          },
          {
            "name": "minRaise",
            "type": "u64"
          },
          {
            "name": "maxRaise",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "sybilFlagged",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "matchingIdentity",
            "type": "pubkey"
          },
          {
            "name": "reason",
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "trustLevelUpdated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "oldLevel",
            "type": "u8"
          },
          {
            "name": "newLevel",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "verificationAttested",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "score",
            "type": "u8"
          },
          {
            "name": "attestationHash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          }
        ]
      }
    }
  ]
};
