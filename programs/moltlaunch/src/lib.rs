use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer, MintTo};

// NOTE: Program ID needs redeployment after SAP identity instructions were added
declare_id!("6AZSAhq4iJTwCfGEVssoa1p3GnBqGkbcQ1iDdP1U1pSb");

#[program]
pub mod moltlaunch {
    use super::*;

    /// Initialize the launchpad configuration
    pub fn initialize(ctx: Context<Initialize>, config: LaunchpadConfig) -> Result<()> {
        let launchpad = &mut ctx.accounts.launchpad;
        launchpad.authority = ctx.accounts.authority.key();
        launchpad.treasury = ctx.accounts.treasury.key();
        launchpad.platform_fee_bps = config.platform_fee_bps;
        launchpad.min_raise = config.min_raise;
        launchpad.max_raise = config.max_raise;
        launchpad.bump = ctx.bumps.launchpad;
        Ok(())
    }

    /// Register a new agent for verification
    pub fn register_agent(
        ctx: Context<RegisterAgent>,
        name: String,
        capabilities: Vec<String>,
        proof_url: String,
    ) -> Result<()> {
        let agent = &mut ctx.accounts.agent;
        agent.owner = ctx.accounts.owner.key();
        agent.name = name;
        agent.capabilities = capabilities;
        agent.proof_url = proof_url;
        agent.verified = false;
        agent.created_at = Clock::get()?.unix_timestamp;
        agent.bump = ctx.bumps.agent;
        Ok(())
    }

    /// Verify an agent (admin only)
    pub fn verify_agent(ctx: Context<VerifyAgent>) -> Result<()> {
        let agent = &mut ctx.accounts.agent;
        agent.verified = true;
        agent.verified_at = Some(Clock::get()?.unix_timestamp);
        Ok(())
    }

    /// Create a new token launch with bonding curve
    pub fn create_launch(
        ctx: Context<CreateLaunch>,
        params: LaunchParams,
    ) -> Result<()> {
        require!(ctx.accounts.agent.verified, ErrorCode::AgentNotVerified);

        let launch = &mut ctx.accounts.launch;
        launch.agent = ctx.accounts.agent.key();
        launch.mint = ctx.accounts.mint.key();
        launch.name = params.name;
        launch.symbol = params.symbol;
        launch.target_raise = params.target_raise;
        launch.current_raise = 0;
        launch.token_supply = params.token_supply;
        launch.tokens_sold = 0;
        launch.bonding_curve_type = params.bonding_curve_type;
        launch.start_time = params.start_time;
        launch.end_time = params.end_time;
        launch.status = LaunchStatus::Pending;
        launch.bump = ctx.bumps.launch;
        
        Ok(())
    }

