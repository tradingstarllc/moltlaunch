# MoltLaunch Governance Roadmap

**From Central Authority to Decentralized Validation**

---

## Current State

MoltLaunch attestation authority is a single keypair. Our server signs all trust level changes, verification scores, and Sybil flags. This is acceptable for hackathon but unacceptable for production — trust infrastructure that requires trusting one entity isn't trustless.

## The 4-Phase Plan

### Phase 1: Single Authority (Current — Hackathon)

```
MoltLaunch server keypair → signs all attestations
Single point of failure + trust
Acceptable for: devnet testing, hackathon demo
```

**Status:** ✅ Active

---

### Phase 2: Squads Multisig (Month 1)

```
2-of-3 Squads multisig → attestation requires 2 signatures
No single entity can unilaterally attest or flag

Deployed on devnet:
  Multisig PDA: 3gCjhVMKazL2VKQgqQ8vP93vLzPTos1e7XLm1jr7X9t5
  Vault PDA:    5CuB4zNmVAn9uZy9961vDSrhCgT3QKyPYL8mYRY74JGv
  TX: 3bekr9wZEE26Mmci3eZSgVb81tTuwS2GHTD4X5mpdKFJ267R5MxdMDdhErA4ZHMgdMEq1CrX6K1i5aDQFXGrwY2N
  Network: Solana Devnet
  Created: 2026-02-09
```

**Members:**

| Slot | Role | Key | Status |
|------|------|-----|--------|
| 1 | MoltLaunch | `3WAE2DGvGHH6ZnPQdEJnkTktpoBNr4ci6HeecVmisNw8` | ✅ Active |
| 2 | Partner (placeholder) | `HsgXKA2CbEFMwMQtPPxw55ywmVsaVJXHz7uKm1HJwqTV` | 🔗 Open |
| 3 | Partner (placeholder) | `GTvgGQtUxqpbR6ofiode5Uvt94CsZpsUWqAKC7ysjn5J` | 🔗 Open |

**Candidate partners for multisig seats:**
- SATI / Cascade Protocol (identity standard — complementary architecture)
- SlotScribe (execution receipts — trace verification)
- Agent Casino / Claude-the-Romulan (first merged integration)
- AutoVault / opus-builder (behavioral identity)
- AAP / kurtloopfo (agent agreements)
- Community representative

**How to claim a seat:**
1. Partner provides their Solana public key
2. We call `multisigAddMember` on the Squads vault
3. Attestations now require their co-signature

**What the multisig controls:**
- `attest_verification()` — Writing PoA scores on-chain
- `flag_sybil()` — Marking identities as Sybil
- `update_trust_level()` — Changing trust levels (when authority-signed)

**What the multisig does NOT control:**
- `register_identity()` — Permissionless (anyone can register)
- `bind_depin_device()` — Owner-signed (agent binds their own device)
- `update_trust_level()` — Owner-signed variant (agent updates their own level with evidence)

**Status:** ✅ Deployed on devnet. Awaiting partner keys.

---

### Phase 3: Validator Network (Month 3)

```
4-5 independent validators
Each runs the PoA scoring model independently
Consensus determines attestation

Architecture:
┌──────────────────────────────────────────────────┐
│              Validator Network                    │
├──────────────────────────────────────────────────┤
│                                                  │
│  Validator 1 (MoltLaunch)  → scores → signs     │
│  Validator 2 (SATI)        → scores → signs     │
│  Validator 3 (SlotScribe)  → scores → signs     │
│  Validator 4 (Community)   → scores → signs     │
│  Validator 5 (Community)   → scores → signs     │
│                                                  │
│  Consensus: 3-of-5 agree on score ± 5 points    │
│  → Attestation written to AgentIdentity PDA      │
│                                                  │
└──────────────────────────────────────────────────┘
```

**Validator economics:**
- Stake: 100+ SOL per validator (slashable)
- Revenue: Share of x402 verification fees
- Slashing: Disagree with consensus >20% of the time → lose stake
- Rotation: New validators can join by staking + passing probation period

**Verification flow:**
1. Agent submits verification request via API
2. Request broadcast to all validators
3. Each validator independently runs scoring model
4. Scores collected and compared
5. If 3-of-5 agree within ±5 points → consensus score
6. Consensus score written to AgentIdentity PDA
7. Validators that agreed split the x402 fee
8. Validators that disagreed get warning (3 warnings → slashing review)

