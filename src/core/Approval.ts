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
// Approve enough USDC for one full-length streaming session rather than an
// unlimited (MAX_UINT256) allowance — unlimited approvals trip the
// MetaMask/Blockaid scam warning on mainnet and kill conversion.
const MAX_SESSION_MINUTES = 120;
// Floor so cheap content still approves enough for a complete session. The
// backend caps a single session at $2 (MAX_SESSION_AMOUNT), so $2 is always
// sufficient for one session regardless of price-per-minute.
const MIN_APPROVAL_USDC = 2;
const APPROVAL_FLOOR = BigInt(MIN_APPROVAL_USDC) * 10n ** BigInt(USDC_DECIMALS);

export class Approval {
  private wallet: Wallet;
  private usdc: Address;
  private router: Address;
  private chain: SdkChain;
  private approvalAmount: bigint;
  private publicClient;

  constructor(
    wallet: Wallet,
    chainConfig: {
      usdc_address: string;
      payment_router: string;
      chain_id: number;
      price_per_minute_usdc: number;
    },
  ) {
    this.wallet = wallet;
    this.usdc = chainConfig.usdc_address as Address;
    this.router = chainConfig.payment_router as Address;
    this.approvalAmount = Approval._boundedApprovalAmount(
      chainConfig.price_per_minute_usdc,
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
   * Bounded USDC approval amount: enough for one full-length session, never
   * unlimited. The calculation is TOTAL (price-per-minute × max minutes).
   * It is NaN-guarded so BigInt() only ever receives a finite integer — a
   * missing / non-numeric / zero price returns the floor BEFORE any
   * BigInt() or exponent math runs, and Math.ceil guarantees an integer.
   */
  private static _boundedApprovalAmount(pricePerMinuteUsdc: number): bigint {
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
    // Require at least the bounded amount so a wallet with a stale / too-small
    // allowance — or a previously unlimited approval — re-approves to the
    // correct bound rather than being treated as already-approved.
    return allowance >= this.approvalAmount;
  }

  async approve(): Promise<void> {
    const client = this.wallet.getClient();
    if (!client) throw new Error('No wallet client');

    const hash = await client.writeContract({
      address: this.usdc,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [this.router, this.approvalAmount],
    });

    await this.publicClient.waitForTransactionReceipt({ hash });
  }

  async ensureApproved(): Promise<boolean> {
    if (await this.isApproved()) return false;
    await this.approve();
    return true;
  }
}