    /// Buy tokens from bonding curve
    pub fn buy_tokens(ctx: Context<BuyTokens>, sol_amount: u64) -> Result<()> {
        // Read fields before mutable borrow
        let status = ctx.accounts.launch.status;
        let start_time = ctx.accounts.launch.start_time;
        let end_time = ctx.accounts.launch.end_time;
        let curve_type = ctx.accounts.launch.bonding_curve_type;
        let current_raise = ctx.accounts.launch.current_raise;
        let target_raise = ctx.accounts.launch.target_raise;
        let token_supply = ctx.accounts.launch.token_supply;
        let agent_key = ctx.accounts.launch.agent;
        let bump = ctx.accounts.launch.bump;
        
        require!(status == LaunchStatus::Active, ErrorCode::LaunchNotActive);
        
        let clock = Clock::get()?;
        require!(clock.unix_timestamp >= start_time, ErrorCode::LaunchNotStarted);
        require!(clock.unix_timestamp <= end_time, ErrorCode::LaunchEnded);

        // Calculate tokens based on bonding curve
        let token_amount = calculate_tokens_out(
            curve_type,
            current_raise,
            sol_amount,
            target_raise,
            token_supply,
        )?;

        // Transfer SOL to vault
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: ctx.accounts.buyer.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
            },
        );
        anchor_lang::system_program::transfer(cpi_context, sol_amount)?;

        // Mint tokens to buyer
        let seeds = &[
            b"launch",
            agent_key.as_ref(),
            &[bump],
        ];
        let signer = &[&seeds[..]];

        let cpi_accounts = MintTo {
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.buyer_token_account.to_account_info(),
            authority: ctx.accounts.launch.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::mint_to(cpi_ctx, token_amount)?;

        // Update launch state
        let launch = &mut ctx.accounts.launch;
        launch.current_raise += sol_amount;
        launch.tokens_sold += token_amount;

        // Check if graduated
        if launch.current_raise >= target_raise {
            launch.status = LaunchStatus::Graduated;
        }

        Ok(())
    }

    /// Finalize launch and create Raydium pool (when graduated)
    pub fn finalize_launch(ctx: Context<FinalizeLaunch>) -> Result<()> {
        let launch = &mut ctx.accounts.launch;
        require!(launch.status == LaunchStatus::Graduated, ErrorCode::NotGraduated);
        
        // TODO: Integrate with Raydium to create AMM pool
        // This will transfer liquidity from vault to Raydium

        launch.status = LaunchStatus::Finalized;
        Ok(())
    }

    // ============ SAP Identity Instructions ============

    /// Register a hardware-anchored identity PDA for an agent
    pub fn register_identity(
        ctx: Context<RegisterIdentity>,
        identity_hash: [u8; 32],
        trust_level: u8,
        attestation_method: String,
    ) -> Result<()> {
        require!(trust_level <= 5, ErrorCode::InvalidTrustLevel);
        let identity = &mut ctx.accounts.identity;
        identity.owner = ctx.accounts.owner.key();
        identity.identity_hash = identity_hash;
        identity.trust_level = trust_level;
        identity.attestation_method = attestation_method;
        identity.score = 0;
        identity.depin_device = None;
        identity.depin_provider = None;
        identity.sybil_flagged = false;
        identity.sybil_match = None;
        identity.last_attestation = [0u8; 32];
        identity.last_evidence = [0u8; 32];
        identity.registered_at = Clock::get()?.unix_timestamp;
        identity.expires_at = Clock::get()?.unix_timestamp + (30 * 24 * 60 * 60); // 30 days
        identity.attested_at = None;
        identity.previous_identity_hash = None;
        identity.rotated_at = None;
        identity.delegate = None;
        identity.delegation_scope = None;
        identity.delegation_expires = None;
        identity.bump = ctx.bumps.identity;

        emit!(IdentityRegistered {
            owner: identity.owner,
            identity_hash,
            trust_level,
        });

        Ok(())
    }

    /// Record a PoA verification score on-chain (authority only)
    pub fn attest_verification(
        ctx: Context<AttestVerification>,
        score: u8,
        _tier: String,
        attestation_hash: [u8; 32],
    ) -> Result<()> {
        let identity = &mut ctx.accounts.identity;
        identity.score = score;
        identity.last_attestation = attestation_hash;
        identity.attested_at = Some(Clock::get()?.unix_timestamp);

        emit!(VerificationAttested {
            owner: identity.owner,
            score,
            attestation_hash,
        });

        Ok(())
    }

    /// Link identity to a DePIN device PDA
    pub fn bind_depin_device(
        ctx: Context<BindDePINDevice>,
        depin_provider: String,
        _device_id: String,
    ) -> Result<()> {
        require!(ctx.accounts.device_pda.lamports() > 0, ErrorCode::DePINDeviceNotFound);
        let identity = &mut ctx.accounts.identity;
        identity.depin_device = Some(ctx.accounts.device_pda.key());
        identity.depin_provider = Some(depin_provider);
        identity.trust_level = 5; // DePIN = highest trust

        emit!(DePINBound {
            owner: identity.owner,
            device_pda: ctx.accounts.device_pda.key(),
        });

        Ok(())
    }

    /// Flag an identity as a Sybil (authority only)
    pub fn flag_sybil(
        ctx: Context<FlagSybil>,
        reason: String,
        matching_identity: Pubkey,
    ) -> Result<()> {
        let identity = &mut ctx.accounts.identity;
        identity.sybil_flagged = true;
        identity.sybil_match = Some(matching_identity);
        identity.trust_level = 0; // Reset trust

        emit!(SybilFlagged {
            owner: identity.owner,
            matching_identity,
            reason,
        });

        Ok(())
    }

    /// Update trust level after new attestation (owner only)
    pub fn update_trust_level(
        ctx: Context<UpdateTrustLevel>,
        new_level: u8,
        evidence_hash: [u8; 32],
    ) -> Result<()> {
        require!(new_level <= 5, ErrorCode::InvalidTrustLevel);
        let identity = &mut ctx.accounts.identity;
        let old_level = identity.trust_level;
        identity.trust_level = new_level;
        identity.last_evidence = evidence_hash;

        emit!(TrustLevelUpdated {
            owner: identity.owner,
            old_level,
            new_level,
        });

        Ok(())
    }

    // ============ Identity Rotation & Delegation Instructions ============

    /// Rotate identity to a new hardware fingerprint (preserves score, drops trust)
    pub fn rotate_identity(
        ctx: Context<RotateIdentity>,
        new_identity_hash: [u8; 32],
        migration_proof: [u8; 32],
    ) -> Result<()> {
        let identity = &mut ctx.accounts.identity;

        // Store previous hash for audit trail
        identity.previous_identity_hash = Some(identity.identity_hash);
        identity.identity_hash = new_identity_hash;
        identity.rotated_at = Some(Clock::get()?.unix_timestamp);

        // Trust level drops on rotation (must re-attest with new hardware)
        if identity.trust_level > 2 {
            identity.trust_level = 2;
        }

        // Score preserved (behavioral history carries over)
        // Consistency proof resets implicitly (new hardware = new baseline)
        // Clear evidence since it's from old hardware
        identity.last_evidence = [0u8; 32];

        emit!(IdentityRotated {
            owner: identity.owner,
            old_hash: identity.previous_identity_hash.unwrap(),
            new_hash: new_identity_hash,
            migration_proof,
        });

        Ok(())
    }

    /// Delegate authority over this identity to another keypair
    pub fn delegate_authority(
        ctx: Context<DelegateAuthority>,
        delegate: Pubkey,
        scope: DelegationScope,
        expires_at: i64,
    ) -> Result<()> {
        let identity = &mut ctx.accounts.identity;

        // Validate expiry is in the future
        let now = Clock::get()?.unix_timestamp;
        require!(expires_at > now, ErrorCode::DelegationExpired);

        identity.delegate = Some(delegate);
        identity.delegation_scope = Some(scope as u8);
        identity.delegation_expires = Some(expires_at);

        emit!(DelegationCreated {
            owner: identity.owner,
            delegate,
            scope: scope as u8,
            expires_at,
        });

        Ok(())
    }

    /// Revoke an existing delegation
    pub fn revoke_delegation(
        ctx: Context<RevokeDelegation>,
    ) -> Result<()> {
        let identity = &mut ctx.accounts.identity;

        let old_delegate = identity.delegate;

        identity.delegate = None;
        identity.delegation_scope = None;
        identity.delegation_expires = None;

        emit!(DelegationRevoked {
            owner: identity.owner,
            delegate: old_delegate.unwrap_or_default(),
        });

        Ok(())
    }
}

