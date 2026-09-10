/**
 * Pure helpers for the browser-wallet connect path. No DOM, no viem, no
 * module state, so they can be unit-tested with node:test (see test/).
 */
/** Error code the SDK attaches to a wrong-network failure it raised itself. */
export declare const CHAIN_MISMATCH_CODE = "JUBJUB_CHAIN_MISMATCH";
/**
 * True when a wallet's eth_chainId reply names `expected`. Wallets return a
 * hex string (0x2105, 0x14a34, mixed case) but some providers hand back a
 * number or a decimal string, so all three shapes are accepted.
 */
export declare function chainIdMatches(observed: unknown, expected: number): boolean;
/**
 * True when an error is the viewer declining a wallet prompt, rather than a
 * capability or network failure. EIP-1193 uses code 4001; wallets vary in
 * message wording, so match both.
 */
export declare function isUserRejection(err: unknown): boolean;
/**
 * True when an error means the wallet is on a different network than the
 * one the SDK needs and the viewer has to switch it themselves. Covers the
 * SDK's own post-switch verification (CHAIN_MISMATCH_CODE) and Phantom, which
 * refuses wallet_switchEthereumChain with text like "The requested chain ID
 * does not match the currently active chain" or "... cannot be shown ..."
 * instead of a 4001/4902 code.
 */
export declare function isChainMismatchError(err: unknown): boolean;
/**
 * The error the connect path throws when the wallet is verifiably on another
 * network after the switch attempt. `label` is the chain registry label of
 * the network the SDK was configured for (Base or Base Sepolia).
 */
export declare function chainMismatchError(label: string, cause?: unknown): Error & {
    code: string;
    cause?: unknown;
};
