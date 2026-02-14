"use strict";
/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  COMPOSABLE FINANCE DEMO — Cross-Program CPI Integration                   ║
 * ║  MoltLaunch × AAP × BlinkGuard                                             ║
 * ║                                                                             ║
 * ║  Demonstrates the complete trust-gated financial flow:                      ║
 * ║  1. Read on-chain trust signals from MoltLaunch                             ║
 * ║  2. Compute trust-adjusted financial parameters                             ║
 * ║  3. Cross-program identity reads (CPI consumer pattern)                     ║
 * ║  4. Simulated AAP agreement with trust-adjusted escrow                      ║
 * ║  5. BlinkGuard-style transaction simulation                                 ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 *
 * Run: npx ts-node scripts/composable-demo.ts
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const anchor = __importStar(require("@coral-xyz/anchor"));
const anchor_1 = require("@coral-xyz/anchor");
const web3_js_1 = require("@solana/web3.js");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
// ═══════════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════════
const MOLTLAUNCH_PROGRAM_ID = new web3_js_1.PublicKey("6AZSAhq4iJTwCfGEVssoa1p3GnBqGkbcQ1iDdP1U1pSb");
const AAP_PROGRAM_ID = new web3_js_1.PublicKey("BzHyb5Eevigb6cyfJT5cd27zVhu92sY5isvmHUYe6NwZ");
const AAP_V2_PROGRAM_ID = new web3_js_1.PublicKey("Ey56W7XXaeLm2kYNt5Ewp6TfgWgpVEZ2DD23ernmfuxY");
// Known PDAs
const KNOWN_CONFIG_PDA = new web3_js_1.PublicKey("FDx58acvRE3K5bTe8Grb9WTCbECd9Q7GuJWKGGrffLto");
const KNOWN_AUTHORITY_PDA = new web3_js_1.PublicKey("EMSDrWKUBYG8xK2FtKJkbhefrp2uhX9aDGNvXJDxwTXC");
const KNOWN_AGENT_PDA = new web3_js_1.PublicKey("A37TxCUGqwckRUzUWHzzsEBsWj4HMy7gW9uQTxFhjHgp");
// ═══════════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════════
function line(char = "─", len = 78) {
    return char.repeat(len);
}
function banner(text) {
    const pad = Math.max(0, Math.floor((74 - text.length) / 2));
    console.log(`\n╔${"═".repeat(76)}╗`);
    console.log(`║${" ".repeat(pad)}${text}${" ".repeat(76 - pad - text.length)}║`);
    console.log(`╚${"═".repeat(76)}╝`);
}
function sectionHeader(num, title) {
    console.log(`\n${"━".repeat(78)}`);
    console.log(`  STEP ${num}: ${title}`);
    console.log(`${"━".repeat(78)}`);
}
function field(label, value, indent = 2) {
    const spaces = " ".repeat(indent);
    const labelPad = 28 - indent;
    console.log(`${spaces}${label.padEnd(labelPad)} ${value}`);
}
function resolveInfraType(infraType) {
    if (infraType.cloud !== undefined)
        return "Cloud";
    if (infraType.tee !== undefined)
        return "TEE";
    if (infraType.dePIN !== undefined || infraType.dePin !== undefined)
        return "DePIN";
    return "Unknown";
}
function tierColor(tier) {
    const colors = {
        "🥉 Bronze": "\x1b[33m",
        "🥈 Silver": "\x1b[37m",
        "🥇 Gold": "\x1b[93m",
        "💎 Diamond": "\x1b[96m",
    };
    return `${colors[tier] || ""}${tier}\x1b[0m`;
}
// ═══════════════════════════════════════════════════════════════════════════════
// Financial Engine — Trust-Adjusted Parameters
// ═══════════════════════════════════════════════════════════════════════════════
function computeFinancialTier(signals) {
    if (signals.isFlagged)
        return "⛔ Blocked";
    if (signals.trustScore >= 80 && signals.hasHardwareBinding)
        return "💎 Diamond";
    if (signals.trustScore >= 50 && signals.attestationCount >= 2)
        return "🥇 Gold";
    if (signals.trustScore >= 20 && signals.attestationCount >= 1)
        return "🥈 Silver";
    if (signals.trustScore > 0)
        return "🥉 Bronze";
    return "⚪ Unverified";
}
function computeFinancialProfile(signals) {
    const tier = computeFinancialTier(signals);
    // Base parameters by tier
    const tierParams = {
        "⛔ Blocked": {
            flashLoanLimit: 0,
            escrowPercentage: 100,
            creditLine: 0,
            insurancePremiumRate: 10000, // 100%
            maxAgreementValue: 0,
            requiredCollateral: 100,
            settlementPriority: "rejected",
        },
        "⚪ Unverified": {
            flashLoanLimit: 0,
            escrowPercentage: 100,
            creditLine: 0,
            insurancePremiumRate: 5000, // 50%
            maxAgreementValue: 0.5,
            requiredCollateral: 100,
            settlementPriority: "manual",
        },
        "🥉 Bronze": {
            flashLoanLimit: 1,
            escrowPercentage: 80,
            creditLine: 0.5,
            insurancePremiumRate: 2500, // 25%
            maxAgreementValue: 5,
            requiredCollateral: 80,
            settlementPriority: "standard",
        },
        "🥈 Silver": {
            flashLoanLimit: 10,
            escrowPercentage: 50,
            creditLine: 5,
            insurancePremiumRate: 1000, // 10%
            maxAgreementValue: 50,
            requiredCollateral: 50,
            settlementPriority: "standard",
        },
        "🥇 Gold": {
            flashLoanLimit: 100,
            escrowPercentage: 25,
            creditLine: 50,
            insurancePremiumRate: 500, // 5%
            maxAgreementValue: 500,
            requiredCollateral: 25,
            settlementPriority: "fast-track",
        },
        "💎 Diamond": {
            flashLoanLimit: 1000,
            escrowPercentage: 10,
            creditLine: 500,
            insurancePremiumRate: 100, // 1%
            maxAgreementValue: 10000,
            requiredCollateral: 10,
            settlementPriority: "instant",
        },
    };
    const base = tierParams[tier] || tierParams["⚪ Unverified"];
    // Trust score fine-tuning: linear interpolation within tier
    const scoreFactor = signals.trustScore / 100;
    // Infra bonus: TEE gets 20% better terms, DePIN gets 10%
    let infraMultiplier = 1.0;
    if (signals.infraType === "TEE")
        infraMultiplier = 1.2;
    else if (signals.infraType === "DePIN")
        infraMultiplier = 1.1;
    else if (signals.infraType === "Cloud")
        infraMultiplier = 1.0;
    // Economic stake bonus: 15% better terms
    const stakeFactor = signals.hasEconomicStake ? 1.15 : 1.0;
    return {
        tier,
        flashLoanLimit: Math.round(base.flashLoanLimit * infraMultiplier * stakeFactor * 100) / 100,
        escrowPercentage: Math.max(5, Math.round(base.escrowPercentage / (infraMultiplier * stakeFactor))),
        creditLine: Math.round(base.creditLine * infraMultiplier * stakeFactor * 100) / 100,
        insurancePremiumRate: Math.round(base.insurancePremiumRate / (infraMultiplier * stakeFactor)),
        maxAgreementValue: Math.round(base.maxAgreementValue * infraMultiplier * stakeFactor * 100) / 100,
        requiredCollateral: Math.max(5, Math.round(base.requiredCollateral / (infraMultiplier * stakeFactor))),
        settlementPriority: base.settlementPriority,
    };
}
// ═══════════════════════════════════════════════════════════════════════════════
// Cross-Program Consumer Patterns
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * Derives MoltLaunch AgentIdentity PDA for any wallet.
 * This is the key integration primitive — any program can derive and read this.
 */
