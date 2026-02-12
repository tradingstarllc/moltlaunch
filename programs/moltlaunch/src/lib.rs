use anchor_lang::prelude::*;

declare_id!("6AZSAhq4iJTwCfGEVssoa1p3GnBqGkbcQ1iDdP1U1pSb");

// =============================================================================
// MoltLaunch V3 — Composable Signal Architecture
//
// 4 PDAs:  ProtocolConfig, Authority, AgentIdentity, Attestation
// 9 Instructions: initialize, add_authority, remove_authority, register_agent,
//   submit_attestation, revoke_attestation, flag_agent, unflag_agent,
//   refresh_identity_signals
// =============================================================================

#[program]
pub mod moltlaunch {
    use super::*;

    // =========================================================================
    // 1. initialize — create the singleton ProtocolConfig
    // =========================================================================
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let config = &mut ctx.accounts.config;
        config.admin = ctx.accounts.admin.key();
        config.revocation_nonce = 0;
        config.total_agents = 0;
        config.total_attestations = 0;
        config.paused = false;
        config.bump = ctx.bumps.config;
        Ok(())
    }

    // =========================================================================
    // 2. add_authority — admin registers a new verification authority
    // =========================================================================
    pub fn add_authority(
        ctx: Context<AddAuthority>,
        authority_type: AuthorityType,
    ) -> Result<()> {
        let config = &ctx.accounts.config;
        require!(!config.paused, MoltError::ProtocolPaused);
        require!(
            ctx.accounts.admin.key() == config.admin,
            MoltError::Unauthorized
        );

        let authority = &mut ctx.accounts.authority;
        authority.pubkey = ctx.accounts.authority_pubkey.key();
        authority.authority_type = authority_type.clone();
        authority.attestation_count = 0;
        authority.active = true;
        authority.added_by = ctx.accounts.admin.key();
        authority.added_at = Clock::get()?.unix_timestamp;
        authority.bump = ctx.bumps.authority;

        emit!(AuthorityAdded {
            authority: authority.pubkey,
            authority_type,
        });

        Ok(())
    }

    // =========================================================================
    // 3. remove_authority — admin deactivates an authority, bumps nonce
    // =========================================================================
    pub fn remove_authority(ctx: Context<RemoveAuthority>) -> Result<()> {
        let config = &mut ctx.accounts.config;
        require!(!config.paused, MoltError::ProtocolPaused);
        require!(
            ctx.accounts.admin.key() == config.admin,
            MoltError::Unauthorized
        );

        let authority = &mut ctx.accounts.authority;
        authority.active = false;

        // Increment global revocation nonce
        config.revocation_nonce = config.revocation_nonce.checked_add(1).unwrap();

        emit!(AuthorityRemoved {
            authority: authority.pubkey,
        });

        Ok(())
    }

    // =========================================================================
    // 4. register_agent — anyone creates their AgentIdentity PDA
    // =========================================================================
    pub fn register_agent(ctx: Context<RegisterAgent>, name: String) -> Result<()> {
        let config = &mut ctx.accounts.config;
        require!(!config.paused, MoltError::ProtocolPaused);
        require!(name.len() <= 32, MoltError::NameTooLong);

        let agent = &mut ctx.accounts.agent;
        agent.wallet = ctx.accounts.wallet.key();
        agent.infra_type = InfraType::Unknown;
        agent.has_economic_stake = false;
        agent.has_hardware_binding = false;
        agent.attestation_count = 0;
        agent.is_flagged = false;
        agent.trust_score = 0;
        agent.last_verified = 0;
        agent.nonce = config.revocation_nonce;
        agent.registered_at = Clock::get()?.unix_timestamp;
        agent.name = name.clone();
        agent.bump = ctx.bumps.agent;

        config.total_agents = config.total_agents.checked_add(1).unwrap();

        emit!(AgentRegistered {
            wallet: agent.wallet,
            name,
        });

        Ok(())
    }

    // =========================================================================
    // 5. submit_attestation — authority attests a signal for an agent
    // =========================================================================
    pub fn submit_attestation(
        ctx: Context<SubmitAttestation>,
        signal_type: SignalType,
        attestation_hash: [u8; 32],
        tee_quote: Option<[u8; 32]>,
        expires_at: i64,
    ) -> Result<()> {
        let config = &mut ctx.accounts.config;
        require!(!config.paused, MoltError::ProtocolPaused);

        let authority_account = &mut ctx.accounts.authority;
        require!(authority_account.active, MoltError::AuthorityNotActive);

        let agent = &mut ctx.accounts.agent;
        require!(!agent.is_flagged, MoltError::AgentFlagged);

        let now = Clock::get()?.unix_timestamp;

        // Expiry must be in the future
        require!(expires_at > now, MoltError::AttestationExpired);

        // Create the attestation
        let attestation = &mut ctx.accounts.attestation;
        attestation.agent = agent.wallet;
        attestation.authority = ctx.accounts.authority_signer.key();
        attestation.authority_type = authority_account.authority_type.clone();
        attestation.signal_contributed = signal_type.clone();
        attestation.attestation_hash = attestation_hash;
        attestation.tee_quote = tee_quote;
        attestation.created_at = now;
        attestation.expires_at = expires_at;
        attestation.revoked = false;
        attestation.bump = ctx.bumps.attestation;

        // Update the agent's signal flags — upgrade only, never downgrade
        match signal_type {
            SignalType::InfraCloud => {
                if agent.infra_type == InfraType::Unknown {
                    agent.infra_type = InfraType::Cloud;
                }
            }
            SignalType::InfraTEE => {
                if agent.infra_type == InfraType::Unknown || agent.infra_type == InfraType::Cloud {
                    agent.infra_type = InfraType::TEE;
                }
            }
            SignalType::InfraDePIN => {
                agent.infra_type = InfraType::DePIN; // DePIN is always highest
            }
            SignalType::EconomicStake => agent.has_economic_stake = true,
            SignalType::HardwareBinding => agent.has_hardware_binding = true,
            SignalType::General => {}
        }

        agent.attestation_count = agent.attestation_count.checked_add(1).unwrap();
        agent.last_verified = now;

        authority_account.attestation_count = authority_account
            .attestation_count
            .checked_add(1)
            .unwrap();

        config.total_attestations = config.total_attestations.checked_add(1).unwrap();

        emit!(AttestationSubmitted {
            agent: agent.wallet,
            authority: ctx.accounts.authority_signer.key(),
            signal_type,
        });

        Ok(())
    }

    // =========================================================================
    // 6. revoke_attestation — authority revokes their own attestation
    // =========================================================================
    pub fn revoke_attestation(ctx: Context<RevokeAttestation>) -> Result<()> {
        let config = &mut ctx.accounts.config;
        require!(!config.paused, MoltError::ProtocolPaused);

        let attestation = &mut ctx.accounts.attestation;

        // Authority can only revoke their own attestation
        require!(
            attestation.authority == ctx.accounts.authority_signer.key(),
            MoltError::Unauthorized
        );

        attestation.revoked = true;

        config.revocation_nonce = config.revocation_nonce.checked_add(1).unwrap();

        emit!(AttestationRevoked {
            agent: attestation.agent,
            authority: attestation.authority,
        });

        Ok(())
    }

    // =========================================================================
    // 7. flag_agent — an active authority flags an agent
    // =========================================================================
    pub fn flag_agent(
        ctx: Context<FlagAgent>,
        reason_hash: [u8; 32],
    ) -> Result<()> {
        let config = &ctx.accounts.config;
        require!(!config.paused, MoltError::ProtocolPaused);

        let authority_account = &ctx.accounts.authority;
        require!(authority_account.active, MoltError::AuthorityNotActive);

        let agent = &mut ctx.accounts.agent;
        agent.is_flagged = true;
        agent.trust_score = 0;

        emit!(AgentFlagged {
            agent: agent.wallet,
            authority: ctx.accounts.authority_signer.key(),
            reason_hash,
        });

        Ok(())
    }

    // =========================================================================
    // 8. unflag_agent — admin clears the flag
    // =========================================================================
    pub fn unflag_agent(ctx: Context<UnflagAgent>) -> Result<()> {
        let config = &ctx.accounts.config;
        require!(!config.paused, MoltError::ProtocolPaused);
        require!(
            ctx.accounts.admin.key() == config.admin,
            MoltError::Unauthorized
        );

        let agent = &mut ctx.accounts.agent;
        agent.is_flagged = false;

        emit!(AgentUnflagged {
            agent: agent.wallet,
        });

        Ok(())
    }

    // =========================================================================
    // 9. refresh_identity_signals — PERMISSIONLESS trust score recalculation
    //    Reads attestation PDAs from remaining_accounts, resets & rebuilds.
    // =========================================================================
    pub fn refresh_identity_signals<'info>(
        ctx: Context<'_, '_, 'info, 'info, RefreshIdentitySignals<'info>>,
    ) -> Result<()> {
        let config = &ctx.accounts.config;
        let agent = &mut ctx.accounts.agent;
        let old_score = agent.trust_score;

        // Reset all signals
        agent.infra_type = InfraType::Unknown;
        agent.has_economic_stake = false;
        agent.has_hardware_binding = false;
        agent.attestation_count = 0;
        agent.last_verified = 0;

        let now = Clock::get()?.unix_timestamp;
        let program_id = crate::ID;

        // Rebuild from remaining accounts (attestation PDAs)
        for account_info in ctx.remaining_accounts.iter() {
            // Must be owned by our program
            if account_info.owner != &program_id {
                continue;
            }

            let data = account_info.try_borrow_data()?;
            // Minimum size: 8 (discriminator) + Attestation fields
            if data.len() < 8 + Attestation::INIT_SPACE {
                continue;
            }

            // Check discriminator matches Attestation
            let disc = &data[..8];
            if disc != Attestation::DISCRIMINATOR {
                continue;
            }

            // Deserialize the account data (skip 8-byte discriminator)
            let attestation: Attestation =
                Attestation::try_deserialize(&mut &data[..]).map_err(|_| MoltError::InvalidSignalType)?;

            // Skip if not for this agent
            if attestation.agent != agent.wallet {
                continue;
            }
            // Skip revoked
            if attestation.revoked {
                continue;
            }
            // Skip expired
            if attestation.expires_at > 0 && attestation.expires_at < now {
                continue;
            }

            // Apply signal
            match attestation.signal_contributed {
                SignalType::InfraCloud => {
                    if (agent.infra_type.clone() as u8) < (InfraType::Cloud as u8) {
                        agent.infra_type = InfraType::Cloud;
                    }
                }
                SignalType::InfraTEE => {
                    if (agent.infra_type.clone() as u8) < (InfraType::TEE as u8) {
                        agent.infra_type = InfraType::TEE;
                    }
                }
                SignalType::InfraDePIN => {
                    agent.infra_type = InfraType::DePIN; // highest
                }
                SignalType::EconomicStake => agent.has_economic_stake = true,
                SignalType::HardwareBinding => agent.has_hardware_binding = true,
                SignalType::General => {}
            }

            agent.attestation_count = agent.attestation_count.saturating_add(1);
            if attestation.created_at > agent.last_verified {
                agent.last_verified = attestation.created_at;
            }
        }

        // Derive trust score
        let mut score: u8 = 0;
        if agent.attestation_count >= 1 {
            score = score.saturating_add(20);
        }
        match agent.infra_type {
            InfraType::Cloud => score = score.saturating_add(10),
            InfraType::TEE => score = score.saturating_add(25),
            InfraType::DePIN => score = score.saturating_add(35),
            InfraType::Unknown => {}
        }
        if agent.has_economic_stake {
            score = score.saturating_add(25);
        }
        if agent.has_hardware_binding {
            score = score.saturating_add(20);
        }
        if agent.is_flagged {
            score = 0;
        }

        agent.trust_score = score;
        agent.nonce = config.revocation_nonce;

        emit!(TrustScoreRefreshed {
            agent: agent.wallet,
            old_score,
            new_score: score,
        });

        Ok(())
    }

    // =========================================================================
    // 10. close_attestation — close a revoked attestation PDA, reclaim rent
    // =========================================================================
    pub fn close_attestation(ctx: Context<CloseAttestation>) -> Result<()> {
        let attestation = &ctx.accounts.attestation;
        require!(attestation.revoked, MoltError::AttestationNotRevoked);
        require!(
            attestation.authority == ctx.accounts.authority_signer.key(),
            MoltError::Unauthorized
        );
        // Account is closed via close = authority_signer in the Accounts struct
        emit!(AttestationRevoked {
            agent: attestation.agent,
            authority: attestation.authority,
        });
        Ok(())
    }

    // =========================================================================
    // 11. set_paused — admin can pause/unpause the protocol
    // =========================================================================
    pub fn set_paused(ctx: Context<AdminAction>, paused: bool) -> Result<()> {
        let config = &mut ctx.accounts.config;
        require!(
            ctx.accounts.admin.key() == config.admin,
            MoltError::Unauthorized
        );
        config.paused = paused;
        Ok(())
    }

    // =========================================================================
    // 12. transfer_admin — admin transfers admin role
    // =========================================================================
    pub fn transfer_admin(ctx: Context<AdminAction>, new_admin: Pubkey) -> Result<()> {
        let config = &mut ctx.accounts.config;
        require!(
            ctx.accounts.admin.key() == config.admin,
            MoltError::Unauthorized
        );
        config.admin = new_admin;
        Ok(())
    }
}

