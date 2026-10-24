import { createPublicClient, http, type Address } from 'viem';
import { chainForChainId, type SdkChain } from '../chains';
import type { Wallet } from './Wallet';
import {
  DEFAULT_STREAMING_ALLOWANCE_USD,
  MAX_STREAMING_ALLOWANCE_MICRO,
  MAX_STREAMING_ALLOWANCE_USD,
  PREFLIGHT_FLOOR_MICRO,
  USDC_DECIMALS,
  needsPreflightApproval,
  standingAllowanceMicro,
} from '../allowancePolicy';

export {
  DEFAULT_STREAMING_ALLOWANCE_USD,
  MAX_STREAMING_ALLOWANCE_USD,
  PREFLIGHT_FLOOR_MICRO,
} from '../allowancePolicy';

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

// --- The pot model (Tom, 2026-10-24) ----------------------------------------
// A viewer approves a standing USDC allowance ONCE (their pot) and then
// streams many sessions and videos signature-free: the operator draws the pot
// down with transferFrom against the standing ERC-20 allowance. The viewer is
// asked again only when the pot runs below the backend's floor.
//
// THREE NUMBERS, ONE FLOOR (src/allowancePolicy.ts):
//   - PREFLIGHT_FLOOR_MICRO ($0.50) is the pre-flight threshold. It mirrors
//     the backend's FUNDING_FLOOR_MICRO (session_funding.py): the backend
//     opens a session only when allowance AND balance cover $0.50 plus any
//     unpaid tab, and answers 402 otherwise. isApproved() re-approves ONLY
//     when allowance(viewer, spender) is below this figure; above it the
//     backend is the authority, and its 402 drives an exact approval through
//     ensureSpenderApproved(required_micro, spender). Before 2.2.0 the
//     threshold was max($2, price x 120 min), so a viewer who had approved $1
//     on the studio (where the backend would open) was asked here again.
//   - DEFAULT_STREAMING_ALLOWANCE_USD ($10) is the amount approved when an
//     approval is needed; init({ streamingAllowanceUsd }) changes it. It is
//     never below the floor and never above MAX_STREAMING_ALLOWANCE_USD.
//   - MAX_STREAMING_ALLOWANCE_USD ($500) is the ceiling: finite by design,
//     never MAX_UINT256, so no wallet shows the "unlimited approval" warning.
// The dashboard's /watch and /embed approve a standing $1 against the same
// floor, so the surfaces agree on when a viewer is asked.

export class Approval {
  private wallet: Wallet;
  private usdc: Address;
  // The streaming spender: the address the viewer's USDC allowance is
  // granted to and read against. It is playback-info's `payment_router`
  // field, which the backend fills from sdk_routes._streaming_spender(): the
  // creator pool on the hub rail (POOL_STREAMING_SOURCE on, production), the
  // payment router on the router rail. The same helper feeds the backend's
  // 402 `spender`, so Step 4 and a 402 always name one contract.
  private spender: Address;
  private chain: SdkChain;
  // The amount approved when an approve is needed (the standing allowance).
  private standingAllowance: bigint;
  private publicClient;

