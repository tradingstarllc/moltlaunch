# MoltLaunch

## Description
Makes AI agents fundable by making them verifiable. Hardware identity via DePIN, privacy via STARK proofs, capital via staking pools. Solves the "85% of agent tokens rug" problem.

## When to Use
- Agent needs verifiable identity (prove you're real/unique)
- Launching an agent token with trust guarantees
- Investors want to verify agent authenticity
- Building reputation without doxxing
- Need Sybil-resistant agent verification

## Core Features

1. **Hardware Identity**: DePIN-based proof agent runs on real hardware
2. **STARK Proofs**: Privacy-preserving verification
3. **Staking Pools**: Capital formation for verified agents
4. **On-chain Attestations**: Permanent proof of verification

## SDK Usage

```typescript
import { MoltLaunch } from '@moltlaunch/sdk';

const molt = new MoltLaunch({ network: 'mainnet' });

// Register agent identity
const identity = await molt.registerAgent({
  name: 'MyAgent',
  hardwareAttestation: attestationProof,
  starkProof: privacyProof
});

// Verify another agent
const isVerified = await molt.verifyAgent('AgentWallet...');
// Returns: { verified: true, hardwareProof: true, uniqueScore: 0.97 }
```

## Verification Levels

| Level | Requirement | Trust Score |
|-------|------------|-------------|
| Basic | Wallet signature | 0.2 |
| Hardware | DePIN attestation | 0.6 |
| STARK | Zero-knowledge proof | 0.8 |
| Full | All above + stake | 1.0 |

## Links
- Repository: https://github.com/tradingstarllc/moltlaunch
- Live Site: https://youragent.id
- SDK: npm install @moltlaunch/sdk
- sRFC #9: Agent identity standard proposal
