import { createPublicClient, http, type Address } from 'viem';
import { chainForChainId, type SdkChain } from '../chains';
import type { Wallet } from './Wallet';

const ERC20_ABI = [
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;

// USDC is 6 decimals on every supported chain (Base mainnet + Sepolia).
const USDC_DECIMALS = 6;
// The MOST a single streaming session can draw: price-per-minute × this many
// minutes. Used to size the per-SESSION bound (the reuse threshold), never as
// the approve amount itself.
const MAX_SESSION_MINUTES = 120;
// Floor so cheap content still bounds to enough for a complete session. The
// backend caps a single session at $2 (MAX_SESSION_AMOUNT), so $2 is always
// sufficient for one session regardless of price-per-minute.
const MIN_APPROVAL_USDC = 2;
const APPROVAL_FLOOR = BigInt(MIN_APPROVAL_USDC) * 10n ** BigInt(USDC_DECIMALS);

// --- Standing allowance ----------------------------------------------------
// A viewer approves THIS amount ONCE and then streams many sessions/videos
// signature-free — the operator draws it down via transferFrom against the
// standing ERC-20 allowance (router already supports this on-chain). When a
// (re-)approve is needed we approve the standing amount, not one session's
// worth.
//
// BOUNDED + FINITE BY DESIGN — never MAX_UINT256. An unlimited approval trips
// the MetaMask/Blockaid "unlimited approval" scam warning and kills
// conversion; a sane finite amount does not. Configurable via
// init({ streamingAllowanceUsd }).
const DEFAULT_STREAMING_ALLOWANCE_USD = 10;
// Hard ceiling so a mis-set config can never request an absurd (or effectively
// unbounded) allowance — the approved amount always stays a sane, finite USDC
// value.
const MAX_STREAMING_ALLOWANCE_USD = 500;

export class Approval {
  private wallet: Wallet;
  private usdc: Address;
  private router: Address;
  private chain: SdkChain;
  // The amount approved when an approve is needed (standing allowance).
  private standingAllowance: bigint;
  // The reuse THRESHOLD: the most one session can draw. isApproved() gates on
  // this, NOT on standingAllowance — so partial drawdown does not re-approve.
  private sessionBound: bigint;
  private publicClient;

  constructor(
    wallet: Wallet,
    chainConfig: {
      usdc_address: string;
      payment_router: string;
      chain_id: number;
      price_per_minute_usdc: number;
      // Optional standing allowance in whole USD. Defaulted + clamped to a
      // finite ceiling inside _boundedStandingAllowance(); never MAX_UINT.
      standing_allowance_usd?: number;
    },
  ) {
    this.wallet = wallet;
    this.usdc = chainConfig.usdc_address as Address;
    this.router = chainConfig.payment_router as Address;
    this.sessionBound = Approval._boundedSessionAmount(
      chainConfig.price_per_minute_usdc,
    );
    this.standingAllowance = Approval._boundedStandingAllowance(
      chainConfig.standing_allowance_usd,
      this.sessionBound,
    );

    // Single source of truth: the backend playback-info chain_id drives
    // the viem chain AND the RPC URL — the same response that carries the
    // USDC/router addresses. They can therefore never diverge. Previously
    // the chain was resolved from the SDK network flag, which defaulted to
    // 'testnet' and read mainnet addresses over the Sepolia RPC, yielding
    // 0x zero-data (ContractFunctionZeroDataError → error → free play).
    const chain = chainForChainId(chainConfig.chain_id);
    if (!chain) {
      throw new Error(
        `Unsupported chain_id ${chainConfig.chain_id} from playback-info`,
      );
    }
    this.chain = chain;

    this.publicClient = createPublicClient({
      chain: chain.viemChain,
      transport: http(chain.rpcUrl),
    });
  }

  /**
   * Per-SESSION bound: the most a single session can draw (price-per-minute ×
   * max minutes), floored at $2 to cover the backend's per-session cap. This
   * is the reuse THRESHOLD used by isApproved() — not the approve amount.
   *
   * NaN-guarded so BigInt() only ever receives a finite integer — a missing /
   * non-numeric / zero price returns the floor BEFORE any BigInt() or exponent
   * math runs, and Math.ceil guarantees an integer. (Unchanged from the prior
   * per-session calculation; only its ROLE changed — threshold, not amount.)
   */
  private static _boundedSessionAmount(pricePerMinuteUsdc: number): bigint {
    const price = Number(pricePerMinuteUsdc);
    if (!Number.isFinite(price) || price <= 0) {
      return APPROVAL_FLOOR;
    }
    // Dollars → base units, ceil to a finite integer before BigInt().
    const baseUnits = Math.ceil(
      price * MAX_SESSION_MINUTES * 10 ** USDC_DECIMALS,
    );
    const bounded = BigInt(baseUnits);
    return bounded > APPROVAL_FLOOR ? bounded : APPROVAL_FLOOR;
  }

  /**
   * Standing allowance to APPROVE when an approve is needed. Bounded + finite:
   * defaulted ($10), NaN-guarded, and clamped to [sessionBound, ceiling]. It
   * is NEVER MAX_UINT256 — that would trip the unlimited-approval scam warning.
   *
   * Floored at sessionBound because a standing allowance below one session's
   * bound would re-approve forever (isApproved() gates on sessionBound).
   */
  private static _boundedStandingAllowance(
    standingAllowanceUsd: number | undefined,
    sessionBound: bigint,
  ): bigint {
    let usd = Number(standingAllowanceUsd);
    if (!Number.isFinite(usd) || usd <= 0) {
      usd = DEFAULT_STREAMING_ALLOWANCE_USD;
    }
    // Clamp to a sane finite ceiling — never unbounded.
    if (usd > MAX_STREAMING_ALLOWANCE_USD) usd = MAX_STREAMING_ALLOWANCE_USD;
    // Dollars → base units, ceil to a finite integer before BigInt().
    const baseUnits = Math.ceil(usd * 10 ** USDC_DECIMALS);
    const standing = BigInt(baseUnits);
    return standing > sessionBound ? standing : sessionBound;
  }

  async isApproved(): Promise<boolean> {
    const owner = this.wallet.getAddress();
    if (!owner) return false;

    // Defensive: confirm the USDC address actually has contract code on
    // the resolved chain before reading. Converts a silent 0x/zero-data
    // result (a confusing decode error that degrades to free playback)
    // into a loud, diagnosable chain/RPC mismatch error.
    const code = await this.publicClient.getBytecode({ address: this.usdc });
    if (!code) {
      throw new Error(
        `USDC ${this.usdc} has no contract code on chain ${this.chain.chainId} ` +
          `(RPC ${this.chain.rpcUrl}) — chain/RPC mismatch`,
      );
    }

    const allowance = await this.publicClient.readContract({
      address: this.usdc,
      abi: ERC20_ABI,
      functionName: 'allowance',
      args: [owner as Address, this.router],
    });
    // DECOUPLED THRESHOLD — the heart of the standing-allowance model.
    // Gate on whether the CURRENT allowance can cover the NEXT session's bound,
    // NOT on the full standing allowance. So a viewer who approved the standing
    // amount ($10) and has since spent part of it ($3 → $7 left) keeps
    // streaming signature-free as long as the remainder covers one session's
    // bound; only when it drops below sessionBound does ensureApproved() top
    // back up to the standing amount. (Previously this compared against the
    // approve amount itself, which re-approved after ANY drawdown — the
    // coupling that made it feel per-session.)
    return allowance >= this.sessionBound;
  }

  async approve(): Promise<void> {
    const client = this.wallet.getClient();
    if (!client) throw new Error('No wallet client');

    // Approve the STANDING allowance (one signature, finite/bounded). The
    // wallet client was built from the injected/passed-in provider
    // (init({ provider })), so this signs through the host wallet — works on
    // mobile / Farcaster Mini Apps with no browser extension.
    const hash = await client.writeContract({
      address: this.usdc,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [this.router, this.standingAllowance],
    });

    await this.publicClient.waitForTransactionReceipt({ hash });
  }

  async ensureApproved(): Promise<boolean> {
    if (await this.isApproved()) return false;
    await this.approve();
    return true;
  }
}
