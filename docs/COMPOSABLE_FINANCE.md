# Composable Finance — Cross-Program CPI Integration Guide

> **MoltLaunch V3.1 × AAP × BlinkGuard**
> Trust-Gated Financial Flows on Solana

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Program Addresses](#program-addresses)
3. [PDA Derivation Formulas](#pda-derivation-formulas)
4. [Trust Signal Schema](#trust-signal-schema)
5. [Financial Tier System](#financial-tier-system)
6. [Trust-Adjusted Parameter Tables](#trust-adjusted-parameter-tables)
7. [Integration Patterns](#integration-patterns)
8. [Step-by-Step Integration Guide](#step-by-step-integration-guide)
9. [Composable Flow Walkthrough](#composable-flow-walkthrough)
10. [BlinkGuard Transaction Simulation](#blinkguard-transaction-simulation)
11. [Running the Demo](#running-the-demo)

---

## Architecture Overview

```
╔══════════════════════════════════════════════════════════════════════╗
║                    COMPOSABLE FINANCE ARCHITECTURE                   ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                      ║
║   ┌─────────────────┐                                                ║
║   │   AUTHORITIES    │  submit_attestation()                         ║
║   │  (TEE, Oracle,   │────────────────────┐                          ║
║   │   NCN Validator) │                    │                          ║
║   └─────────────────┘                    ▼                          ║
║                              ┌────────────────────┐                  ║
║                              │    MOLTLAUNCH V3.1   │                ║
║                              │   Signal Architecture │               ║
║                              │                        │              ║
║                              │  ┌──────────────────┐ │              ║
║                              │  │  AgentIdentity    │ │              ║
║                              │  │  ─────────────── │ │              ║
║                              │  │  wallet           │ │              ║
║                              │  │  infra_type       │ │              ║
║                              │  │  trust_score      │ │ ◄── COMPOSABLE ║
║                              │  │  attestation_cnt  │ │     SIGNAL HUB ║
║                              │  │  economic_stake   │ │              ║
║                              │  │  hardware_bind    │ │              ║
║                              │  │  is_flagged       │ │              ║
║                              │  └──────────────────┘ │              ║
║                              └──────────┬─────────────┘              ║
║                                         │                            ║
║                            CPI Read     │   CPI Read                 ║
║                     ┌───────────────────┤───────────────────┐        ║
║                     │                   │                   │        ║
║                     ▼                   ▼                   ▼        ║
║          ┌──────────────┐    ┌──────────────┐    ┌──────────────┐   ║
║          │  DeFi Proto   │    │     AAP       │    │  BlinkGuard  │   ║
║          │  ──────────── │    │  ──────────── │    │  ──────────  │   ║
║          │  Flash Loans  │    │  Agreements   │    │  TX Safety   │   ║
║          │  Credit Lines │    │  Escrow Vaults│    │  Delta Bounds│   ║
║          │  Insurance    │    │  Multi-Party  │    │  Simulation  │   ║
║          └──────────────┘    └──────────────┘    └──────────────┘   ║
║                     │                   │                   │        ║
║                     └───────────────────┤───────────────────┘        ║
║                                         │                            ║
║                                         ▼                            ║
║                              ┌──────────────────┐                    ║
║                              │   REPUTATION      │                    ║
║                              │   FEEDBACK LOOP   │                    ║
║                              │                    │                    ║
║                              │  fulfill → attest  │                    ║
║                              │  → higher score    │                    ║
║                              │  → better terms    │                    ║
║                              └──────────────────┘                    ║
╚══════════════════════════════════════════════════════════════════════╝
```

### Data Flow

```
Agent Registers → Authorities Attest → Trust Score Computed
        ↓                                       ↓
  AgentIdentity PDA                    Composable Signals
        ↓                                       ↓
  Cross-Program Read ←──── Any Program Derives PDA & Reads ────→
        ↓                                       ↓
  Financial Parameters                  Access Control
  (escrow, credit, etc.)               (gates, tiers)
        ↓                                       ↓
  AAP Agreement with                    BlinkGuard TX
  Trust-Adjusted Escrow                 Simulation
        ↓                                       ↓
  Settlement → New Attestation → Trust Score ↑ → Better Terms
```

---

## Program Addresses

| Program | Devnet Address | Description |
|---------|---------------|-------------|
| **MoltLaunch V3.1** | `6AZSAhq4iJTwCfGEVssoa1p3GnBqGkbcQ1iDdP1U1pSb` | AI Agent Identity & Trust Signals |
| **AAP V1** | `BzHyb5Eevigb6cyfJT5cd27zVhu92sY5isvmHUYe6NwZ` | Agent Agreement Protocol |
| **AAP V2 (Compressed)** | `Ey56W7XXaeLm2kYNt5Ewp6TfgWgpVEZ2DD23ernmfuxY` | Agent Agreement Protocol V2 |

### Known PDAs (Devnet)

| Account | Address | Seeds |
|---------|---------|-------|
| ProtocolConfig | `FDx58acvRE3K5bTe8Grb9WTCbECd9Q7GuJWKGGrffLto` | `["moltlaunch"]` |
| Authority | `EMSDrWKUBYG8xK2FtKJkbhefrp2uhX9aDGNvXJDxwTXC` | `["authority", admin_pubkey]` |
| AgentIdentity | `A37TxCUGqwckRUzUWHzzsEBsWj4HMy7gW9uQTxFhjHgp` | `["agent", wallet_pubkey]` |

---

## PDA Derivation Formulas

### MoltLaunch PDAs

All MoltLaunch PDAs are derived using `findProgramAddress` with program ID `6AZSAhq4iJTwCfGEVssoa1p3GnBqGkbcQ1iDdP1U1pSb`.

#### ProtocolConfig (Singleton)

```
seeds = ["moltlaunch"]
```

```typescript
const [configPda] = PublicKey.findProgramAddressSync(
  [Buffer.from("moltlaunch")],
  MOLTLAUNCH_PROGRAM_ID
);
```

#### Authority

```
seeds = ["authority", authority_pubkey.to_bytes()]
```

```typescript
const [authorityPda] = PublicKey.findProgramAddressSync(
  [Buffer.from("authority"), authorityPubkey.toBytes()],
  MOLTLAUNCH_PROGRAM_ID
);
```

#### AgentIdentity

```
seeds = ["agent", wallet_pubkey.to_bytes()]
```

```typescript
const [agentPda] = PublicKey.findProgramAddressSync(
  [Buffer.from("agent"), walletPubkey.toBytes()],
  MOLTLAUNCH_PROGRAM_ID
);
```

#### Attestation

```
seeds = ["attestation", agent_wallet.to_bytes(), authority_pubkey.to_bytes()]
```

```typescript
const [attestationPda] = PublicKey.findProgramAddressSync(
  [Buffer.from("attestation"), agentWallet.toBytes(), authorityPubkey.toBytes()],
  MOLTLAUNCH_PROGRAM_ID
);
```

### AAP PDAs

All AAP PDAs are derived using program ID `BzHyb5Eevigb6cyfJT5cd27zVhu92sY5isvmHUYe6NwZ`.

#### AgentIdentity (AAP)

```
seeds = ["agent", agent_key.to_bytes()]
```

#### Agreement

```
seeds = ["agreement", agreement_id_bytes]  // 16-byte UUID
```

#### AgentVault

```
seeds = ["vault", agent_identity_pda.to_bytes()]
```

---

## Trust Signal Schema

### AgentIdentity Account Layout

```rust
pub struct AgentIdentity {
    pub wallet: Pubkey,              // 32 bytes — agent's wallet
    pub infra_type: InfraType,       //  1 byte  — Unknown/Cloud/TEE/DePIN
    pub has_economic_stake: bool,    //  1 byte  — staked tokens
    pub has_hardware_binding: bool,  //  1 byte  — hardware attestation
    pub attestation_count: u8,       //  1 byte  — # active attestations
    pub is_flagged: bool,            //  1 byte  — flagged by authority
    pub trust_score: u8,             //  1 byte  — 0-100 composite score
    pub last_verified: i64,          //  8 bytes — last signal refresh
    pub nonce: u64,                  //  8 bytes — replay protection
    pub registered_at: i64,          //  8 bytes — registration timestamp
    pub name: String,                // 4+N bytes — agent name (max 32 chars)
    pub bump: u8,                    //  1 byte  — PDA bump
}
```

### InfraType Enum

| Variant | Value | Trust Bonus | Description |
|---------|-------|-------------|-------------|
| `Unknown` | 0 | +0 | No infrastructure verification |
| `Cloud` | 1 | +10 | Cloud-hosted agent (verified) |
| `TEE` | 2 | +25 | Trusted Execution Environment |
| `DePIN` | 3 | +15 | Decentralized Physical Infrastructure |

### Trust Score Computation

```
trust_score = base_score + infra_bonus + stake_bonus + hardware_bonus

Where:
  base_score       = 20 (if any active attestation)
  infra_bonus      = 0 (Unknown) | 10 (Cloud) | 25 (TEE) | 15 (DePIN)
  stake_bonus      = 10 (if has_economic_stake)
  hardware_bonus   = 15 (if has_hardware_binding)

Maximum possible: 20 + 25 + 10 + 15 = 70 (base signals)
Additional attestations can increase further.
```

---

## Financial Tier System

### Tier Qualification Criteria

| Tier | Trust Score | Attestations | Additional Requirements |
|------|-------------|--------------|------------------------|
| ⛔ Blocked | N/A | N/A | `is_flagged == true` |
| ⚪ Unverified | 0 | 0 | Default state |
| 🥉 Bronze | 1-19 | 0+ | Any trust score > 0 |
| 🥈 Silver | 20-49 | 1+ | Active attestation |
| 🥇 Gold | 50-79 | 2+ | Multiple attestations |
| 💎 Diamond | 80+ | 2+ | Hardware binding required |

### Tier-Based Financial Parameters

```
┌────────────┬─────────────┬──────────┬──────────┬──────────┬────────────┐
│    Tier    │ Flash Loan  │ Escrow % │ Credit   │ Premium  │ Settlement │
│            │   Limit     │ Required │   Line   │  (bps)   │  Priority  │
├────────────┼─────────────┼──────────┼──────────┼──────────┼────────────┤
│ ⛔ Blocked │    0 SOL    │   100%   │  0 SOL   │  10000   │  rejected  │
│ ⚪ Unverif │    0 SOL    │   100%   │  0 SOL   │   5000   │   manual   │
│ 🥉 Bronze │    1 SOL    │    80%   │  0.5 SOL │   2500   │  standard  │
│ 🥈 Silver │   10 SOL    │    50%   │  5 SOL   │   1000   │  standard  │
│ 🥇 Gold   │  100 SOL    │    25%   │  50 SOL  │    500   │ fast-track │
│ 💎 Diamond│ 1000 SOL    │    10%   │ 500 SOL  │    100   │  instant   │
└────────────┴─────────────┴──────────┴──────────┴──────────┴────────────┘
```

### Infra Type Multipliers

Parameters are further adjusted by infrastructure type:

| Infra Type | Multiplier | Effect |
|-----------|------------|--------|
| Unknown | 1.0× | No adjustment |
| Cloud | 1.0× | Standard terms |
| TEE | 1.2× | 20% better terms (higher limits, lower escrow) |
| DePIN | 1.1× | 10% better terms |

### Economic Stake Bonus

Agents with `has_economic_stake == true` receive an additional **1.15×** multiplier (15% better terms).

---

## Trust-Adjusted Parameter Tables

### Escrow Requirement by Trust Score

```
Trust Score    Base Escrow %    TEE Adjusted    Cloud Adjusted
─────────────────────────────────────────────────────────────
     0              100%            100%             100%
    10               80%             67%              80%
    20               50%             42%              50%
    30               50%             42%              50%
    50               25%             21%              25%
    80               10%              8%              10%
   100               10%              8%              10%
```

### Flash Loan Limits by Score + Infra

```
Trust Score    Unknown    Cloud     TEE      DePIN
──────────────────────────────────────────────────
     0           0         0        0         0
    10           1         1       1.2       1.1
    30          10        10       12        11
    50         100       100      120       110
    80        1000      1000     1200      1100
```

---

## Integration Patterns

### Pattern 1: Simple Trust Gate

The simplest integration — binary pass/fail based on trust score threshold.

```rust
// In your Anchor program
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct TrustGatedAction<'info> {
    /// The MoltLaunch AgentIdentity PDA — passed as an unchecked account
    /// CHECK: We manually verify the PDA derivation and read the trust_score
    #[account(
        seeds = [b"agent", agent_wallet.key().as_ref()],
        bump,
        seeds::program = moltlaunch_program.key(),
    )]
    pub moltlaunch_agent: AccountInfo<'info>,
    
    pub agent_wallet: Signer<'info>,
    
    /// CHECK: MoltLaunch program ID verification
    #[account(address = moltlaunch::ID)]
    pub moltlaunch_program: AccountInfo<'info>,
}

pub fn trust_gated_handler(ctx: Context<TrustGatedAction>) -> Result<()> {
    let agent_data = ctx.accounts.moltlaunch_agent.try_borrow_data()?;
    
    // AgentIdentity layout: 8 (discriminator) + 32 (wallet) + 1 (infra) + 
    //   1 (economic) + 1 (hardware) + 1 (attest_count) + 1 (flagged) + 1 (trust_score)
    let trust_score = agent_data[8 + 32 + 1 + 1 + 1 + 1 + 1]; // offset 45
    let is_flagged = agent_data[8 + 32 + 1 + 1 + 1 + 1]; // offset 44
    
    require!(is_flagged == 0, MyError::AgentFlagged);
    require!(trust_score >= 20, MyError::InsufficientTrust);
    
    // Proceed with trust-gated logic...
    Ok(())
}
```

**TypeScript equivalent:**

```typescript
function simpleTrustGate(trustScore: number, threshold: number): boolean {
  return trustScore >= threshold;
}

// Usage
const [agentPda] = PublicKey.findProgramAddressSync(
  [Buffer.from("agent"), walletPubkey.toBytes()],
  MOLTLAUNCH_PROGRAM_ID
);
const agent = await program.account.agentIdentity.fetch(agentPda);
if (simpleTrustGate(agent.trustScore, 20)) {
  // Agent qualifies — proceed with financial operation
}
```

### Pattern 2: Precise Multi-Signal Gate

For nuanced access control that evaluates multiple trust dimensions.

```typescript
interface TrustCriteria {
  minTrustScore?: number;
  requiredInfra?: string[];      // ["Cloud", "TEE"]
  minAttestations?: number;
  requireEconomicStake?: boolean;
  requireHardwareBinding?: boolean;
  maxVerificationAgeDays?: number;
}

function preciseTrustGate(agent: AgentIdentity, criteria: TrustCriteria): boolean {
  if (criteria.minTrustScore && agent.trustScore < criteria.minTrustScore) return false;
  if (criteria.requiredInfra && !criteria.requiredInfra.includes(agent.infraType)) return false;
  if (criteria.minAttestations && agent.attestationCount < criteria.minAttestations) return false;
  if (criteria.requireEconomicStake && !agent.hasEconomicStake) return false;
  if (criteria.requireHardwareBinding && !agent.hasHardwareBinding) return false;
  if (criteria.maxVerificationAgeDays) {
    const ageDays = (Date.now() / 1000 - agent.lastVerified) / 86400;
    if (ageDays > criteria.maxVerificationAgeDays) return false;
  }
  return true;
}

// Usage: High-value operations require TEE or DePIN + economic stake
const highValueCriteria: TrustCriteria = {
  minTrustScore: 50,
  requiredInfra: ["TEE", "DePIN"],
  minAttestations: 2,
  requireEconomicStake: true,
  maxVerificationAgeDays: 7,
};
```

### Pattern 3: Trust-Adjusted Parameters

Dynamically compute financial parameters from trust signals.

```typescript
function computeEscrowRequirement(trustScore: number, infraType: string, baseAmount: number): number {
  // Tier-based escrow percentage
  let escrowPct: number;
  if (trustScore >= 80) escrowPct = 10;
  else if (trustScore >= 50) escrowPct = 25;
  else if (trustScore >= 20) escrowPct = 50;
  else if (trustScore > 0) escrowPct = 80;
  else escrowPct = 100;
  
  // Infra multiplier reduces escrow further
  let infraMultiplier = 1.0;
  if (infraType === "TEE") infraMultiplier = 1.2;
  else if (infraType === "DePIN") infraMultiplier = 1.1;
  
  // Apply: higher multiplier → lower escrow requirement
  const adjustedPct = Math.max(5, Math.round(escrowPct / infraMultiplier));
  
  return baseAmount * (adjustedPct / 100);
}
```

---

## Step-by-Step Integration Guide

### For Any Solana Program Wanting to Read MoltLaunch Trust Signals

#### Step 1: Add MoltLaunch Program ID

```rust
// In your lib.rs or constants
pub const MOLTLAUNCH_PROGRAM: Pubkey = pubkey!("6AZSAhq4iJTwCfGEVssoa1p3GnBqGkbcQ1iDdP1U1pSb");
```

#### Step 2: Accept AgentIdentity as an Account

```rust
#[derive(Accounts)]
pub struct MyInstruction<'info> {
    /// CHECK: Cross-program account — we verify PDA derivation
    #[account(
        seeds = [b"agent", agent_wallet.key().as_ref()],
        seeds::program = MOLTLAUNCH_PROGRAM,
        bump,
    )]
    pub moltlaunch_agent: AccountInfo<'info>,
    
    pub agent_wallet: Signer<'info>,
}
```

#### Step 3: Read Trust Signals

```rust
pub fn handler(ctx: Context<MyInstruction>) -> Result<()> {
    let data = ctx.accounts.moltlaunch_agent.try_borrow_data()?;
    
    // Verify discriminator (AgentIdentity: [11, 149, 31, 27, 186, 76, 241, 72])
    let expected_disc: [u8; 8] = [11, 149, 31, 27, 186, 76, 241, 72];
    require!(data[..8] == expected_disc, MyError::InvalidAccount);
    
    // Read fields
    let infra_type = data[40];        // offset 8+32
    let has_economic_stake = data[41]; // bool
    let has_hardware_binding = data[42]; // bool
    let attestation_count = data[43];
    let is_flagged = data[44];
    let trust_score = data[45];
    
    // Use trust signals for your logic
    msg!("Agent trust_score: {}, infra: {}", trust_score, infra_type);
    
    Ok(())
}
```

#### Step 4: Compute Financial Parameters

Use the trust score to gate operations, adjust collateral, set limits, etc.

```rust
let flash_loan_limit = match trust_score {
    80..=100 => 1000 * LAMPORTS_PER_SOL,
    50..=79  => 100 * LAMPORTS_PER_SOL,
    20..=49  => 10 * LAMPORTS_PER_SOL,
    1..=19   => 1 * LAMPORTS_PER_SOL,
    _        => 0,
};
```

### For TypeScript Clients

```typescript
import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";

const MOLTLAUNCH_PROGRAM_ID = new PublicKey("6AZSAhq4iJTwCfGEVssoa1p3GnBqGkbcQ1iDdP1U1pSb");

// 1. Load the IDL
const idl = require("./moltlaunch.json"); // or fetch from devnet
const program = new anchor.Program(idl, provider);

// 2. Derive PDA for any agent
const [agentPda] = PublicKey.findProgramAddressSync(
  [Buffer.from("agent"), agentWallet.toBytes()],
  MOLTLAUNCH_PROGRAM_ID
);

// 3. Fetch trust signals
const agent = await program.account.agentIdentity.fetch(agentPda);

// 4. Use signals
console.log({
  trustScore: agent.trustScore,
  infraType: agent.infraType,
  attestationCount: agent.attestationCount,
  isFlagged: agent.isFlagged,
});
```

---

## Composable Flow Walkthrough

### The Complete 5-Step Financial Flow

```
Step 1: Trust-Gated Registration
  ┌──────────────────────────────────────────────────────────┐
  │  Agent registers on MoltLaunch                            │
  │  → AgentIdentity PDA created                              │
  │  → Initial trust_score = 0 (Unknown infra)                │
  │  → Authorities attest (Cloud/TEE/DePIN signals)           │
  │  → trust_score computed: 20 (base) + infra_bonus          │
  └──────────────────────────────────────────────────────────┘
                              │
                              ▼
Step 2: Financial Profile Computation
  ┌──────────────────────────────────────────────────────────┐
  │  Consumer reads AgentIdentity PDA                         │
  │  → Determines tier: Silver (score=30, 1 attestation)      │
  │  → Computes:                                               │
  │    • Flash loan limit: 10 SOL                              │
  │    • Escrow required: 50%                                  │
  │    • Credit line: 5 SOL                                    │
  │    • Insurance premium: 1000 bps (10%)                     │
  └──────────────────────────────────────────────────────────┘
                              │
                              ▼
Step 3: Trust-Adjusted Agreement
  ┌──────────────────────────────────────────────────────────┐
  │  Consumer CPIs into AAP                                    │
  │  → propose_agreement with trust-adjusted escrow            │
  │  → Base escrow: 10 SOL → Adjusted: 5 SOL (50% Silver)    │
  │  → add_party (counterparty)                                │
  │  → Both parties sign_agreement                             │
  │  → deposit_to_vault (adjusted amount)                      │
  └──────────────────────────────────────────────────────────┘
                              │
                              ▼
Step 4: BlinkGuard Simulation
  ┌──────────────────────────────────────────────────────────┐
  │  Before executing, simulate transaction                    │
  │  → Check balance deltas against trust-adjusted bounds      │
  │  → Verify no rent-exempt violations                        │
  │  → Ensure escrow doesn't exceed max agreement value        │
  │  → Green light → execute transaction                       │
  └──────────────────────────────────────────────────────────┘
                              │
                              ▼
Step 5: Settlement & Reputation Update
  ┌──────────────────────────────────────────────────────────┐
  │  Agreement fulfilled successfully                          │
  │  → AAP.fulfill_agreement                                   │
  │  → Authority submits General attestation to MoltLaunch     │
  │  → MoltLaunch.refresh_identity_signals                     │
  │  → trust_score increases                                   │
  │  → Next agreement: lower escrow, higher limits             │
  └──────────────────────────────────────────────────────────┘
```

### Transaction Structure (Single Atomic TX)

```
Transaction {
  instructions: [
    // ix[0]: Ensure fresh trust signals
    MoltLaunch.refresh_identity_signals {
      config: [PDA "moltlaunch"],
      agent: [PDA "agent", wallet],
      remaining_accounts: [attestation_pdas...],
    },

    // ix[1]: Create agreement with trust-adjusted escrow
    AAP.propose_agreement {
      agreement_id: [16-byte UUID],
      agreement_type: ServiceLevel,
      terms_hash: SHA256(terms_json),
      num_parties: 2,
      expires_at: now + 7 days,
    },

    // ix[2]: Deposit trust-adjusted escrow
    AAP.deposit_to_vault {
      amount: base_escrow * (escrow_pct / 100),
    },
  ],
  signers: [agent_wallet],
}
```

---

## BlinkGuard Transaction Simulation

### Concept

BlinkGuard simulates transactions before execution, checking that balance deltas stay within trust-adjusted bounds.

### Delta Bounds Formula

```
max_allowed_outflow = BASE_LIMIT × (1 + trust_score/100 × SCALE_FACTOR)

Where:
  BASE_LIMIT    = 10 SOL (minimum for any agent)
  SCALE_FACTOR  = 9 (so max range is 10 SOL to 100 SOL)

Examples:
  trust_score = 0   → max outflow = 10 SOL
  trust_score = 30  → max outflow = 37 SOL
  trust_score = 50  → max outflow = 55 SOL
  trust_score = 100 → max outflow = 100 SOL
```

### Safety Checks

| Check | Condition | Action |
|-------|-----------|--------|
| Rent-exempt | Post-balance ≥ 0.001 SOL | Block if violated |
| High-risk | Escrow > 90% of balance | Warn |
| Low trust | trust_score < 20 | Require additional verification |
| Flagged agent | is_flagged == true | Block completely |
| Expired verification | last_verified > 30 days | Require refresh |

---

## Running the Demo

### Prerequisites

```bash
# Ensure you're in the moltlaunch directory
cd ~/moltbot-trial/products/launchpad/moltlaunch

# Install dependencies (if not already)
npm install
```

### Run the Demo

```bash
npx ts-node scripts/composable-demo.ts
```

### Expected Output

The demo will:
1. Connect to Solana devnet
2. Read **live** AgentIdentity data from the on-chain PDA
3. Compute trust-adjusted financial parameters
4. Demonstrate both simple and precise trust gates
5. Build a simulated AAP agreement with trust-adjusted escrow
6. Run a BlinkGuard transaction simulation
7. Show the post-settlement reputation update path

### Example Output Snippet

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                    COMPOSABLE FINANCE DEMO                                  ║
╚══════════════════════════════════════════════════════════════════════════════╝

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  STEP 1: TRUST-GATED AGENT REGISTRATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  📡 Reading MoltLaunch AgentIdentity from devnet...

    Agent Name:               moltlaunch-agent
    Trust Score:              30/100
    Infra Type:               Cloud
    Attestation Count:        1
    ...
```

---

## Appendix: Account Discriminators

For raw byte-level cross-program reads, use these discriminators to verify account types:

| Account | Discriminator (bytes) |
|---------|----------------------|
| AgentIdentity | `[11, 149, 31, 27, 186, 76, 241, 72]` |
| Attestation | `[152, 125, 183, 86, 36, 146, 121, 73]` |
| Authority | `[36, 108, 254, 18, 167, 144, 27, 36]` |
| ProtocolConfig | `[207, 91, 250, 28, 152, 179, 215, 209]` |

### AgentIdentity Byte Offsets

For direct byte-level reads (no IDL/deserialization needed):

```
Offset  Size  Field
──────  ────  ─────────────────────
  0      8    Discriminator
  8     32    wallet (Pubkey)
 40      1    infra_type (enum: 0=Unknown, 1=Cloud, 2=TEE, 3=DePIN)
 41      1    has_economic_stake (bool)
 42      1    has_hardware_binding (bool)
 43      1    attestation_count (u8)
 44      1    is_flagged (bool)
 45      1    trust_score (u8)
 46      8    last_verified (i64, little-endian)
 54      8    nonce (u64, little-endian)
 62      8    registered_at (i64, little-endian)
 70      4    name length (u32, little-endian)
 74      N    name bytes (UTF-8)
 74+N    1    bump (u8)
```

---

## License

MIT — Part of the MoltLaunch composable identity stack.