// ============ Accounts ============

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Launchpad::SIZE,
        seeds = [b"launchpad"],
        bump
    )]
    pub launchpad: Account<'info, Launchpad>,
    
    /// CHECK: Treasury account
    pub treasury: UncheckedAccount<'info>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(name: String)]
pub struct RegisterAgent<'info> {
    #[account(
        init,
        payer = owner,
        space = 8 + Agent::SIZE,
        seeds = [b"agent", owner.key().as_ref()],
        bump
    )]
    pub agent: Account<'info, Agent>,
    
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct VerifyAgent<'info> {
    #[account(mut)]
    pub agent: Account<'info, Agent>,
    
    #[account(
        seeds = [b"launchpad"],
        bump = launchpad.bump,
        has_one = authority
    )]
    pub launchpad: Account<'info, Launchpad>,
    
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct CreateLaunch<'info> {
    #[account(
        init,
        payer = owner,
        space = 8 + Launch::SIZE,
        seeds = [b"launch", agent.key().as_ref()],
        bump
    )]
    pub launch: Account<'info, Launch>,
    
    #[account(
        seeds = [b"agent", owner.key().as_ref()],
        bump = agent.bump,
        has_one = owner
    )]
    pub agent: Account<'info, Agent>,
    
    #[account(
        init,
        payer = owner,
        mint::decimals = 9,
        mint::authority = launch,
    )]
    pub mint: Account<'info, Mint>,
    
    #[account(mut)]
    pub owner: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct BuyTokens<'info> {
    #[account(
        mut,
        seeds = [b"launch", launch.agent.as_ref()],
        bump = launch.bump
    )]
    pub launch: Account<'info, Launch>,
    
    #[account(mut)]
    pub mint: Account<'info, Mint>,
    
    /// CHECK: Vault to hold SOL
    #[account(mut)]
    pub vault: UncheckedAccount<'info>,
    
    #[account(mut)]
    pub buyer: Signer<'info>,
    
    #[account(mut)]
    pub buyer_token_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct FinalizeLaunch<'info> {
    #[account(mut)]
    pub launch: Account<'info, Launch>,
    
    pub authority: Signer<'info>,
}

