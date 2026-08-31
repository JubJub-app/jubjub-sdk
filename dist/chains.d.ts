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
    chainId: number;
    chainIdHex: string;
    rpcUrl: string;
    explorer: string;
    label: string;
}
/** Resolve the active chain config from the public network flag. */
export declare function chainForNetwork(network: NetworkFlag): SdkChain;
export declare function chainForChainId(id: number): SdkChain | undefined;
