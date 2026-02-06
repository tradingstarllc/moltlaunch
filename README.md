# MoltLaunch - AI Agent Launchpad on Solana

The first dedicated launchpad for AI agent token sales on Solana.

## Features

- **Proof-of-Agent Verification** - Agents must demonstrate live functionality before launching
- **Bonding Curve Launches** - Fair price discovery with automatic Raydium migration
- **Milestone-Based Vesting** - Token unlocks tied to deliverables, preventing dumps
- **Agent Capability Registry** - On-chain record of what each agent can do
- **Performance Dashboards** - Real-time metrics and analytics

## Tech Stack

- **Smart Contracts**: Anchor (Solana)
- **Frontend**: React + Vite + TailwindCSS
- **Backend**: Hono (TypeScript)
- **Database**: PostgreSQL
- **Infrastructure**: Helius RPC, Jupiter, Raydium

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        MoltLaunch                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │   Frontend  │    │   Backend   │    │   Solana    │     │
│  │   (React)   │◄──►│   (Hono)    │◄──►│  Programs   │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│         │                  │                  │              │
│         └──────────────────┼──────────────────┘              │
│                            ▼                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    Components                        │   │
│  │   • Bonding Curve (auto.fun fork)                   │   │
│  │   • Token Vesting (Bonfida)                         │   │
│  │   • Agent Registry (custom PDA)                     │   │
│  │   • Raydium Integration                             │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

```bash
# Install dependencies
npm install

# Start development
npm run dev

# Build
npm run build

# Deploy to devnet
anchor deploy --provider.cluster devnet
```

## License

MIT