// ============ SAP Identity Accounts ============

#[derive(Accounts)]
pub struct RegisterIdentity<'info> {
    #[account(
        init,
        payer = owner,
        space = 8 + AgentIdentity::SIZE,
        seeds = [b"sap-identity", owner.key().as_ref()],
        bump
    )]
    pub identity: Account<'info, AgentIdentity>,

    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AttestVerification<'info> {
    #[account(
        mut,
        seeds = [b"sap-identity", identity.owner.as_ref()],
        bump = identity.bump
    )]
    pub identity: Account<'info, AgentIdentity>,

    #[account(
        seeds = [b"launchpad"],
        bump = launchpad.bump,
        has_one = authority
    )]
    pub launchpad: Account<'info, Launchpad>,

    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct BindDePINDevice<'info> {
    #[account(
        mut,
        seeds = [b"sap-identity", owner.key().as_ref()],
        bump = identity.bump,
        has_one = owner
    )]
    pub identity: Account<'info, AgentIdentity>,

    /// CHECK: DePIN device PDA - we verify it exists on-chain
    pub device_pda: UncheckedAccount<'info>,

    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct FlagSybil<'info> {
    #[account(
        mut,
        seeds = [b"sap-identity", identity.owner.as_ref()],
        bump = identity.bump
    )]
    pub identity: Account<'info, AgentIdentity>,

    #[account(
        seeds = [b"launchpad"],
        bump = launchpad.bump,
        has_one = authority
    )]
    pub launchpad: Account<'info, Launchpad>,

    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct UpdateTrustLevel<'info> {
    #[account(
        mut,
        seeds = [b"sap-identity", owner.key().as_ref()],
        bump = identity.bump,
        has_one = owner
    )]
    pub identity: Account<'info, AgentIdentity>,

    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct RotateIdentity<'info> {
    #[account(
        mut,
        seeds = [b"sap-identity", owner.key().as_ref()],
        bump = identity.bump,
        has_one = owner
    )]
    pub identity: Account<'info, AgentIdentity>,

    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct DelegateAuthority<'info> {
    #[account(
        mut,
        seeds = [b"sap-identity", owner.key().as_ref()],
        bump = identity.bump,
        has_one = owner
    )]
    pub identity: Account<'info, AgentIdentity>,

    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct RevokeDelegation<'info> {
    #[account(
        mut,
        seeds = [b"sap-identity", owner.key().as_ref()],
        bump = identity.bump,
        has_one = owner
    )]
    pub identity: Account<'info, AgentIdentity>,

    pub owner: Signer<'info>,
}

