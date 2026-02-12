<p align="center">
  <h1 align="center">🔐 MoltLaunch V3</h1>
</p>

<p align="center">
  <strong>Composable Signal Architecture for AI Agent Identity on Solana</strong>
</p>

<p align="center">
  Multiple authorities. Composable attestation signals. Permissionless trust score derivation.<br>
  <strong>Only possible on Solana.</strong>
</p>

<p align="center">
  <a href="https://youragent.id"><img src="https://img.shields.io/badge/🌐_Live_Site-Railway-blueviolet" alt="Live" /></a>
  <a href="https://youragent.id/pitch.html"><img src="https://img.shields.io/badge/📊_Pitch_Deck-11_slides-blue" alt="Pitch" /></a>
  <a href="https://www.npmjs.com/package/@moltlaunch/sdk"><img src="https://img.shields.io/npm/v/@moltlaunch/sdk" alt="SDK" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green" alt="MIT" /></a>
</p>

---

## V3 Architecture

MoltLaunch V3 replaces the monolithic launchpad+identity design with a **Composable Signal Architecture**: a minimal on-chain primitive where independent authorities contribute attestation signals to agent identities, and trust scores are derived permissionlessly from those signals.

### Design Principles

1. **Composable** — Each attestation is an independent signal. Authorities don't need to coordinate.
2. **Permissionless trust** — Anyone can call `refresh_identity_signals` to recalculate an agent's trust score.
3. **Minimal on-chain state** — 4 PDAs, 9 instructions. No SPL tokens, no bonding curves, no launchpad.
4. **Revocation-aware** — A global `revocation_nonce` tracks authority removals and attestation revocations. Stale agents can be detected by comparing their local nonce to the global one.

---

## On-Chain Program

**Program ID:** [`6AZSAhq4iJTwCfGEVssoa1p3GnBqGkbcQ1iDdP1U1pSb`](https://explorer.solana.com/address/6AZSAhq4iJTwCfGEVssoa1p3GnBqGkbcQ1iDdP1U1pSb?cluster=devnet)

### 4 PDAs

| PDA | Seeds | Purpose |
|-----|-------|---------|
| **ProtocolConfig** | `["moltlaunch"]` | Singleton config: admin, global nonce, counters, pause flag |
| **Authority** | `["authority", pubkey]` | One per authorized verifier. Tracks type, activity, attestation count |
| **AgentIdentity** | `["agent", wallet]` | One per agent. The composable signal hub — all signals aggregated here |
| **Attestation** | `["attestation", agent, authority]` | One per (agent, authority) pair. Records the signal contributed |

### 9 Instructions

| # | Instruction | Who | What |
|---|------------|-----|------|
| 1 | `initialize` | Admin | Create ProtocolConfig singleton |
| 2 | `add_authority` | Admin | Register a new verification authority |
| 3 | `remove_authority` | Admin | Deactivate an authority, bump revocation nonce |
| 4 | `register_agent` | Anyone | Create an AgentIdentity PDA (all signals default/false) |
| 5 | `submit_attestation` | Authority | Create Attestation, update agent's signal flags |
| 6 | `revoke_attestation` | Authority | Revoke own attestation, bump revocation nonce |
| 7 | `flag_agent` | Authority | Flag an agent (trust score → 0) |
| 8 | `unflag_agent` | Admin | Clear the flag on an agent |
| 9 | `refresh_identity_signals` | **Anyone** | Recalculate trust score from signals, sync nonce |

### Trust Score Derivation

Trust scores are derived **deterministically** from on-chain signals. No oracle, no off-chain computation.

```
score = 0
if attestation_count >= 1:  +20
if infra_type == Cloud:     +10
if infra_type == TEE:       +25
if infra_type == DePIN:     +35
if has_economic_stake:      +25
if has_hardware_binding:    +20
if is_flagged:              score = 0

Maximum possible: 100 (DePIN + economic stake + hardware binding + attestation)
```

### Signal Types

| Signal | Effect on AgentIdentity |
|--------|------------------------|
| `InfraCloud` | Sets `infra_type = Cloud` |
| `InfraTEE` | Sets `infra_type = TEE` |
| `InfraDePIN` | Sets `infra_type = DePIN` |
| `EconomicStake` | Sets `has_economic_stake = true` |
| `HardwareBinding` | Sets `has_hardware_binding = true` |
| `General` | Increments attestation count only |

### Authority Types

| Type | Use Case |
|------|----------|
| `Single` | Individual verifier (e.g., the admin) |
| `MultisigMember` | Member of a Squads multisig |
| `OracleOperator` | Automated oracle (Switchboard, etc.) |
| `NCNValidator` | Jito (re)staking NCN validator |

### Events

All state transitions emit events for off-chain indexing:

- `AgentRegistered { wallet, name }`
- `AttestationSubmitted { agent, authority, signal_type }`
- `AttestationRevoked { agent, authority }`
- `AgentFlagged { agent, authority, reason_hash }`
- `AgentUnflagged { agent }`
- `TrustScoreRefreshed { agent, old_score, new_score }`
- `AuthorityAdded { authority, authority_type }`
- `AuthorityRemoved { authority }`

---

## How It Works

```
1. Admin deploys and calls `initialize`
2. Admin adds authorities via `add_authority` (oracles, validators, multisig members)
3. Agents register themselves via `register_agent`
4. Authorities submit attestations for agents via `submit_attestation`
   → Each attestation sets a signal flag on the AgentIdentity
5. Anyone calls `refresh_identity_signals` to recalculate trust score
6. Other protocols CPI into AgentIdentity to check trust_score, is_flagged, etc.
```

### Example Flow

```
Agent "sentinel-7" registers → trust_score = 0
OracleOperator attests InfraTEE → infra_type = TEE, attestation_count = 1
NCNValidator attests EconomicStake → has_economic_stake = true
Anyone calls refresh → trust_score = 20 + 25 + 25 = 70
```

---

## Build

```bash
# Prerequisites: Rust, Solana CLI, Anchor CLI

# Build
cd products/launchpad/moltlaunch
anchor build

# Test
anchor test

# Deploy (devnet)
anchor deploy --provider.cluster devnet
```

## Project Structure

```
programs/moltlaunch/src/lib.rs   # The entire program (4 PDAs, 9 instructions)
Anchor.toml                       # Anchor config (devnet)
Cargo.toml                        # Workspace config
```

---

## Migration from V2

V3 is a clean-break rewrite. The old launchpad (bonding curves, token launches, buy_tokens) and legacy SAP identity (trust levels 0-5, DePIN binding, Sybil flagging, delegation) have been removed entirely.

**What changed:**
- ❌ Removed: `LaunchpadConfig`, `Launch`, `Agent`, bonding curves, SPL token minting
- ❌ Removed: Legacy `AgentIdentity` (trust levels, delegation, rotation)
- ✅ Added: `ProtocolConfig` singleton with global revocation nonce
- ✅ Added: `Authority` PDA for multi-authority verification
- ✅ Added: `Attestation` PDA for composable signal contributions
- ✅ Redesigned: `AgentIdentity` as a signal hub with derived trust scores
- ✅ Added: Permissionless `refresh_identity_signals` for trust recalculation

**Same program ID**, new architecture. Redeploy required.

---

<p align="center">
  <em>Built for the Solana agent economy.<br>
  <strong>Trust infrastructure that composes.</strong></em>
</p>