function deriveMoltLaunchAgentPDA(wallet) {
    return web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("agent"), wallet.toBytes()], MOLTLAUNCH_PROGRAM_ID);
}
/**
 * Derives AAP AgentIdentity PDA for any agent key.
 */
function deriveAAPAgentPDA(agentKey) {
    return web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("agent"), agentKey.toBytes()], AAP_PROGRAM_ID);
}
/**
 * Derives AAP Agreement PDA for a given UUID.
 */
function deriveAAPAgreementPDA(agreementId) {
    return web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("agreement"), agreementId], AAP_PROGRAM_ID);
}
/**
 * Simple trust gate: pass/fail based on threshold.
 * Use this for binary access control.
 */
function simpleTrustGate(trustScore, threshold) {
    if (trustScore >= threshold) {
        return { passed: true, reason: `trust_score ${trustScore} >= threshold ${threshold}` };
    }
    return { passed: false, reason: `trust_score ${trustScore} < threshold ${threshold}` };
}
/**
 * Precise trust gate: multi-signal evaluation.
 * Use this for nuanced access control with multiple criteria.
 */
function preciseTrustGate(signals, criteria) {
    const checks = [];
    if (criteria.minTrustScore !== undefined) {
        const p = signals.trustScore >= criteria.minTrustScore;
        checks.push({ criterion: "trust_score", passed: p, detail: `${signals.trustScore} ${p ? ">=" : "<"} ${criteria.minTrustScore}` });
    }
    if (criteria.requiredInfra !== undefined) {
        const p = criteria.requiredInfra.includes(signals.infraType);
        checks.push({ criterion: "infra_type", passed: p, detail: `${signals.infraType} ${p ? "∈" : "∉"} [${criteria.requiredInfra.join(", ")}]` });
    }
    if (criteria.minAttestations !== undefined) {
        const p = signals.attestationCount >= criteria.minAttestations;
        checks.push({ criterion: "attestation_count", passed: p, detail: `${signals.attestationCount} ${p ? ">=" : "<"} ${criteria.minAttestations}` });
    }
    if (criteria.requireEconomicStake) {
        checks.push({ criterion: "economic_stake", passed: signals.hasEconomicStake, detail: `${signals.hasEconomicStake}` });
    }
    if (criteria.requireHardwareBinding) {
        checks.push({ criterion: "hardware_binding", passed: signals.hasHardwareBinding, detail: `${signals.hasHardwareBinding}` });
    }
    if (criteria.maxAgeDays !== undefined) {
        const nowSec = Math.floor(Date.now() / 1000);
        const ageDays = (nowSec - signals.lastVerified) / 86400;
        const p = ageDays <= criteria.maxAgeDays;
        checks.push({ criterion: "verification_age", passed: p, detail: `${ageDays.toFixed(1)} days ${p ? "<=" : ">"} ${criteria.maxAgeDays}` });
    }
    return { passed: checks.every(c => c.passed), checks };
}
// ═══════════════════════════════════════════════════════════════════════════════
// BlinkGuard Transaction Simulation
// ═══════════════════════════════════════════════════════════════════════════════
function simulateBlinkGuard(params) {
    const warnings = [];
    // Pre-balances (simulated)
    const preBalances = new Map();
    preBalances.set(params.senderWallet.toBase58().slice(0, 8) + "...", params.senderPreBalance);
    preBalances.set(params.escrowVault.toBase58().slice(0, 8) + "...(vault)", 0);
    // Post-balances (simulated)
    const txFee = 0.000005; // ~5000 lamports
    const postBalances = new Map();
    postBalances.set(params.senderWallet.toBase58().slice(0, 8) + "...", params.senderPreBalance - params.escrowAmount - txFee);
    postBalances.set(params.escrowVault.toBase58().slice(0, 8) + "...(vault)", params.escrowAmount);
    // Delta bounds checking — the core BlinkGuard mechanism
    // Max outflow is trust-adjusted: higher trust → larger allowed deltas
    const trustFactor = params.trustScore / 100;
    const maxAllowedOutflow = 10 * (1 + trustFactor * 9); // 10 SOL (score=0) to 100 SOL (score=100)
    const deltaChecks = [
        {
            account: params.senderWallet.toBase58().slice(0, 8) + "...",
            delta: -(params.escrowAmount + txFee),
            withinBounds: (params.escrowAmount + txFee) <= maxAllowedOutflow,
            maxAllowed: -maxAllowedOutflow,
        },
        {
            account: params.escrowVault.toBase58().slice(0, 8) + "...(vault)",
            delta: params.escrowAmount,
            withinBounds: true, // Vault receiving is always ok
            maxAllowed: Infinity,
        },
    ];
    // Safety checks
    if (params.senderPreBalance - params.escrowAmount - txFee < 0.001) {
        warnings.push("⚠️  Sender balance would drop below rent-exempt minimum");
    }
    if (params.escrowAmount > params.senderPreBalance * 0.9) {
        warnings.push("⚠️  Escrow exceeds 90% of sender balance — high risk");
    }
    if (params.trustScore < 20) {
        warnings.push("⚠️  Low trust score — additional verification recommended");
    }
    return {
        preBalances,
        postBalances,
        deltaChecks,
        passed: deltaChecks.every(d => d.withinBounds) && warnings.filter(w => w.includes("below rent")).length === 0,
        warnings,
    };
}
function buildTrustAdjustedAgreement(proposerSignals, financialProfile, baseEscrowSOL, counterparty) {
    // Trust-adjusted escrow: reduce escrow requirement based on trust
    const escrowReduction = (100 - financialProfile.escrowPercentage) / 100;
    const adjustedEscrow = baseEscrowSOL * (financialProfile.escrowPercentage / 100);
    // Generate agreement ID (UUID-like)
    const agreementIdBytes = crypto.randomBytes(16);
    const agreementId = agreementIdBytes.toString("hex").replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, "$1-$2-$3-$4-$5");
    // Terms hash (SHA-256 of agreement terms)
    const terms = JSON.stringify({
        service: "AI Agent Task Execution",
        escrowAmount: adjustedEscrow,
        infraRequirement: proposerSignals.infraType,
        trustThreshold: proposerSignals.trustScore,
        sla: "99.9% uptime, <2s response time",
    });
    const termsHash = crypto.createHash("sha256").update(terms).digest("hex");
    return {
        agreementId,
        agreementType: "ServiceLevel",
        proposer: proposerSignals.wallet.toBase58(),
        counterparty: counterparty.toBase58(),
        escrowAmount: adjustedEscrow,
        escrowMint: "SOL (native)",
        termsHash,
        termsUri: `ar://${crypto.randomBytes(32).toString("base64url").slice(0, 43)}`,
        numParties: 2,
        expiresAt: Math.floor(Date.now() / 1000) + 7 * 24 * 3600, // 7 days
        trustAdjustments: {
            baseEscrow: baseEscrowSOL,
            adjustedEscrow,
            escrowReduction: escrowReduction * 100,
            reason: `${financialProfile.tier} tier: ${financialProfile.escrowPercentage}% escrow required (${(escrowReduction * 100).toFixed(0)}% reduction from trust)`,
        },
    };
}
// ═══════════════════════════════════════════════════════════════════════════════
// Main Demo
// ═══════════════════════════════════════════════════════════════════════════════
async function main() {
    banner("COMPOSABLE FINANCE DEMO");
    console.log("  MoltLaunch × AAP × BlinkGuard — Trust-Gated Financial Flow");
    console.log(`  Network: Solana Devnet`);
    console.log(`  Time: ${new Date().toISOString()}`);
    // ─── Setup ────────────────────────────────────────────────────────────────
    const connection = new web3_js_1.Connection("https://api.devnet.solana.com", "confirmed");
    // Try to load local wallet, fall back to read-only mode with known agent
    let walletKeypair;
    let readOnlyMode = false;
    const walletPaths = [
        path.resolve(process.cwd(), "../devnet-wallet.json"),
        path.resolve(process.cwd(), "devnet-wallet.json"),
        path.resolve(process.env.HOME || "~", ".config/solana/id.json"),
    ];
    let loadedWallet = false;
    for (const wp of walletPaths) {
        try {
            walletKeypair = web3_js_1.Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(wp, "utf-8"))));
            loadedWallet = true;
            console.log(`\n  Wallet loaded from: ${wp}`);
            break;
        }
        catch { }
    }
    if (!loadedWallet) {
        // Read-only mode: generate a dummy wallet for provider, read known agent PDA
        console.log("\n  ⚠️  No wallet found — running in READ-ONLY mode");
        console.log("  (To run with full features, place a devnet wallet at ../devnet-wallet.json)");
        walletKeypair = web3_js_1.Keypair.generate();
        readOnlyMode = true;
    }
    const wallet = new anchor.Wallet(walletKeypair);
    const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
    anchor.setProvider(provider);
    const idlPath = path.resolve(process.cwd(), "target/idl/moltlaunch.json");
    const idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));
    const program = new anchor_1.Program(idl, provider);
    // Always demo the known deployed agent — the demo reads existing on-chain state
    // Your wallet is used for provider connection only, not for PDA derivation
    const DEMO_AGENT_WALLET = new web3_js_1.PublicKey("3WAE2DGvGHH6ZnPQdEJnkTktpoBNr4ci6HeecVmisNw8");
    const agentWalletPubkey = DEMO_AGENT_WALLET;
    console.log(`  Your wallet: ${walletKeypair.publicKey.toBase58()}${readOnlyMode ? " (generated, read-only)" : ""}`);
    console.log(`  Demo agent:  ${agentWalletPubkey.toBase58()} (moltlaunch-agent on devnet)`);
    // ═════════════════════════════════════════════════════════════════════════
    // STEP 1: Trust-Gated Agent Registration — Read On-Chain Identity
    // ═════════════════════════════════════════════════════════════════════════
    sectionHeader(1, "TRUST-GATED AGENT REGISTRATION");
    console.log("\n  📡 Reading MoltLaunch AgentIdentity from devnet...\n");
    // Derive PDA deterministically
    const [agentPda, agentBump] = deriveMoltLaunchAgentPDA(agentWalletPubkey);
    console.log(`  PDA derivation: seeds = ["agent", ${agentWalletPubkey.toBase58().slice(0, 8)}...]`);
    console.log(`  Derived PDA:    ${agentPda.toBase58()}`);
    console.log(`  Known PDA:      ${KNOWN_AGENT_PDA.toBase58()}`);
    console.log(`  Match:          ${agentPda.toBase58() === KNOWN_AGENT_PDA.toBase58() ? "✅ Yes" : "❌ No"}`);
    console.log(`  Bump:           ${agentBump}`);
    // Fetch live on-chain data
    const agentAccount = await program.account.agentIdentity.fetch(agentPda);
    const signals = {
        wallet: agentAccount.wallet,
        name: agentAccount.name,
        infraType: resolveInfraType(agentAccount.infraType),
        trustScore: agentAccount.trustScore,
        attestationCount: agentAccount.attestationCount,
        hasEconomicStake: agentAccount.hasEconomicStake,
        hasHardwareBinding: agentAccount.hasHardwareBinding,
        isFlagged: agentAccount.isFlagged,
        lastVerified: agentAccount.lastVerified.toNumber(),
        registeredAt: agentAccount.registeredAt.toNumber(),
        nonce: agentAccount.nonce.toNumber(),
    };
    console.log(`\n  ┌─────────────────────────────────────────────────────────────┐`);
    console.log(`  │  ON-CHAIN TRUST SIGNALS (LIVE FROM DEVNET)                  │`);
    console.log(`  ├─────────────────────────────────────────────────────────────┤`);
    field("Agent Name:", signals.name, 4);
    field("Wallet:", signals.wallet.toBase58(), 4);
    field("Infra Type:", signals.infraType, 4);
    field("Trust Score:", `${signals.trustScore}/100`, 4);
    field("Attestation Count:", signals.attestationCount, 4);
    field("Economic Stake:", signals.hasEconomicStake ? "✅ Yes" : "❌ No", 4);
    field("Hardware Binding:", signals.hasHardwareBinding ? "✅ Yes" : "❌ No", 4);
    field("Is Flagged:", signals.isFlagged ? "🚩 Yes" : "✅ No", 4);
    field("Last Verified:", new Date(signals.lastVerified * 1000).toISOString(), 4);
    field("Registered At:", new Date(signals.registeredAt * 1000).toISOString(), 4);
    field("Nonce:", signals.nonce, 4);
    console.log(`  └─────────────────────────────────────────────────────────────┘`);
    // Determine financial tier
    const tier = computeFinancialTier(signals);
    console.log(`\n  📊 Financial Tier: ${tierColor(tier)}`);
    console.log(`     Qualification: trust_score=${signals.trustScore}, attestations=${signals.attestationCount}, infra=${signals.infraType}`);
    // Also read protocol config for context
    const [configPda] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("moltlaunch")], MOLTLAUNCH_PROGRAM_ID);
    const config = await program.account.protocolConfig.fetch(configPda);
    console.log(`\n  📋 Protocol Stats:`);
    field("Total Agents:", config.totalAgents.toNumber(), 4);
    field("Total Attestations:", config.totalAttestations.toNumber(), 4);
    field("Protocol Paused:", config.paused ? "🔴 Yes" : "🟢 No", 4);
    // ═════════════════════════════════════════════════════════════════════════
    // STEP 2: Trust-Adjusted Financial Parameters
    // ═════════════════════════════════════════════════════════════════════════
    sectionHeader(2, "TRUST-ADJUSTED FINANCIAL PARAMETERS");
    const profile = computeFinancialProfile(signals);
    console.log(`\n  ┌─────────────────────────────────────────────────────────────┐`);
    console.log(`  │  FINANCIAL PROFILE — Computed from On-Chain Trust Signals   │`);
    console.log(`  ├─────────────────────────────────────────────────────────────┤`);
    field("Tier:", profile.tier, 4);
    field("Flash Loan Limit:", `${profile.flashLoanLimit} SOL`, 4);
    field("Required Escrow:", `${profile.escrowPercentage}%`, 4);
    field("Credit Line:", `${profile.creditLine} SOL`, 4);
    field("Insurance Premium:", `${profile.insurancePremiumRate} bps (${(profile.insurancePremiumRate / 100).toFixed(1)}%)`, 4);
    field("Max Agreement Value:", `${profile.maxAgreementValue} SOL`, 4);
    field("Required Collateral:", `${profile.requiredCollateral}%`, 4);
    field("Settlement Priority:", profile.settlementPriority, 4);
    console.log(`  └─────────────────────────────────────────────────────────────┘`);
    // Show how parameters change with different trust levels
    console.log(`\n  📈 Parameter Sensitivity Table:`);
    console.log(`  ${"─".repeat(72)}`);
    console.log(`  ${"Tier".padEnd(14)} ${"Flash Loan".padEnd(12)} ${"Escrow %".padEnd(10)} ${"Credit".padEnd(10)} ${"Premium".padEnd(10)} ${"Settlement".padEnd(12)}`);
    console.log(`  ${"─".repeat(72)}`);
    const syntheticScenarios = [
        { name: "New Agent", score: 0, infra: "Unknown", attest: 0, stake: false, hw: false },
        { name: "Bronze (min)", score: 10, infra: "Cloud", attest: 0, stake: false, hw: false },
        { name: "Silver (Cloud)", score: 30, infra: "Cloud", attest: 1, stake: false, hw: false },
        { name: "Gold (TEE)", score: 55, infra: "TEE", attest: 2, stake: true, hw: false },
        { name: "Diamond", score: 90, infra: "TEE", attest: 5, stake: true, hw: true },
    ];
    for (const s of syntheticScenarios) {
        const sp = computeFinancialProfile({
            ...signals,
            trustScore: s.score,
            infraType: s.infra,
            attestationCount: s.attest,
            hasEconomicStake: s.stake,
            hasHardwareBinding: s.hw,
            isFlagged: false,
        });
        const marker = s.score === signals.trustScore && s.infra === signals.infraType ? " ◄── YOU" : "";
        console.log(`  ${s.name.padEnd(14)} ${(sp.flashLoanLimit + " SOL").padEnd(12)} ${(sp.escrowPercentage + "%").padEnd(10)} ${(sp.creditLine + " SOL").padEnd(10)} ${(sp.insurancePremiumRate + " bps").padEnd(10)} ${sp.settlementPriority.padEnd(12)}${marker}`);
    }
    console.log(`  ${"─".repeat(72)}`);
    // ═════════════════════════════════════════════════════════════════════════
    // STEP 3: Cross-Program Read (MoltLaunch → Consumer)
    // ═════════════════════════════════════════════════════════════════════════
    sectionHeader(3, "CROSS-PROGRAM IDENTITY READ");
    console.log("\n  Demonstrating how ANY Solana program can read MoltLaunch trust signals.\n");
    // Path A: Simple Trust Gate
    console.log("  ╔═══════════════════════════════════════════╗");
    console.log("  ║  PATH A: Simple Trust Gate                ║");
    console.log("  ╚═══════════════════════════════════════════╝\n");
    const thresholds = [10, 20, 30, 50, 80];
    for (const threshold of thresholds) {
        const gate = simpleTrustGate(signals.trustScore, threshold);
        console.log(`    threshold=${threshold}: ${gate.passed ? "✅ PASS" : "❌ FAIL"}  (${gate.reason})`);
    }
    console.log(`\n  Integration code (Rust CPI consumer):`);
    console.log(`  ┌──────────────────────────────────────────────────────────────────┐`);
    console.log(`  │  // In your program's instruction handler:                       │`);
    console.log(`  │  let agent_data = ctx.accounts.moltlaunch_agent.try_borrow_data()?;│`);
    console.log(`  │  let trust_score = agent_data[8 + 32 + 1 + 1 + 1 + 1 + 1]; // u8│`);
    console.log(`  │  require!(trust_score >= THRESHOLD, MyError::InsufficientTrust); │`);
    console.log(`  └──────────────────────────────────────────────────────────────────┘`);
    // Path B: Precise Multi-Signal Gate
    console.log("\n  ╔═══════════════════════════════════════════╗");
    console.log("  ║  PATH B: Precise Multi-Signal Gate        ║");
    console.log("  ╚═══════════════════════════════════════════╝\n");
    const preciseGate = preciseTrustGate(signals, {
        minTrustScore: 20,
        requiredInfra: ["Cloud", "TEE"],
        minAttestations: 1,
        maxAgeDays: 30,
    });
    console.log(`    Overall: ${preciseGate.passed ? "✅ PASSED" : "❌ FAILED"}\n`);
    for (const check of preciseGate.checks) {
        console.log(`    ${check.passed ? "✅" : "❌"} ${check.criterion.padEnd(22)} ${check.detail}`);
    }
    // Show PDA derivation for any wallet
    console.log(`\n  📐 PDA Derivation for Cross-Program Reads:`);
    console.log(`  ┌──────────────────────────────────────────────────────────────────┐`);
    console.log(`  │  MoltLaunch AgentIdentity PDA:                                  │`);
    console.log(`  │    seeds = ["agent", wallet_pubkey.to_bytes()]                   │`);
    console.log(`  │    program = ${MOLTLAUNCH_PROGRAM_ID.toBase58()}  │`);
    console.log(`  │                                                                  │`);
    console.log(`  │  AAP AgentIdentity PDA:                                          │`);
    console.log(`  │    seeds = ["agent", agent_key.to_bytes()]                       │`);
    console.log(`  │    program = ${AAP_PROGRAM_ID.toBase58()}  │`);
    console.log(`  │                                                                  │`);
    console.log(`  │  AAP Agreement PDA:                                              │`);
    console.log(`  │    seeds = ["agreement", agreement_id_bytes]                     │`);
    console.log(`  │    program = ${AAP_PROGRAM_ID.toBase58()}  │`);
    console.log(`  └──────────────────────────────────────────────────────────────────┘`);
    // Demonstrate deriving PDAs for a random wallet
    const randomWallet = web3_js_1.Keypair.generate().publicKey;
    const [randomAgentPda] = deriveMoltLaunchAgentPDA(randomWallet);
    const [randomAAPPda] = deriveAAPAgentPDA(randomWallet);
    console.log(`\n  Example: Deriving PDAs for random wallet ${randomWallet.toBase58().slice(0, 12)}...`);
    console.log(`    MoltLaunch PDA: ${randomAgentPda.toBase58()}`);
    console.log(`    AAP PDA:        ${randomAAPPda.toBase58()}`);
    // ═════════════════════════════════════════════════════════════════════════
    // STEP 4: Simulated Composable Financial Flow
    // ═════════════════════════════════════════════════════════════════════════
    sectionHeader(4, "COMPOSABLE FINANCIAL FLOW (SIMULATED)");
    console.log("\n  Full flow: MoltLaunch Trust → Financial Parameters → AAP Agreement → BlinkGuard\n");
    // 4a: Build trust-adjusted agreement
    console.log("  ╔═══════════════════════════════════════════╗");
    console.log("  ║  4a. Trust-Adjusted Agreement Builder     ║");
    console.log("  ╚═══════════════════════════════════════════╝\n");
    const counterparty = web3_js_1.Keypair.generate().publicKey;
    const baseEscrow = 10; // 10 SOL base escrow
    const agreement = buildTrustAdjustedAgreement(signals, profile, baseEscrow, counterparty);
    console.log(`    Agreement ID:       ${agreement.agreementId}`);
    console.log(`    Type:               ${agreement.agreementType}`);
    console.log(`    Proposer:           ${agreement.proposer.slice(0, 12)}... (${signals.name})`);
    console.log(`    Counterparty:       ${agreement.counterparty.slice(0, 12)}...`);
    console.log(`    Terms Hash:         ${agreement.termsHash.slice(0, 16)}...`);
    console.log(`    Terms URI:          ${agreement.termsUri.slice(0, 30)}...`);
    console.log(`    Expires:            ${new Date(agreement.expiresAt * 1000).toISOString()}`);
    console.log(`    Parties:            ${agreement.numParties}`);
    console.log();
    console.log(`    ┌── Trust-Adjusted Escrow ────────────────────────────────┐`);
    console.log(`    │  Base Escrow:        ${agreement.trustAdjustments.baseEscrow} SOL`);
    console.log(`    │  Adjusted Escrow:    ${agreement.trustAdjustments.adjustedEscrow} SOL`);
    console.log(`    │  Reduction:          ${agreement.trustAdjustments.escrowReduction.toFixed(0)}%`);
    console.log(`    │  Reason:             ${agreement.trustAdjustments.reason}`);
    console.log(`    └────────────────────────────────────────────────────────┘`);
    // 4b: Show what the AAP instruction call would look like
    console.log("\n  ╔═══════════════════════════════════════════╗");
    console.log("  ║  4b. AAP propose_agreement Call Preview   ║");
    console.log("  ╚═══════════════════════════════════════════╝\n");
    const agreementIdBuf = Buffer.from(agreement.agreementId.replace(/-/g, ""), "hex");
    const [agreementPda, agreementBump] = deriveAAPAgreementPDA(agreementIdBuf);
    console.log(`    Instruction: propose_agreement`);
    console.log(`    Program:     ${AAP_PROGRAM_ID.toBase58()}`);
    console.log(`    ┌── Arguments ─────────────────────────────────────────────┐`);
    console.log(`    │  agreement_id:   [${Array.from(agreementIdBuf.slice(0, 8)).map(b => '0x' + b.toString(16).padStart(2, '0')).join(', ')}...]`);
    console.log(`    │  agreement_type: 1 (ServiceLevel)`);
    console.log(`    │  visibility:     0 (Public)`);
    console.log(`    │  terms_hash:     [${agreement.termsHash.slice(0, 16)}...]`);
    console.log(`    │  terms_uri:      [${agreement.termsUri.slice(0, 30)}...]`);
    console.log(`    │  num_parties:    ${agreement.numParties}`);
    console.log(`    │  expires_at:     ${agreement.expiresAt}`);
    console.log(`    └──────────────────────────────────────────────────────────┘`);
    console.log(`    ┌── Accounts ──────────────────────────────────────────────┐`);
    console.log(`    │  agreement:       ${agreementPda.toBase58()}`);
    console.log(`    │  proposer:        (AAP AgentIdentity PDA for proposer)`);
    console.log(`    │  authority:       ${agentWalletPubkey.toBase58().slice(0, 20)}... (signer)`);
    console.log(`    │  escrow_vault:    (derived from agreement PDA)`);
    console.log(`    │  escrow_mint:     SOL (11111111...)`);
    console.log(`    │  system_program:  11111111111111111111111111111111`);
    console.log(`    └──────────────────────────────────────────────────────────┘`);
    // 4c: Show the composable CPI call chain
    console.log("\n  ╔═══════════════════════════════════════════╗");
    console.log("  ║  4c. Composable CPI Call Chain            ║");
    console.log("  ╚═══════════════════════════════════════════╝\n");
    console.log("    The complete cross-program flow in a single transaction:\n");
    console.log("    ┌─────────────────────────────────────────────────────────┐");
    console.log("    │                                                         │");
    console.log("    │  TX: composable_agreement_with_trust                    │");
    console.log("    │                                                         │");
    console.log("    │  ix[0]: MoltLaunch.refresh_identity_signals             │");
    console.log("    │         → Recomputes trust_score from active            │");
    console.log("    │           attestations (permissionless)                 │");
    console.log("    │                                                         │");
    console.log("    │  ix[1]: Consumer.create_trust_adjusted_agreement        │");
    console.log("    │         ├─ CPI Read: MoltLaunch AgentIdentity           │");
    console.log("    │         │  → trust_score, infra_type, attestation_count │");
    console.log("    │         ├─ Compute: escrow = base × (escrow_pct/100)    │");
    console.log("    │         └─ CPI Call: AAP.propose_agreement              │");
    console.log("    │            → agreement_id, terms, adjusted escrow       │");
    console.log("    │                                                         │");
    console.log("    │  ix[2]: AAP.deposit_to_vault                            │");
    console.log("    │         → Trust-adjusted escrow amount                  │");
    console.log("    │                                                         │");
    console.log("    └─────────────────────────────────────────────────────────┘\n");
    // 4d: BlinkGuard transaction simulation
    console.log("  ╔═══════════════════════════════════════════╗");
    console.log("  ║  4d. BlinkGuard Transaction Simulation    ║");
    console.log("  ╚═══════════════════════════════════════════╝\n");
    // Get actual wallet balance from devnet
    const walletBalance = await connection.getBalance(agentWalletPubkey);
    const walletBalanceSOL = walletBalance / 1e9;
    const blinkGuard = simulateBlinkGuard({
        senderWallet: agentWalletPubkey,
        escrowVault: agreementPda,
        escrowAmount: agreement.trustAdjustments.adjustedEscrow,
        senderPreBalance: walletBalanceSOL,
        trustScore: signals.trustScore,
    });
    console.log(`    Sender Balance: ${walletBalanceSOL.toFixed(4)} SOL (live from devnet)`);
    console.log(`    Escrow Amount:  ${agreement.trustAdjustments.adjustedEscrow} SOL`);
    console.log(`    Trust Score:    ${signals.trustScore}/100\n`);
    console.log(`    ┌── Pre-Transaction Balances ──┐`);
    for (const [acct, bal] of blinkGuard.preBalances) {
        console.log(`    │  ${acct.padEnd(22)} ${bal.toFixed(4).padStart(10)} SOL │`);
    }
    console.log(`    └─────────────────────────────┘\n`);
    console.log(`    ┌── Delta Bounds Check ────────────────────────────────────┐`);
    for (const check of blinkGuard.deltaChecks) {
        const status = check.withinBounds ? "✅" : "❌";
        console.log(`    │  ${status} ${check.account.padEnd(22)} Δ=${check.delta >= 0 ? "+" : ""}${check.delta.toFixed(4).padStart(10)} SOL │`);
    }
    console.log(`    └──────────────────────────────────────────────────────────┘\n`);
    console.log(`    ┌── Post-Transaction Balances ─┐`);
    for (const [acct, bal] of blinkGuard.postBalances) {
        console.log(`    │  ${acct.padEnd(22)} ${bal.toFixed(4).padStart(10)} SOL │`);
    }
    console.log(`    └─────────────────────────────┘\n`);
    if (blinkGuard.warnings.length > 0) {
        console.log(`    Warnings:`);
        for (const w of blinkGuard.warnings) {
            console.log(`      ${w}`);
        }
        console.log();
    }
    console.log(`    BlinkGuard Verdict: ${blinkGuard.passed ? "✅ SAFE — Transaction within bounds" : "❌ BLOCKED — Transaction exceeds bounds"}`);
    // 4e: Post-settlement reputation update path
    console.log("\n  ╔═══════════════════════════════════════════╗");
    console.log("  ║  4e. Post-Settlement Reputation Update    ║");
    console.log("  ╚═══════════════════════════════════════════╝\n");
    console.log("    After agreement fulfillment, trust signals update:\n");
    console.log("    ┌─────────────────────────────────────────────────────────┐");
    console.log("    │  AAP.fulfill_agreement                                  │");
    console.log("    │    ↓                                                    │");
    console.log("    │  Authority submits new attestation (General signal):     │");
    console.log("    │    MoltLaunch.submit_attestation(General, fulfillment)   │");
    console.log("    │    ↓                                                    │");
    console.log("    │  MoltLaunch.refresh_identity_signals                    │");
    console.log("    │    ↓                                                    │");
    console.log("    │  trust_score increases → better financial terms          │");
    console.log("    │    ↓                                                    │");
    console.log("    │  Next agreement: lower escrow, higher credit line       │");
    console.log("    └─────────────────────────────────────────────────────────┘\n");
    const futureProfile = computeFinancialProfile({
        ...signals,
        trustScore: Math.min(100, signals.trustScore + 15), // +15 from fulfillment attestation
        attestationCount: signals.attestationCount + 1,
    });
    console.log(`    Current → Post-Fulfillment projection:`);
    console.log(`    ${"─".repeat(60)}`);
    console.log(`    ${"Metric".padEnd(24)} ${"Current".padEnd(16)} ${"After Fulfillment".padEnd(16)}`);
    console.log(`    ${"─".repeat(60)}`);
    console.log(`    ${"Trust Score".padEnd(24)} ${String(signals.trustScore).padEnd(16)} ${Math.min(100, signals.trustScore + 15)}`);
    console.log(`    ${"Tier".padEnd(24)} ${profile.tier.padEnd(16)} ${futureProfile.tier}`);
    console.log(`    ${"Escrow Required".padEnd(24)} ${(profile.escrowPercentage + "%").padEnd(16)} ${futureProfile.escrowPercentage}%`);
    console.log(`    ${"Flash Loan Limit".padEnd(24)} ${(profile.flashLoanLimit + " SOL").padEnd(16)} ${futureProfile.flashLoanLimit} SOL`);
    console.log(`    ${"Credit Line".padEnd(24)} ${(profile.creditLine + " SOL").padEnd(16)} ${futureProfile.creditLine} SOL`);
    console.log(`    ${"Insurance Premium".padEnd(24)} ${(profile.insurancePremiumRate + " bps").padEnd(16)} ${futureProfile.insurancePremiumRate} bps`);
    console.log(`    ${"─".repeat(60)}`);
    // ═════════════════════════════════════════════════════════════════════════
    // STEP 5: Summary & Architecture
    // ═════════════════════════════════════════════════════════════════════════
    sectionHeader(5, "ARCHITECTURE SUMMARY");
    console.log(`
    ┌──────────────┐    trust signals    ┌──────────────────┐
    │  MoltLaunch   │ ──────────────────► │  Consumer Program │
    │  AgentIdentity│    CPI read         │  (Your DeFi App)  │
    │               │                     │                    │
    │  trust_score  │    PDA derivation:  │  Reads trust_score │
    │  infra_type   │    ["agent",wallet] │  Adjusts params    │
    │  attestations │                     │  Gates access      │
    └──────────────┘                     └────────┬───────────┘
                                                   │
                                          CPI call │
                                                   ▼
                                         ┌──────────────────┐
                                         │  AAP              │
                                         │  Agreement Proto  │
                                         │                    │
                                         │  propose_agreement │
                                         │  deposit_to_vault  │
                                         │  fulfill_agreement │
                                         └────────┬───────────┘
                                                   │
                                        settlement │
                                                   ▼
                                         ┌──────────────────┐
                                         │  BlinkGuard       │
                                         │  TX Simulation    │
                                         │                    │
                                         │  Delta bounds      │
                                         │  Balance checks    │
                                         │  Safety gates      │
                                         └──────────────────┘

    The Virtuous Cycle:
    ┌─────────────────────────────────────────────────────────────┐
    │  Register → Attest → Build Trust → Better Terms →           │
    │  Fulfill Agreement → More Trust → Even Better Terms → ...   │
    └─────────────────────────────────────────────────────────────┘
  `);
    // Final banner
    banner("DEMO COMPLETE");
    console.log(`\n  ✅ Read live on-chain trust signals from MoltLaunch devnet`);
    console.log(`  ✅ Computed trust-adjusted financial parameters`);
    console.log(`  ✅ Demonstrated cross-program identity reads (simple + precise gates)`);
    console.log(`  ✅ Built trust-adjusted AAP agreement with escrow reduction`);
    console.log(`  ✅ Simulated BlinkGuard transaction safety checks`);
    console.log(`  ✅ Showed post-settlement reputation update path`);
    console.log(`\n  See docs/COMPOSABLE_FINANCE.md for the full integration guide.\n`);
}
main().catch((err) => {
    console.error("\n❌ Demo failed:", err.message || err);
    process.exit(1);
});