// =============================================================================
// Account Contexts
// =============================================================================

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = admin,
        space = 8 + ProtocolConfig::INIT_SPACE,
        seeds = [b"moltlaunch"],
        bump
    )]
    pub config: Account<'info, ProtocolConfig>,

    #[account(mut)]
    pub admin: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AddAuthority<'info> {
    #[account(
        seeds = [b"moltlaunch"],
        bump = config.bump,
    )]
    pub config: Account<'info, ProtocolConfig>,

    #[account(
        init,
        payer = admin,
        space = 8 + Authority::INIT_SPACE,
        seeds = [b"authority", authority_pubkey.key().as_ref()],
        bump
    )]
    pub authority: Account<'info, Authority>,

    /// CHECK: The pubkey of the authority being added (not necessarily a signer)
    pub authority_pubkey: UncheckedAccount<'info>,

    #[account(mut)]
    pub admin: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RemoveAuthority<'info> {
    #[account(
        mut,
        seeds = [b"moltlaunch"],
        bump = config.bump,
    )]
    pub config: Account<'info, ProtocolConfig>,

    #[account(
        mut,
        seeds = [b"authority", authority.pubkey.as_ref()],
        bump = authority.bump,
    )]
    pub authority: Account<'info, Authority>,

    pub admin: Signer<'info>,
}

