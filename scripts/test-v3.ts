
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";

const idlPath = path.resolve(process.cwd(), "target/idl/moltlaunch.json");
const idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));
const PROGRAM_ID = new PublicKey("6AZSAhq4iJTwCfGEVssoa1p3GnBqGkbcQ1iDdP1U1pSb");

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  ✅ ${testName}`);
    passed++;
  } else {
    console.log(`  ❌ ${testName}`);
    failed++;
  }
}

async function main() {
  const connection = new anchor.web3.Connection("https://api.devnet.solana.com", "confirmed");
  const walletPath = path.resolve(process.cwd(), "../devnet-wallet.json");
  const walletKeypair = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync(walletPath, "utf-8")))
  );
  const wallet = new anchor.Wallet(walletKeypair);
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
  anchor.setProvider(provider);
  const program = new Program(idl, provider);

  console.log("=== MoltLaunch V3.1 Test Suite ===\n");

  // ── Test 1: Read Protocol Config ──
  console.log("Test 1: Protocol Config");
  const [configPda] = PublicKey.findProgramAddressSync([Buffer.from("moltlaunch")], PROGRAM_ID);
  const config = await (program.account as any).protocolConfig.fetch(configPda);
  assert(config.admin.toBase58() === walletKeypair.publicKey.toBase58(), "Admin is our wallet");
  assert(config.totalAgents.toNumber() >= 1, "Total agents >= 1");
  assert(config.totalAttestations.toNumber() >= 1, "Total attestations >= 1");
  assert(config.paused === false, "Protocol not paused");
  assert(config.revocationNonce.toNumber() >= 0, "Revocation nonce exists");

  // ── Test 2: Read Authority ──
  console.log("\nTest 2: Authority");
  const [authPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("authority"), walletKeypair.publicKey.toBytes()], PROGRAM_ID
  );
  const auth = await (program.account as any).authority.fetch(authPda);
  assert(auth.pubkey.toBase58() === walletKeypair.publicKey.toBase58(), "Authority pubkey matches");
  assert(auth.active === true, "Authority is active");
  assert(JSON.stringify(auth.authorityType) === JSON.stringify({ single: {} }), "Authority type is Single");
  assert(auth.attestationCount.toNumber() >= 1, "Has at least 1 attestation");

  // ── Test 3: Read Agent Identity ──
  console.log("\nTest 3: Agent Identity (Signal Hub)");
  const [agentPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("agent"), walletKeypair.publicKey.toBytes()], PROGRAM_ID
  );
  const agent = await (program.account as any).agentIdentity.fetch(agentPda);
  assert(agent.wallet.toBase58() === walletKeypair.publicKey.toBase58(), "Agent wallet matches");
  assert(agent.name === "moltlaunch-agent", "Agent name is moltlaunch-agent");
  assert(JSON.stringify(agent.infraType) === JSON.stringify({ cloud: {} }), "Infra type is Cloud");
  assert(agent.trustScore === 30, "Trust score is 30 (20 base + 10 cloud)");
  assert(agent.attestationCount === 1, "Attestation count is 1");
  assert(agent.hasEconomicStake === false, "No economic stake");
  assert(agent.hasHardwareBinding === false, "No hardware binding");
  assert(agent.isFlagged === false, "Not flagged");
  assert(agent.lastVerified.toNumber() > 0, "Has last_verified timestamp");
  assert(agent.registeredAt.toNumber() > 0, "Has registered_at timestamp");

  // ── Test 4: Read Attestation ──
  console.log("\nTest 4: Attestation");
  const [attestPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("attestation"), walletKeypair.publicKey.toBytes(), walletKeypair.publicKey.toBytes()], PROGRAM_ID
  );
  const attest = await (program.account as any).attestation.fetch(attestPda);
  assert(attest.agent.toBase58() === walletKeypair.publicKey.toBase58(), "Attestation agent matches");
  assert(attest.authority.toBase58() === walletKeypair.publicKey.toBase58(), "Attestation authority matches");
  assert(JSON.stringify(attest.signalContributed) === JSON.stringify({ infraCloud: {} }), "Signal is InfraCloud");
  assert(attest.revoked === false, "Not revoked");
  assert(attest.expiresAt.toNumber() > Math.floor(Date.now() / 1000), "Not expired");
  assert(attest.createdAt.toNumber() > 0, "Has created_at timestamp");

  // ── Test 5: Register a second agent ──
  console.log("\nTest 5: Register Second Agent");
  const testAgent = Keypair.generate();
  // Airdrop some SOL to the test agent
  try {
    const sig = await connection.requestAirdrop(testAgent.publicKey, 0.05 * 1e9);
    await connection.confirmTransaction(sig);
  } catch (e) {
    console.log("  ⚠️  Airdrop may have rate-limited, trying with existing funds...");
  }

  const [testAgentPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("agent"), testAgent.publicKey.toBytes()], PROGRAM_ID
  );

  try {
    // Fund from our wallet instead of airdrop
    const transferTx = new anchor.web3.Transaction().add(
      SystemProgram.transfer({
        fromPubkey: walletKeypair.publicKey,
        toPubkey: testAgent.publicKey,
        lamports: 0.01 * 1e9,
      })
    );
    await provider.sendAndConfirm(transferTx);

    const tx = await program.methods.registerAgent("test-agent-v3")
      .accountsPartial({
        config: configPda, agent: testAgentPda,
        wallet: testAgent.publicKey, systemProgram: SystemProgram.programId
      }).signers([testAgent]).rpc();
    
    const newAgent = await (program.account as any).agentIdentity.fetch(testAgentPda);
    assert(newAgent.name === "test-agent-v3", "Second agent registered with correct name");
    assert(newAgent.trustScore === 0, "New agent has trust score 0");
    assert(JSON.stringify(newAgent.infraType) === JSON.stringify({ unknown: {} }), "New agent infra is Unknown");
    assert(newAgent.attestationCount === 0, "New agent has 0 attestations");
    console.log(`  📝 Agent PDA: ${testAgentPda.toBase58()}`);
    console.log(`  📝 Tx: ${tx}`);
  } catch (e: any) {
    console.log(`  ❌ Register second agent failed: ${e.message?.slice(0, 100)}`);
    failed++;
  }

  // ── Test 6: Attest the second agent ──
  console.log("\nTest 6: Attest Second Agent (TEE signal)");
  const [testAttestPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("attestation"), testAgent.publicKey.toBytes(), walletKeypair.publicKey.toBytes()], PROGRAM_ID
  );

  try {
    const now = Math.floor(Date.now() / 1000);
    const hash = new Array(32).fill(0);
    Buffer.from("test-tee-attestation-v3").forEach((b, i) => { if (i < 32) hash[i] = b; });
    const teeQuote = new Array(32).fill(0);
    Buffer.from("mock-sgx-measurement").forEach((b, i) => { if (i < 32) teeQuote[i] = b; });

    const tx = await program.methods
      .submitAttestation({ infraTee: {} }, hash, teeQuote, new anchor.BN(now + 30 * 24 * 3600))
      .accountsPartial({
        config: configPda, authority: authPda, agent: testAgentPda,
        attestation: testAttestPda, authoritySigner: walletKeypair.publicKey,
        systemProgram: SystemProgram.programId
      }).signers([walletKeypair]).rpc();

    const att = await (program.account as any).attestation.fetch(testAttestPda);
    assert(JSON.stringify(att.signalContributed) === JSON.stringify({ infraTee: {} }), "Signal is InfraTEE");
    assert(att.teeQuote !== null, "TEE quote is stored");
    
    const updatedAgent = await (program.account as any).agentIdentity.fetch(testAgentPda);
    assert(JSON.stringify(updatedAgent.infraType) === JSON.stringify({ tee: {} }), "Agent infra upgraded to TEE");
    assert(updatedAgent.attestationCount === 1, "Agent attestation count is 1");
    console.log(`  📝 Tx: ${tx}`);
  } catch (e: any) {
    console.log(`  ❌ Attest failed: ${e.message?.slice(0, 150)}`);
    failed++;
  }

  // ── Test 7: Refresh signals (permissionless) ──
  console.log("\nTest 7: Refresh Signals (Permissionless)");
  try {
    const tx = await program.methods.refreshIdentitySignals()
      .accountsPartial({ config: configPda, agent: testAgentPda })
      .remainingAccounts([{ pubkey: testAttestPda, isWritable: false, isSigner: false }])
      .rpc();

    const refreshed = await (program.account as any).agentIdentity.fetch(testAgentPda);
    assert(refreshed.trustScore === 45, "Refreshed trust score is 45 (20 base + 25 TEE)");
    assert(JSON.stringify(refreshed.infraType) === JSON.stringify({ tee: {} }), "Infra still TEE after refresh");
    console.log(`  📝 Tx: ${tx}`);
  } catch (e: any) {
    console.log(`  ❌ Refresh failed: ${e.message?.slice(0, 150)}`);
    failed++;
  }

  // ── Test 8: Flag agent ──
  console.log("\nTest 8: Flag Agent");
  try {
    const reasonHash = new Array(32).fill(0);
    Buffer.from("test-flagging-reason").forEach((b, i) => { if (i < 32) reasonHash[i] = b; });

    const tx = await program.methods.flagAgent(reasonHash)
      .accountsPartial({
        config: configPda, authority: authPda, agent: testAgentPda,
        authoritySigner: walletKeypair.publicKey
      }).signers([walletKeypair]).rpc();

    const flagged = await (program.account as any).agentIdentity.fetch(testAgentPda);
    assert(flagged.isFlagged === true, "Agent is flagged");
    assert(flagged.trustScore === 0, "Flagged agent trust score is 0");
    console.log(`  📝 Tx: ${tx}`);
  } catch (e: any) {
    console.log(`  ❌ Flag failed: ${e.message?.slice(0, 100)}`);
    failed++;
  }

  // ── Test 9: Unflag agent ──
  console.log("\nTest 9: Unflag Agent (Admin Only)");
  try {
    const tx = await program.methods.unflagAgent()
      .accountsPartial({ config: configPda, agent: testAgentPda, admin: walletKeypair.publicKey })
      .signers([walletKeypair]).rpc();

    const unflagged = await (program.account as any).agentIdentity.fetch(testAgentPda);
    assert(unflagged.isFlagged === false, "Agent is unflagged");
    console.log(`  📝 Tx: ${tx}`);
  } catch (e: any) {
    console.log(`  ❌ Unflag failed: ${e.message?.slice(0, 100)}`);
    failed++;
  }

  // ── Test 10: Revoke attestation ──
  console.log("\nTest 10: Revoke Attestation");
  try {
    const tx = await program.methods.revokeAttestation()
      .accountsPartial({
        config: configPda, attestation: testAttestPda,
        authoritySigner: walletKeypair.publicKey
      }).signers([walletKeypair]).rpc();

    const revoked = await (program.account as any).attestation.fetch(testAttestPda);
    assert(revoked.revoked === true, "Attestation is revoked");

    const configAfter = await (program.account as any).protocolConfig.fetch(configPda);
    assert(configAfter.revocationNonce.toNumber() >= 1, "Revocation nonce incremented");
    console.log(`  📝 Tx: ${tx}`);
  } catch (e: any) {
    console.log(`  ❌ Revoke failed: ${e.message?.slice(0, 100)}`);
    failed++;
  }

  // ── Test 11: Refresh after revocation (signals should reset) ──
  console.log("\nTest 11: Refresh After Revocation");
  try {
    const tx = await program.methods.refreshIdentitySignals()
      .accountsPartial({ config: configPda, agent: testAgentPda })
      .remainingAccounts([{ pubkey: testAttestPda, isWritable: false, isSigner: false }])
      .rpc();

    const afterRevoke = await (program.account as any).agentIdentity.fetch(testAgentPda);
    assert(afterRevoke.trustScore === 0, "Trust score is 0 after revoked attestation");
    assert(afterRevoke.attestationCount === 0, "Attestation count is 0 after revocation");
    assert(JSON.stringify(afterRevoke.infraType) === JSON.stringify({ unknown: {} }), "Infra reset to Unknown");
    console.log(`  📝 Tx: ${tx}`);
  } catch (e: any) {
    console.log(`  ❌ Refresh after revoke failed: ${e.message?.slice(0, 150)}`);
    failed++;
  }

  // ── Summary ──
  console.log(`\n${"=".repeat(40)}`);
  console.log(`RESULTS: ${passed} passed, ${failed} failed, ${passed + failed} total`);
  console.log(`${"=".repeat(40)}`);
  
  if (failed === 0) {
    console.log("\n🎉 ALL TESTS PASSED!");
  } else {
    console.log(`\n⚠️  ${failed} test(s) failed.`);
  }
}

main().catch(console.error);
