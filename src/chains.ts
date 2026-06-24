import { base, baseSepolia } from 'viem/chains';

/**
 * Embedded chain registry.
 *
 * This ships inside the bundle on purpose — third-party consumers load
 * the UMD bundle in their own browsers and cannot read our env vars, so
 * the chain config has to travel with the code.
 *
 * The public surface keeps the `network: 'testnet' | 'mainnet'` flag
 * (see types.ts). Internally we map that flag to a chain key and resolve
 * the concrete config below. Contract addresses (USDC, payment router)
 * are deliberately NOT here — they come from the backend playback-info
 * response per content, which is the authoritative source.
 */

export type NetworkFlag = 'testnet' | 'mainnet';
export type ChainKey = 'base' | 'base-sepolia';

export interface SdkChain {
  key: ChainKey;
  viemChain: typeof base | typeof baseSepolia;
  chainId: number; // 8453 | 84532
  chainIdHex: string; // '0x2105' | '0x14A34'
  rpcUrl: string;
  explorer: string;
  label: string; // 'Base' | 'Base Sepolia'
}

const NETWORK_TO_KEY: Record<NetworkFlag, ChainKey> = {
  mainnet: 'base',
  testnet: 'base-sepolia',
};

/**
 * Public RPCs are intentional. The SDK runs in third-party browsers and
 * we can't ship our Alchemy key in a public bundle. Consumers' wallets
 * use their own RPC for writes (approve/settle); these URLs are only for
 * the SDK's own read/allowance checks. Acceptable.
 */
const CHAINS: Record<ChainKey, SdkChain> = {
  base: {
    key: 'base',
    viemChain: base,
    chainId: 8453,
    chainIdHex: '0x2105',
    rpcUrl: 'https://mainnet.base.org',
    explorer: 'https://basescan.org',
    label: 'Base',
  },
  'base-sepolia': {
    key: 'base-sepolia',
    viemChain: baseSepolia,
    chainId: 84532,
    chainIdHex: '0x14A34',
    rpcUrl: 'https://sepolia.base.org',
    explorer: 'https://sepolia.basescan.org',
    label: 'Base Sepolia',
  },
};

/** Resolve the active chain config from the public network flag. */
export function chainForNetwork(network: NetworkFlag): SdkChain {
  return CHAINS[NETWORK_TO_KEY[network]];
}

/**
 * Reverse lookup: resolve the chain config from a numeric chain_id.
 *
 * The backend playback-info `chain_id` is the single source of truth for
 * which chain a piece of content lives on. Resolving the RPC + viem chain
 * from this same value (rather than from the SDK network flag) guarantees
 * the RPC can never diverge from the USDC/router addresses, which also
 * travel in the playback-info response.
 */
const CHAIN_BY_ID: Record<number, SdkChain> = {
  8453: CHAINS.base,
  84532: CHAINS['base-sepolia'],
};

export function chainForChainId(id: number): SdkChain | undefined {
  return CHAIN_BY_ID[id];
}