#[derive(Accounts)]
pub struct RegisterAgent<'info> {
    #[account(
        mut,
        seeds = [b"moltlaunch"],
        bump = config.bump,
    )]
    pub config: Account<'info, ProtocolConfig>,

    #[account(
        init,
        payer = wallet,
        space = 8 + AgentIdentity::INIT_SPACE,
        seeds = [b"agent", wallet.key().as_ref()],
        bump
    )]
    pub agent: Account<'info, AgentIdentity>,

    #[account(mut)]
    pub wallet: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SubmitAttestation<'info> {
    #[account(
        mut,
        seeds = [b"moltlaunch"],
        bump = config.bump,
    )]
    pub config: Account<'info, ProtocolConfig>,

    #[account(
        mut,
        seeds = [b"authority", authority_signer.key().as_ref()],
        bump = authority.bump,
    )]
    pub authority: Account<'info, Authority>,

    #[account(
        mut,
        seeds = [b"agent", agent.wallet.as_ref()],
        bump = agent.bump,
    )]
    pub agent: Account<'info, AgentIdentity>,

    #[account(
        init,
        payer = authority_signer,
        space = 8 + Attestation::INIT_SPACE,
        seeds = [b"attestation", agent.wallet.as_ref(), authority_signer.key().as_ref()],
        bump
    )]
    pub attestation: Account<'info, Attestation>,

    #[account(mut)]
    pub authority_signer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RevokeAttestation<'info> {
    #[account(
        mut,
        seeds = [b"moltlaunch"],
        bump = config.bump,
    )]
    pub config: Account<'info, ProtocolConfig>,

    #[account(
        mut,
        seeds = [b"attestation", attestation.agent.as_ref(), attestation.authority.as_ref()],
        bump = attestation.bump,
    )]
    pub attestation: Account<'info, Attestation>,

    pub authority_signer: Signer<'info>,
}