**Infrastructure needed:**
- Validator registration program (stake + commit)
- Score aggregation program (collect + consensus)
- Slashing program (evidence + penalty)
- Validator dashboard (status + earnings)

**Status:** 📋 Planned. Requires Phase 2 stability first.

---

### Phase 4: DAO Governance via Realms (Month 6+)

```
DAO governs the RULES. Validators execute the RULES.

DAO controls:
├── Scoring weights
│   "How much is GitHub worth? (+15 or +20?)"
│   Voted on by MOLT holders
│
├── Trust level thresholds
│   "What hardware attestation earns Level 4?"
│   Voted on by validators + MOLT holders
│
├── Validator admission
│   "Who can become a validator?"
│   Minimum stake, probation period, admission vote
│
├── Fee structure
│   "What does Level 3 verification cost?"
│   Adjusted based on demand
│
├── DePIN provider whitelist
│   "Which DePIN networks count for Level 5?"
│   io.net, Helium, Nosana — who's in, who's out
│
└── Slashing parameters
    "How much for a bad attestation?"
    Severity levels, appeal process

DAO does NOT control:
├── Individual verification results
│   (validators do this via consensus)
│
├── Identity registration
│   (permissionless — anyone can register)
│
└── Sybil flagging
    (evidence-based, not political)
```

**Realms setup:**
- Governance program: SPL Governance (Realms)
- Token: MOLT (governance + utility)
- Voting: Token-weighted with delegation
- Proposals: 3-day voting period, 5% quorum
- Timelock: 24-hour delay on passed proposals

**MOLT token utility:**

| Use | Description |
|-----|-------------|
| Stake to validate | Earn verification fees |
| Vote on proposals | Govern protocol parameters |
| Earn from pools | Staking pool profit sharing |
| Pay for verification | x402 denominated in MOLT (optional) |

**What MOLT is NOT:**
- Not pay-to-play trust (buying tokens doesn't increase your trust level)
- Not governance theater (token only governs protocol rules, not individual results)
- Not a speculative asset (utility-first design)

**Status:** 📋 Future. Requires validator network to be stable first.

---

## Transition Checkpoints

| Transition | Trigger | Requirements |
|-----------|---------|-------------|
| Phase 1 → 2 | Partner key received | At least 1 real partner joins multisig |
| Phase 2 → 3 | 3+ months stable | Validator program deployed, 3+ staked validators |
| Phase 3 → 4 | 6+ months stable | MOLT token launched, Realms DAO created, validator set mature |

**Principle:** Each phase must be stable for at least the duration of the previous phase before transitioning. Don't rush decentralization — bad governance is worse than centralized competence.

---

## Squads Integration Details

### SDK: @sqds/multisig

```typescript
import { getMultisigPda, getVaultPda, transactions } from "@sqds/multisig";

// Our multisig
const [multisigPda] = getMultisigPda({ createKey: new PublicKey("...") });
// → 3gCjhVMKazL2VKQgqQ8vP93vLzPTos1e7XLm1jr7X9t5

// Vault for holding program authority
const [vaultPda] = getVaultPda({ multisigPda, index: 0 });
// → 5CuB4zNmVAn9uZy9961vDSrhCgT3QKyPYL8mYRY74JGv
```

### Adding a Partner

```typescript
// Transfer placeholder key to real partner
const addMemberTx = transactions.multisigAddMember({
    multisigPda,
    configAuthority: currentAuthority,
    member: { key: partnerPubkey, permissions: { mask: 7 } }, // All permissions
});
```

### Attestation Flow (Phase 2)

```
1. Server generates attestation
2. Server creates proposal on Squads
3. Member 1 approves (our server)
4. Member 2 approves (partner)
5. Proposal executes → PDA updated
```

---

## Related Documents

- [Anchor Program](programs/moltlaunch/src/lib.rs) — AgentIdentity PDA + instructions
- [SAP Spec](https://github.com/tradingstarllc/solana-agent-protocol) — Protocol proposals
- [sRFC #9](https://github.com/solana-foundation/SRFCs/discussions/9) — Solana Foundation discussion
- [SATI Integration](https://github.com/cascade-protocol/sati/issues/3) — Proposed integration with SATI v2
- [Multisig Data](../moltlaunch-site/data/multisig.json) — Deployed multisig details

---

*"The goal is to make MoltLaunch one validator among many — not the authority, just a participant."*