// ============ State ============

#[account]
pub struct Launchpad {
    pub authority: Pubkey,
    pub treasury: Pubkey,
    pub platform_fee_bps: u16,
    pub min_raise: u64,
    pub max_raise: u64,
    pub bump: u8,
}

impl Launchpad {
    pub const SIZE: usize = 32 + 32 + 2 + 8 + 8 + 1;
}

#[account]
pub struct Agent {
    pub owner: Pubkey,
    pub name: String,
    pub capabilities: Vec<String>,
    pub proof_url: String,
    pub verified: bool,
    pub verified_at: Option<i64>,
    pub created_at: i64,
    pub bump: u8,
}

impl Agent {
    pub const SIZE: usize = 32 + 64 + 256 + 128 + 1 + 9 + 8 + 1;
}

#[account]
pub struct Launch {
    pub agent: Pubkey,
    pub mint: Pubkey,
    pub name: String,
    pub symbol: String,
    pub target_raise: u64,
    pub current_raise: u64,
    pub token_supply: u64,
    pub tokens_sold: u64,
    pub bonding_curve_type: BondingCurveType,
    pub start_time: i64,
    pub end_time: i64,
    pub status: LaunchStatus,
    pub bump: u8,
}

impl Launch {
    pub const SIZE: usize = 32 + 32 + 64 + 16 + 8 + 8 + 8 + 8 + 1 + 8 + 8 + 1 + 1;
}

#[account]
pub struct AgentIdentity {
    pub owner: Pubkey,                    // 32
    pub identity_hash: [u8; 32],          // 32 - hardware fingerprint hash
    pub trust_level: u8,                  // 1  - 0-5
    pub score: u8,                        // 1  - PoA score 0-100
    pub attestation_method: String,       // 4 + 32 max
    pub depin_device: Option<Pubkey>,     // 1 + 32
    pub depin_provider: Option<String>,   // 1 + 4 + 16 max
    pub sybil_flagged: bool,              // 1
    pub sybil_match: Option<Pubkey>,      // 1 + 32
    pub last_attestation: [u8; 32],       // 32
    pub last_evidence: [u8; 32],          // 32
    pub registered_at: i64,               // 8
    pub expires_at: i64,                  // 8
    pub attested_at: Option<i64>,         // 1 + 8
    pub bump: u8,                         // 1
    // ---- Identity rotation & delegation fields ----
    pub previous_identity_hash: Option<[u8; 32]>,  // 1 + 32 = 33
    pub rotated_at: Option<i64>,                    // 1 + 8 = 9
    pub delegate: Option<Pubkey>,                   // 1 + 32 = 33
    pub delegation_scope: Option<u8>,               // 1 + 1 = 2  (0=Full, 1=AttestOnly, 2=ReadOnly, 3=SignTransactions)
    pub delegation_expires: Option<i64>,            // 1 + 8 = 9
}

impl AgentIdentity {
    pub const SIZE: usize = 32 + 32 + 1 + 1 + 36 + 33 + 21 + 1 + 33 + 32 + 32 + 8 + 8 + 9 + 1
        + 33 + 9 + 33 + 2 + 9;
    // = 280 + 86 = 366 bytes
}

// ============ Types ============

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct LaunchpadConfig {
    pub platform_fee_bps: u16,
    pub min_raise: u64,
    pub max_raise: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct LaunchParams {
    pub name: String,
    pub symbol: String,
    pub target_raise: u64,
    pub token_supply: u64,
    pub bonding_curve_type: BondingCurveType,
    pub start_time: i64,
    pub end_time: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq)]
pub enum BondingCurveType {
    Linear,
    Exponential,
    Sigmoid,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq)]
