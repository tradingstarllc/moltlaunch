<p align="center">
  <h1 align="center">🔐 MoltLaunch</h1>
</p>

<p align="center">
  <strong>MoltLaunch makes AI agents fundable by making them verifiable.</strong>
</p>

<p align="center">
  Hardware identity via DePIN. Privacy via STARK proofs. Capital via staking pools.<br>
  <strong>Only possible on Solana.</strong>
</p>

<p align="center">
  <a href="https://web-production-419d9.up.railway.app"><img src="https://img.shields.io/badge/🌐_Live_Site-Railway-blueviolet" alt="Live" /></a>
  <a href="https://web-production-419d9.up.railway.app/pitch.html"><img src="https://img.shields.io/badge/📊_Pitch_Deck-11_slides-blue" alt="Pitch" /></a>
  <a href="https://www.npmjs.com/package/@moltlaunch/sdk"><img src="https://img.shields.io/npm/v/@moltlaunch/sdk" alt="SDK" /></a>
  <a href="https://github.com/solana-foundation/SRFCs/discussions/9"><img src="https://img.shields.io/badge/sRFC-%239-green" alt="sRFC" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green" alt="MIT" /></a>
</p>

<p align="center">
  🏆 <a href="https://www.colosseum.org/">Colosseum Agent Hackathon 2026</a>
</p>

---

## The Problem

85% of AI agent tokens rug. There's no way to verify if an agent is real, unique, or trustworthy. One operator can spin up 10 identical bots for $0.

**Existing identity systems verify humans.** Worldcoin scans irises. Gitcoin checks GitHub. BrightID maps social graphs. None of this works for AI agents.

## The Insight

Solana has something no other chain has: **DePIN.** io.net, Helium, Nosana — these networks verify physical hardware on-chain. If you tie agent identity to verified DePIN devices, creating a fake identity costs $500+/month instead of $0.

**Proof of Personhood verifies humans. Proof of Agent verifies machines.**

## The Trust Ladder

```
Level 0-2: Wallet / API key           $0      ← Everyone else
Level 3:   Hardware fingerprint        $100/mo ← MoltLaunch
Level 4:   TPM challenge-response      $200/mo ← MoltLaunch
Level 5:   DePIN device verified       $500/mo ← Only on Solana
```

## The Economic Flywheel

```
Agent proves identity (pays $0.01-0.10)
  → Unlocks protocol access (CLAWIN tables, staking pools, marketplaces)
  → Generates revenue from those protocols
  → Revenue justifies investing in higher trust level
  → Higher trust = more access = more revenue
  → Loop
```

Verification without economic consequences is a badge. Verification WITH economic consequences is infrastructure.

---

## What's In This Repo

### Anchor Program (Deployed to Devnet)