  constructor(
    wallet: Wallet,
    chainConfig: {
      usdc_address: string;
      payment_router: string;
      chain_id: number;
      /**
       * Accepted for compatibility with callers that pass playback-info
       * through. Since 2.2.0 the price plays no part in the approval
       * decision: the threshold is the backend's floor, whatever the price.
       */
      price_per_minute_usdc?: number;
      // Optional standing allowance in whole USD. Defaulted and clamped to a
      // finite ceiling by standingAllowanceMicro(); never MAX_UINT.
      standing_allowance_usd?: number;
    },
  ) {
    this.wallet = wallet;
    this.usdc = chainConfig.usdc_address as Address;
    this.spender = chainConfig.payment_router as Address;
    this.standingAllowance = standingAllowanceMicro(chainConfig.standing_allowance_usd);

    // Single source of truth: the backend playback-info chain_id drives
    // the viem chain AND the RPC URL, the same response that carries the
    // USDC and spender addresses. They can therefore never diverge.
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

  /** The current allowance(viewer, spender) in micro-USDC. */
  async currentAllowance(): Promise<bigint> {
    const owner = this.wallet.getAddress();
    if (!owner) throw new Error('No wallet client');

    // Defensive: confirm the USDC address actually has contract code on
    // the resolved chain before reading. Converts a silent 0x/zero-data
    // result (a confusing decode error that degrades to free playback)
    // into a loud, diagnosable chain/RPC mismatch error.
    const code = await this.publicClient.getBytecode({ address: this.usdc });
    if (!code) {
      throw new Error(
        `USDC ${this.usdc} has no contract code on chain ${this.chain.chainId} ` +
          `(RPC ${this.chain.rpcUrl}): chain/RPC mismatch`,
      );
    }

    return this.publicClient.readContract({
      address: this.usdc,
      abi: ERC20_ABI,
      functionName: 'allowance',
      args: [owner as Address, this.spender],
    });
  }

  /**
   * Pre-flight: does the pot cover the backend's floor? True when
   * allowance(viewer, spender) >= PREFLIGHT_FLOOR_MICRO, whatever the price
   * and however much of the standing amount has been drawn. Only below the
   * floor does ensureApproved() top the pot back up to the standing amount.
   */
  async isApproved(): Promise<boolean> {
    const owner = this.wallet.getAddress();
    if (!owner) return false;
    return !needsPreflightApproval(await this.currentAllowance());
  }

  async approve(): Promise<void> {
    const client = this.wallet.getClient();
    if (!client) throw new Error('No wallet client');

    // Approve the STANDING allowance (one signature, finite and bounded). The
    // wallet client was built from the injected or passed-in provider
    // (init({ provider })), so this signs through the host wallet and works
    // on mobile and in Farcaster Mini Apps with no browser extension.
    const hash = await client.writeContract({
      address: this.usdc,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [this.spender, this.standingAllowance],
    });

    await this.publicClient.waitForTransactionReceipt({ hash });
  }

  /**
   * Make sure `spender` may pull at least `requiredMicro` USDC from the viewer.
   * Used when the backend answers a session create or URL refresh with 402
   * insufficient_allowance: the spender comes from THAT response (the
   * streaming spender the backend actually draws against, the same address
   * playback-info serves as `payment_router`), never a hard-coded address.
   * This is the authority for exact figures; the pre-flight only mirrors the
   * floor.
   *
   * Same bounded standing amount as approve(): the larger of the standing
   * allowance and `requiredMicro`, and never above the ceiling. Returns true
   * when an approve transaction was sent, false when the allowance already
   * covered it.
   *
   * `exact`: approve `requiredMicro` itself, not the standing amount. Used
   * for an unpaid tab (402 tab_unpaid), where the viewer is shown one figure
   * (the tab plus the floor) and the wallet must ask for that figure.
   */
  async ensureSpenderApproved(
    spender: string,
    requiredMicro: number,
    exact = false,
  ): Promise<boolean> {
    if (!/^0x[0-9a-fA-F]{40}$/.test(spender)) {
      throw new Error(`Invalid spender address from the backend: ${spender}`);
    }
    const owner = this.wallet.getAddress();
    if (!owner) throw new Error('No wallet client');
    const required = BigInt(Math.ceil(Math.max(0, Number(requiredMicro) || 0)));
    if (required > MAX_STREAMING_ALLOWANCE_MICRO) {
      throw new Error(
        `Refusing to approve ${Number(required) / 10 ** USDC_DECIMALS} USDC: ` +
          `above the $${MAX_STREAMING_ALLOWANCE_USD} ceiling.`,
      );
    }
    const current = await this.publicClient.readContract({
      address: this.usdc,
      abi: ERC20_ABI,
      functionName: 'allowance',
      args: [owner as Address, spender as Address],
    });
    if (current >= required && required > 0n) return false;

    const client = this.wallet.getClient();
    if (!client) throw new Error('No wallet client');
    const amount =
      exact || this.standingAllowance <= required ? required : this.standingAllowance;
    const hash = await client.writeContract({
      address: this.usdc,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [spender as Address, amount],
    });
    await this.publicClient.waitForTransactionReceipt({ hash });
    return true;
  }

  async ensureApproved(): Promise<boolean> {
    if (await this.isApproved()) return false;
    await this.approve();
    return true;
  }
}