#[derive(Accounts)]
pub struct FlagAgent<'info> {
    #[account(
        seeds = [b"moltlaunch"],
        bump = config.bump,
    )]
    pub config: Account<'info, ProtocolConfig>,

    #[account(
        seeds = [b"authority", authority_signer.key().as_ref()],
        bump = authority.bump,
    )]
    pub authority: Account<'info, Authority>,

    #[account(
        mut,
        seeds = [b"agent", agent.wallet.as_ref()],
        bump = agent.bump,
    )]
    pub agent: Account<'info, AgentIdentity>,

    pub authority_signer: Signer<'info>,
}

#[derive(Accounts)]
pub struct UnflagAgent<'info> {
    #[account(
        seeds = [b"moltlaunch"],
        bump = config.bump,
    )]
    pub config: Account<'info, ProtocolConfig>,

    #[account(
        mut,
        seeds = [b"agent", agent.wallet.as_ref()],
        bump = agent.bump,
    )]
    pub agent: Account<'info, AgentIdentity>,

    pub admin: Signer<'info>,
}

#[derive(Accounts)]
pub struct RefreshIdentitySignals<'info> {
    #[account(
        seeds = [b"moltlaunch"],
        bump = config.bump,
    )]
    pub config: Account<'info, ProtocolConfig>,

    #[account(
        mut,
        seeds = [b"agent", agent.wallet.as_ref()],
        bump = agent.bump,
    )]
    pub agent: Account<'info, AgentIdentity>,
}

