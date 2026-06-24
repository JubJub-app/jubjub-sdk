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

const MAX_UINT256 = BigInt(
  '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
);

export class Approval {
  private wallet: Wallet;
  private usdc: Address;
  private router: Address;
  private chain: SdkChain;
  private publicClient;

  constructor(
    wallet: Wallet,
    chainConfig: { usdc_address: string; payment_router: string; chain_id: number },
  ) {
    this.wallet = wallet;
    this.usdc = chainConfig.usdc_address as Address;
    this.router = chainConfig.payment_router as Address;

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
    return allowance > 0n;
  }

  async approve(): Promise<void> {
    const client = this.wallet.getClient();
    if (!client) throw new Error('No wallet client');

    const hash = await client.writeContract({
      address: this.usdc,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [this.router, MAX_UINT256],
    });

    await this.publicClient.waitForTransactionReceipt({ hash });
  }

  async ensureApproved(): Promise<boolean> {
    if (await this.isApproved()) return false;
    await this.approve();
    return true;
  }
}