pub enum DelegationScope {
    Full,              // 0 - Can do everything owner can
    AttestOnly,        // 1 - Can only submit traces and update trust
    ReadOnly,          // 2 - Can prove identity but not modify
    SignTransactions,  // 3 - Can sign on behalf (hot wallet)
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq)]
pub enum LaunchStatus {
    Pending,
    Active,
    Graduated,
    Finalized,
    Failed,
}

// ============ Errors ============

#[error_code]
pub enum ErrorCode {
    #[msg("Agent is not verified")]
    AgentNotVerified,
    #[msg("Launch is not active")]
    LaunchNotActive,
    #[msg("Launch has not started")]
    LaunchNotStarted,
    #[msg("Launch has ended")]
    LaunchEnded,
    #[msg("Launch has not graduated")]
    NotGraduated,
    #[msg("Invalid trust level (must be 0-5)")]
    InvalidTrustLevel,
    #[msg("Identity has expired")]
    IdentityExpired,
    #[msg("Identity is flagged as Sybil")]
    SybilFlagged,
    #[msg("DePIN device PDA does not exist on-chain")]
    DePINDeviceNotFound,
    #[msg("Delegation has expired")]
    DelegationExpired,
    #[msg("Unauthorized delegate")]
    UnauthorizedDelegate,
    #[msg("Insufficient delegation scope")]
    InsufficientScope,
}

// ============ SAP Events ============

#[event]
pub struct IdentityRegistered {
    pub owner: Pubkey,
    pub identity_hash: [u8; 32],
    pub trust_level: u8,
}

#[event]
pub struct VerificationAttested {
    pub owner: Pubkey,
    pub score: u8,
    pub attestation_hash: [u8; 32],
}

#[event]
pub struct DePINBound {
    pub owner: Pubkey,
    pub device_pda: Pubkey,
}

#[event]
pub struct SybilFlagged {
    pub owner: Pubkey,
    pub matching_identity: Pubkey,
    pub reason: String,
}

#[event]
pub struct TrustLevelUpdated {
    pub owner: Pubkey,
    pub old_level: u8,
    pub new_level: u8,
}

#[event]
pub struct IdentityRotated {
    pub owner: Pubkey,
    pub old_hash: [u8; 32],
    pub new_hash: [u8; 32],
    pub migration_proof: [u8; 32],
}

#[event]
pub struct DelegationCreated {
    pub owner: Pubkey,
    pub delegate: Pubkey,
    pub scope: u8,
    pub expires_at: i64,
}

#[event]
pub struct DelegationRevoked {
    pub owner: Pubkey,
    pub delegate: Pubkey,
}

// ============ Helpers ============

fn calculate_tokens_out(
    curve_type: BondingCurveType,
    current_raise: u64,
    sol_in: u64,
    target_raise: u64,
    token_supply: u64,
) -> Result<u64> {
    match curve_type {
        BondingCurveType::Linear => {
            // Simple linear: price increases linearly with supply sold
            // tokens_out = sol_in * (remaining_tokens / remaining_target)
            let remaining_target = target_raise.saturating_sub(current_raise);
            let remaining_tokens = token_supply.saturating_sub(
                (current_raise as u128 * token_supply as u128 / target_raise as u128) as u64
            );
            
            if remaining_target == 0 {
                return Ok(0);
            }
            
            Ok((sol_in as u128 * remaining_tokens as u128 / remaining_target as u128) as u64)
        }
        BondingCurveType::Exponential => {
            // Exponential curve: early buyers get more tokens
            // Simplified: uses square root price curve
            let progress = current_raise as f64 / target_raise as f64;
            let price_multiplier = 1.0 + progress * 2.0; // Price doubles over the raise
            let base_rate = token_supply as f64 / target_raise as f64;
            Ok((sol_in as f64 * base_rate / price_multiplier) as u64)
        }
        BondingCurveType::Sigmoid => {
            // Sigmoid: slow start, fast middle, slow end
            // For MVP, treat as linear
            let base_rate = token_supply / target_raise;
            Ok(sol_in * base_rate)
        }
    }
}