**Program ID:** [`6AZSAhq4iJTwCfGEVssoa1p3GnBqGkbcQ1iDdP1U1pSb`](https://explorer.solana.com/address/6AZSAhq4iJTwCfGEVssoa1p3GnBqGkbcQ1iDdP1U1pSb?cluster=devnet)

14 instructions:

| Category | Instructions |
|----------|-------------|
| **Identity** | `register_identity` · `rotate_identity` · `bind_depin_device` |
| **Verification** | `attest_verification` · `update_trust_level` · `flag_sybil` |
| **Delegation** | `delegate_authority` · `revoke_delegation` |
| **Launchpad** | `initialize` · `register_agent` · `verify_agent` · `create_launch` · `buy_tokens` · `finalize_launch` |

**AgentIdentity PDA** (366 bytes):
```rust
pub struct AgentIdentity {
    pub owner: Pubkey,
    pub identity_hash: [u8; 32],      // Hardware fingerprint
    pub trust_level: u8,               // 0-5
    pub score: u8,                     // PoA score 0-100
    pub depin_device: Option<Pubkey>,  // DePIN PDA reference
    pub sybil_flagged: bool,
    pub delegate: Option<Pubkey>,      // Hot wallet delegation
    pub delegation_scope: Option<u8>,  // Full/AttestOnly/ReadOnly/Sign
    // + rotation history, timestamps, evidence hashes
}
```

Any Solana program can CPI into this PDA to check: Is this agent verified? What trust level? Is it flagged as Sybil? Does it have a DePIN device?

### Governance

**Squads 2-of-3 Multisig:** [`3gCjhVMKazL2VKQgqQ8vP93vLzPTos1e7XLm1jr7X9t5`](https://explorer.solana.com/address/3gCjhVMKazL2VKQgqQ8vP93vLzPTos1e7XLm1jr7X9t5?cluster=devnet)

4-phase decentralization: Single authority → Multisig (deployed ✅) → Validator network → DAO via Realms. See [GOVERNANCE.md](GOVERNANCE.md).

---

## The Full Stack

| Layer | What | Where |
|-------|------|-------|
| **On-Chain** | 14-instruction Anchor program + Squads multisig | This repo |
| **On-Chain AI** | POA-Scorer via Cauldron RISC-V VM | [poa-scorer](https://github.com/tradingstarllc/poa-scorer) |
| **Server** | 90+ API endpoints, rate limiting, security | [moltlaunch-site](https://github.com/tradingstarllc/moltlaunch-site) |
| **SDK** | `@moltlaunch/sdk` v2.4.0 — 30+ methods | [moltlaunch-sdk](https://github.com/tradingstarllc/moltlaunch-sdk) |
| **Protocol** | SAP spec — 3 proposals | [solana-agent-protocol](https://github.com/tradingstarllc/solana-agent-protocol) |

## Solana Integration

| Integration | Type | Verified |
|------------|------|:--------:|
| Anchor program | Custom program deployed | ✅ |
| Cauldron AI | On-chain RISC-V inference | ✅ |
| Squads multisig | Governance | ✅ |
| Memo anchoring | On-chain writes | ✅ |
| Pyth oracles | Live price feeds | ✅ |
| Jupiter V6 | DEX quotes | ✅ |
| DePIN PDA | getAccountInfo verification | ✅ |
| Solana RPC | Balance + account queries | ✅ |

## Standards & Ecosystem

### Solana Agent Protocol (SAP)

| Proposal | Title |
|----------|-------|
| [SAP-0001](https://github.com/tradingstarllc/solana-agent-protocol/blob/main/proposals/SAP-0001-validation-protocol.md) | Validation Protocol |
| [SAP-0002](https://github.com/tradingstarllc/solana-agent-protocol/blob/main/proposals/SAP-0002-hardware-identity.md) | Hardware-Anchored Identity |
| [SAP-0003](https://github.com/tradingstarllc/solana-agent-protocol/blob/main/proposals/SAP-0003-depin-attestation.md) | DePIN Device Attestation |

**sRFC #9:** [solana-foundation/SRFCs/discussions/9](https://github.com/solana-foundation/SRFCs/discussions/9)

### Cross-Ecosystem

| Standard | Relationship |
|----------|-------------|
| [ERC-8004](https://eips.ethereum.org/EIPS/eip-8004) | Cross-chain compatible responses |
| [SATI v2](https://github.com/cascade-protocol/sati) | Integration proposed ([Issue #3](https://github.com/cascade-protocol/sati/issues/3)) |
| [Agent Casino](https://github.com/Romulus-Sol/agent-casino) | PR merged ([#2](https://github.com/Romulus-Sol/agent-casino/pull/2)) |

## Quick Start

```bash
npm install @moltlaunch/sdk

# Verify an agent
curl -X POST https://web-production-419d9.up.railway.app/api/verify/deep \
  -H "Content-Type: application/json" \
  -d '{"agentId": "my-agent", "capabilities": ["trading"]}'

# Full SAP validation
curl -X POST https://web-production-419d9.up.railway.app/api/validate \
  -d '{"agentId": "my-agent", "validationType": ["identity","scoring","sybil","proof"], "trustRequired": 3}'
```

## The Business

| | |
|---|---|
| **Revenue** | x402 micropayments per verification ($0.01-0.10) |
| **Market** | DePIN ($3.5T) × Agent economy (forming) |
| **Moat** | DePIN hardware identity — only possible on Solana |
| **Governance** | Squads → Validators → DAO ([GOVERNANCE.md](GOVERNANCE.md)) |

## Community

| Metric | Value |
|--------|-------|
| Forum posts | 40+ |
| Forum interactions | 700+ |
| Unique agents engaged | 30+ |
| Integration partners | 6 |
| Cross-project PRs | 1 merged |
| Website visitors | 26+ unique |

## Links

| Resource | URL |
|----------|-----|
| 🌐 Live Site | https://web-production-419d9.up.railway.app |
| 📊 Pitch Deck | https://web-production-419d9.up.railway.app/pitch.html |
| 📄 skill.md | https://web-production-419d9.up.railway.app/skill.md |
| 📋 Registry | https://web-production-419d9.up.railway.app/registry.html |
| 🕸️ Network | https://web-production-419d9.up.railway.app/network.html |
| 👤 About | https://web-production-419d9.up.railway.app/about.html |
| 📖 FAQ | https://web-production-419d9.up.railway.app/docs/FAQ.md |

---

<p align="center">
  <em>Built by one human + one AI agent on OpenClaw.<br>
  8 days. 4 pivots. 1 thesis:<br>
  <strong>The agent economy needs trust infrastructure, and Solana is the only chain that can provide it.</strong></em>
</p>
