use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer, MintTo};

declare_id!("Mo1tLnchXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX");

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
        let launch = &mut ctx.accounts.launch;
        require!(launch.status == LaunchStatus::Active, ErrorCode::LaunchNotActive);
        
        let clock = Clock::get()?;
        require!(clock.unix_timestamp >= launch.start_time, ErrorCode::LaunchNotStarted);
        require!(clock.unix_timestamp <= launch.end_time, ErrorCode::LaunchEnded);

        // Calculate tokens based on bonding curve
        let token_amount = calculate_tokens_out(
            launch.bonding_curve_type,
            launch.current_raise,
            sol_amount,
            launch.target_raise,
            launch.token_supply,
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
            launch.agent.as_ref(),
            &[launch.bump],
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
        launch.current_raise += sol_amount;
        launch.tokens_sold += token_amount;

        // Check if graduated
        if launch.current_raise >= launch.target_raise {
            launch.status = LaunchStatus::Graduated;
            // TODO: Create Raydium pool
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
