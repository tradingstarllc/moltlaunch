
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";

const idlPath = path.resolve(process.cwd(), "target/idl/moltlaunch.json");
const idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));
const PROGRAM_ID = new PublicKey("6AZSAhq4iJTwCfGEVssoa1p3GnBqGkbcQ1iDdP1U1pSb");

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

  console.log("Wallet:", walletKeypair.publicKey.toBase58());
  console.log("Program:", PROGRAM_ID.toBase58());

  const [configPda] = PublicKey.findProgramAddressSync([Buffer.from("moltlaunch")], PROGRAM_ID);
  console.log("Config PDA:", configPda.toBase58());

  // 1. Initialize
  try {
    const configAccount = await (program.account as any).protocolConfig.fetch(configPda);
    console.log("\n✅ Protocol already initialized!");
    console.log("  Admin:", configAccount.admin.toBase58());
    console.log("  Total agents:", configAccount.totalAgents.toString());
    console.log("  Revocation nonce:", configAccount.revocationNonce.toString());
  } catch (e) {
    console.log("\nInitializing protocol...");
    const tx = await program.methods.initialize()
      .accountsPartial({ config: configPda, admin: walletKeypair.publicKey, systemProgram: SystemProgram.programId })
      .signers([walletKeypair]).rpc();
    console.log("✅ Initialized! Tx:", tx);
  }

  // 2. Add authority
  const [authorityPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("authority"), walletKeypair.publicKey.toBytes()], PROGRAM_ID
  );
  console.log("\nAuthority PDA:", authorityPda.toBase58());

  try {
    const auth = await (program.account as any).authority.fetch(authorityPda);
    console.log("✅ Authority already registered! Type:", JSON.stringify(auth.authorityType), "Active:", auth.active);
  } catch (e) {
    console.log("Adding authority (Single)...");
    const tx = await program.methods.addAuthority({ single: {} })
      .accountsPartial({
        config: configPda, authority: authorityPda,
        authorityPubkey: walletKeypair.publicKey, admin: walletKeypair.publicKey,
        systemProgram: SystemProgram.programId
      }).signers([walletKeypair]).rpc();
    console.log("✅ Authority added! Tx:", tx);
  }

  // 3. Register agent
  const [agentPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("agent"), walletKeypair.publicKey.toBytes()], PROGRAM_ID
  );
  console.log("\nAgent PDA:", agentPda.toBase58());

  try {
    const agent = await (program.account as any).agentIdentity.fetch(agentPda);
    console.log("✅ Agent already registered! Name:", agent.name, "Score:", agent.trustScore);
  } catch (e) {
    console.log("Registering agent (moltlaunch-agent)...");
    const tx = await program.methods.registerAgent("moltlaunch-agent")
      .accountsPartial({
        config: configPda, agent: agentPda,
        wallet: walletKeypair.publicKey, systemProgram: SystemProgram.programId
      }).signers([walletKeypair]).rpc();
    console.log("✅ Agent registered! Tx:", tx);
  }

  // 4. Submit attestation
  const [attestPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("attestation"), walletKeypair.publicKey.toBytes(), walletKeypair.publicKey.toBytes()], PROGRAM_ID
  );
  console.log("\nAttestation PDA:", attestPda.toBase58());

  try {
    const att = await (program.account as any).attestation.fetch(attestPda);
    console.log("✅ Attestation exists! Signal:", JSON.stringify(att.signalContributed), "Revoked:", att.revoked);
  } catch (e) {
    console.log("Submitting attestation (Cloud infra)...");
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + 30 * 24 * 60 * 60;
    const hash = new Array(32).fill(0);
    Buffer.from("moltlaunch-v3-self-attest").forEach((b, i) => { if (i < 32) hash[i] = b; });

    const tx = await program.methods
      .submitAttestation({ infraCloud: {} }, hash, null, new anchor.BN(expiresAt))
      .accountsPartial({
        config: configPda, authority: authorityPda, agent: agentPda,
        attestation: attestPda, authoritySigner: walletKeypair.publicKey,
        systemProgram: SystemProgram.programId
      }).signers([walletKeypair]).rpc();
    console.log("✅ Attestation submitted! Tx:", tx);
  }

  // 5. Refresh signals
  console.log("\nRefreshing identity signals...");
  try {
    const tx = await program.methods.refreshIdentitySignals()
      .accountsPartial({ config: configPda, agent: agentPda })
      .remainingAccounts([{ pubkey: attestPda, isWritable: false, isSigner: false }])
      .rpc();
    console.log("✅ Signals refreshed! Tx:", tx);
  } catch (e: any) {
    console.log("Refresh error:", e.message?.slice(0, 200));
  }

  // Final state
  console.log("\n=== FINAL STATE ===");
  const finalAgent = await (program.account as any).agentIdentity.fetch(agentPda);
  console.log("Agent:", finalAgent.name);
  console.log("  Infra type:", JSON.stringify(finalAgent.infraType));
  console.log("  Trust score:", finalAgent.trustScore);
  console.log("  Attestation count:", finalAgent.attestationCount);
  console.log("  Economic stake:", finalAgent.hasEconomicStake);
  console.log("  Hardware binding:", finalAgent.hasHardwareBinding);
  console.log("  Flagged:", finalAgent.isFlagged);
  console.log("  Nonce:", finalAgent.nonce.toString());

  const finalConfig = await (program.account as any).protocolConfig.fetch(configPda);
  console.log("\nProtocol:");
  console.log("  Total agents:", finalConfig.totalAgents.toString());
  console.log("  Total attestations:", finalConfig.totalAttestations.toString());
  console.log("  Revocation nonce:", finalConfig.revocationNonce.toString());
}

main().catch(console.error);