#[derive(Accounts)]
pub struct CloseAttestation<'info> {
    #[account(
        mut,
        close = authority_signer,
        seeds = [b"attestation", attestation.agent.as_ref(), attestation.authority.as_ref()],
        bump = attestation.bump,
    )]
    pub attestation: Account<'info, Attestation>,

    #[account(mut)]
    pub authority_signer: Signer<'info>,
}

#[derive(Accounts)]
pub struct AdminAction<'info> {
    #[account(
        mut,
        seeds = [b"moltlaunch"],
        bump = config.bump,
    )]
    pub config: Account<'info, ProtocolConfig>,

    pub admin: Signer<'info>,
}

// =============================================================================
// State Accounts
// =============================================================================

/// Singleton protocol configuration — seeds: ["moltlaunch"]
#[account]
#[derive(InitSpace)]
pub struct ProtocolConfig {
    pub admin: Pubkey,           // 32
    pub revocation_nonce: u64,   // 8
    pub total_agents: u64,       // 8
    pub total_attestations: u64, // 8
    pub paused: bool,            // 1
    pub bump: u8,                // 1
}

/// Authority — one per authorized verifier. Seeds: ["authority", pubkey]
#[account]
#[derive(InitSpace)]
pub struct Authority {
    pub pubkey: Pubkey,                  // 32
    pub authority_type: AuthorityType,   // 1
    pub attestation_count: u64,          // 8
    pub active: bool,                    // 1
    pub added_by: Pubkey,                // 32
    pub added_at: i64,                   // 8
    pub bump: u8,                        // 1
}

