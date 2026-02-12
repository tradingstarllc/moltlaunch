# MoltLaunch — Trust Infrastructure for AI Agents

## Description
Composable trust signals for AI agents on Solana. Provides verifiable attributes (infrastructure type, economic stake, hardware binding) that protocols read to make their own access decisions. Built as a SAS (Solana Attestation Service) issuer — verification engine runs infrastructure checks off-chain, writes standardized attestations on-chain.

## When to Use
- Agent needs to prove it runs on real infrastructure (not a throwaway VPS)
- Protocol needs to gate access by agent trust level (DeFi, marketplaces, DAOs)
- Need Sybil-resistant agent verification (making fake agents expensive)
- Want composable trust signals other protocols can read via CPI or SAS
- Building agent-to-agent interactions that require mutual trust verification

## Core Signals (V3 Architecture)
MoltLaunch does not provide a single trust score. It provides raw, composable signals:

- **infra_type**: Unknown | Cloud | TEE | DePIN — verified infrastructure tier
- **has_economic_stake**: bool — agent has SOL/tokens at risk
- **has_hardware_binding**: bool — agent runs on attested hardware (TPM/SGX)
- **attestation_count**: u8 — number of independent authorities that vouched
- **is_flagged**: bool — emergency revocation flag
- **trust_score**: u8 (0-100) — derived convenience score for simple integrations
- **last_verified**: i64 — freshness timestamp

## API Usage

### Self-Verify Service
```bash
# Register an agent (L0)
curl -X POST https://proveyour.id/api/self-verify \
  -H "Content-Type: application/json" \
  -d '{ "agentId": "YOUR-AGENT-NAME", "acceptTerms": true, "name": "Your Agent" }'

# Confirm via challenge-response (L1)
curl -X POST https://proveyour.id/api/self-verify/confirm \
  -H "Content-Type: application/json" \
  -d '{ "agentId": "YOUR-AGENT-NAME" }'

# Check verification status
curl https://proveyour.id/api/self-verify/agent/YOUR-AGENT-NAME
```

### SDK
```typescript
import { MoltLaunchSDK } from '@moltlaunch/sdk';

// Initialize (devnet only)
const sdk = new MoltLaunchSDK({ network: 'devnet' });

// Verify an agent's status
const status = await sdk.getVerificationStatus('AgentWalletPubkey');
// Returns: { verified: boolean, level: number, proofHash: string }

// Deep verification with multiple checks
const result = await sdk.deepVerify({
  agentId: 'agent-name',
  walletAddress: 'pubkey...',
  checks: ['api', 'behavioral', 'depin']
});
```

### On-Chain (PDA Read)
```typescript
// Any program can read trust signals
// Derive PDA: ["agent", agent_wallet] from program 6AZSAhq4iJTwCfGEVssoa1p3GnBqGkbcQ1iDdP1U1pSb
// Read AgentIdentity struct for composable signals
```

## Composability

MoltLaunch composes with:
- **AAP** (Agent Agreement Protocol) — trust signals + delegation scopes = complete trust stack
- **Agent Bazaar** — trust signals for provider ranking
- **SATI** — SAS-compatible attestations
- **Solana ID** — human verification layer (car-and-driver pattern)
- **SlotScribe** — execution trace verification triggers flagging
- **BlinkGuard** — trust-level-weighted transaction safety thresholds

## Links
- Website: https://youragent.id
- Self-Verify: https://proveyour.id
- Repository: https://github.com/tradingstarllc/moltlaunch
- SDK: npm install @moltlaunch/sdk
- sRFC #9: https://github.com/solana-foundation/SRFCs/discussions/9
- Blog: https://youragent.id/blog.html
- Anchor Program (devnet): 6AZSAhq4iJTwCfGEVssoa1p3GnBqGkbcQ1iDdP1U1pSb

## Status
- Network: **Devnet** (not mainnet)
- Architecture: V3 Composable Signals (SAS issuer model)
- Self-verify service: Live at proveyour.id
- SDK: @moltlaunch/sdk v2.4.0 on npm
