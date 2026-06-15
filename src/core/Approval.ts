import { createPublicClient, http, type Address } from 'viem';
import { chainForNetwork, type NetworkFlag } from '../chains';
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
  private publicClient;

  constructor(
    wallet: Wallet,
    chainConfig: { usdc_address: string; payment_router: string; chain_id: number },
    network: NetworkFlag,
  ) {
    this.wallet = wallet;
    this.usdc = chainConfig.usdc_address as Address;
    this.router = chainConfig.payment_router as Address;

    const chain = chainForNetwork(network);

    // Safety check: the chain the SDK is configured for MUST match the
    // chain the content actually lives on (as reported by the backend).
    // A mismatch means we'd read allowances / submit approvals against
    // the wrong network — fail loud instead of silently misbehaving.
    if (chainConfig.chain_id !== chain.chainId) {
      const otherNetwork: NetworkFlag = network === 'mainnet' ? 'testnet' : 'mainnet';
      throw new Error(
        `SDK network '${network}' (chainId ${chain.chainId}) does not match ` +
          `content chain_id ${chainConfig.chain_id} — the content lives on a ` +
          `different chain than the SDK is configured for. Initialise JubJub ` +
          `with the matching network (e.g. JubJub.init({ network: '${otherNetwork}' })).`,
      );
    }

    this.publicClient = createPublicClient({
      chain: chain.viemChain,
      transport: http(chain.rpcUrl),
    });
  }

  async isApproved(): Promise<boolean> {
    const owner = this.wallet.getAddress();
    if (!owner) return false;

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