/// AgentIdentity — the composable signal hub. Seeds: ["agent", wallet]
#[account]
#[derive(InitSpace)]
pub struct AgentIdentity {
    pub wallet: Pubkey,              // 32
    pub infra_type: InfraType,       // 1
    pub has_economic_stake: bool,    // 1
    pub has_hardware_binding: bool,  // 1
    pub attestation_count: u8,       // 1
    pub is_flagged: bool,            // 1
    pub trust_score: u8,             // 1
    pub last_verified: i64,          // 8
    pub nonce: u64,                  // 8
    pub registered_at: i64,          // 8
    #[max_len(32)]
    pub name: String,                // 4 + 32
    pub bump: u8,                    // 1
}

/// Attestation — one per (agent, authority) pair.
/// Seeds: ["attestation", agent_wallet, authority_pubkey]
#[account]
#[derive(InitSpace)]
pub struct Attestation {
    pub agent: Pubkey,                       // 32
    pub authority: Pubkey,                   // 32
    pub authority_type: AuthorityType,       // 1
    pub signal_contributed: SignalType,       // 1
    pub attestation_hash: [u8; 32],          // 32
    pub tee_quote: Option<[u8; 32]>,         // 1 + 32
    pub created_at: i64,                     // 8
    pub expires_at: i64,                     // 8
    pub revoked: bool,                       // 1
    pub bump: u8,                            // 1
}

// =============================================================================
// Enums
// =============================================================================

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, InitSpace)]
pub enum AuthorityType {
    Single,
    MultisigMember,
    OracleOperator,
    NCNValidator,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, InitSpace)]
pub enum InfraType {
    Unknown,
    Cloud,
    TEE,
    DePIN,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, InitSpace)]
pub enum SignalType {
    InfraCloud,
    InfraTEE,
    InfraDePIN,
    EconomicStake,
    HardwareBinding,
    General,
}

// =============================================================================
// Events
// =============================================================================

#[event]
pub struct AgentRegistered {
    pub wallet: Pubkey,
    pub name: String,
}

#[event]
pub struct AttestationSubmitted {
    pub agent: Pubkey,
    pub authority: Pubkey,
    pub signal_type: SignalType,
}

#[event]
pub struct AttestationRevoked {
    pub agent: Pubkey,
    pub authority: Pubkey,
}

#[event]
pub struct AgentFlagged {
    pub agent: Pubkey,
    pub authority: Pubkey,
    pub reason_hash: [u8; 32],
}

#[event]
pub struct AgentUnflagged {
    pub agent: Pubkey,
}

#[event]
pub struct TrustScoreRefreshed {
    pub agent: Pubkey,
    pub old_score: u8,
    pub new_score: u8,
}

#[event]
pub struct AuthorityAdded {
    pub authority: Pubkey,
    pub authority_type: AuthorityType,
}

#[event]
pub struct AuthorityRemoved {
    pub authority: Pubkey,
}

// =============================================================================
// Errors
// =============================================================================

#[error_code]
pub enum MoltError {
    #[msg("Unauthorized")]
    Unauthorized,

    #[msg("Agent already registered")]
    AgentAlreadyRegistered,

    #[msg("Agent not found")]
    AgentNotFound,

    #[msg("Authority is not active")]
    AuthorityNotActive,

    #[msg("Attestation already exists")]
    AttestationAlreadyExists,

    #[msg("Attestation has expired")]
    AttestationExpired,

    #[msg("Agent is flagged")]
    AgentFlagged,

    #[msg("Protocol is paused")]
    ProtocolPaused,

    #[msg("Name too long (max 32 characters)")]
    NameTooLong,

    #[msg("Invalid signal type")]
    InvalidSignalType,

    #[msg("Attestation is not revoked")]
    AttestationNotRevoked,
}
